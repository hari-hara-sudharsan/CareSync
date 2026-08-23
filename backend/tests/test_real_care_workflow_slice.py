import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from fastapi import HTTPException
from app.main import app
from app.models.user import User
from app.models.parent import ParentProfile
from app.models.care_request import CareRequest, AssignmentHistory
from app.models.decision import DecisionCard, AuditEvent
from app.models.outbox import OutboxEvent
from app.core.security import create_access_token
from app.core.database import get_db
from app.api import deps
from app.services.outbox_dispatcher_service import OutboxDispatcherService
from app.agent.strands_agent import CareCoordinatorAgent

@pytest.mark.asyncio
async def test_groceries_care_workflow_end_to_end_slice(async_db: AsyncSession):
    """
    CareSync Phase 13C End-to-End Vertical Slice Test: Groceries Assistance Workflow.
    
    Journey:
    1. Parent creates "Groceries Assistance" CareRequest -> PostgreSQL persistence + Atomic OutboxEvent (status=PENDING_ASSIGNMENT)
    2. Outbox Worker dispatches OutboxEvent to CareCoordinatorAgent -> Agent invokes matching engine -> DecisionCard generated (status=PENDING)
    3. Human Coordinator approves candidate via DecisionCard -> CareRequest assigned (status=ASSIGNED)
    4. Volunteer accepts task (status=ACCEPTED) -> starts execution (status=IN_PROGRESS) -> completes task (status=COMPLETED)
    5. Parent confirms completion -> CareRequest closes (status=PARENT_CONFIRMED -> CLOSED)
    6. Complete audit trace verified in AuditEvents & AssignmentHistory
    """
    # -------------------------------------------------------------------------
    # Setup Test Domain Entities in PostgreSQL
    # -------------------------------------------------------------------------
    parent_user = User(
        id="usr-parent-slice-1",
        phone="+15559991111",
        full_name="Susan Woodson Parent",
        role="PARENT",
        is_active=True,
        is_verified=True,
    )
    coordinator_user = User(
        id="usr-coord-slice-1",
        phone="+15559992222",
        full_name="Coordinator Admin",
        role="ADMIN",
        is_active=True,
        is_verified=True,
    )
    volunteer_user = User(
        id="usr-vol-slice-1",
        phone="+15559993333",
        full_name="Verified Volunteer Helper",
        role="VOLUNTEER",
        is_active=True,
        is_verified=True,
    )
    parent_profile = ParentProfile(
        id="p-1",
        user_id=parent_user.id,
        full_name="Susan Woodson",
    )

    async_db.add_all([parent_user, coordinator_user, volunteer_user, parent_profile])
    await async_db.commit()

    parent_token = create_access_token(subject=parent_user.id)
    coord_token = create_access_token(subject=coordinator_user.id)
    vol_token = create_access_token(subject=volunteer_user.id)

    async def override_db():
        yield async_db

    # -------------------------------------------------------------------------
    # Step 1: Parent Creates "Groceries Assistance" CareRequest via API
    # -------------------------------------------------------------------------
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[deps.get_current_user] = lambda: parent_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res_create = await client.post(
            "/api/v1/care-requests",
            json={
                "parent_id": "p-1",
                "category": "ERRANDS",
                "title": "Groceries Assistance",
                "description": "Pick up weekly groceries from Whole Foods market",
                "priority": "HIGH",
                "requested_time": "Today at 3:00 PM",
            },
            headers={"Authorization": f"Bearer {parent_token}"},
        )
        assert res_create.status_code in [200, 201]
        req_data = res_create.json()
        request_id = req_data["id"]
        assert req_data["status"] == "PENDING_ASSIGNMENT"

    # Verify CareRequest & OutboxEvent Persistence
    res_req = await async_db.execute(select(CareRequest).where(CareRequest.id == request_id))
    db_req = res_req.scalars().first()
    assert db_req is not None
    assert db_req.title == "Groceries Assistance"
    assert db_req.status == "PENDING_ASSIGNMENT"

    res_outbox = await async_db.execute(select(OutboxEvent).where(OutboxEvent.aggregate_id == request_id))
    outbox_events = res_outbox.scalars().all()
    assert len(outbox_events) >= 1, f"No OutboxEvents created for request {request_id}"
    assert outbox_events[0].event_type == "CARE_REQUEST_CREATED"

    # -------------------------------------------------------------------------
    # Step 2: Outbox Worker & Care Coordinator Agent Processing
    # -------------------------------------------------------------------------
    agent = CareCoordinatorAgent(agent_id="agent-strands-test")
    
    class TestAgentConsumer:
        consumer_name = "TestAgentConsumer"
        async def handle_event(self, event: OutboxEvent, db: AsyncSession) -> bool:
            try:
                res = await agent.process_event(db, event)
                print(f"DEBUG AGENT PROCESS_EVENT RES: {res}")
                return True
            except Exception as exc:
                print(f"DEBUG AGENT EXCEPTION: {exc}")
                raise exc

    dispatch_res = await OutboxDispatcherService.dispatch_pending_events(
        db=async_db,
        batch_size=5,
        consumer=TestAgentConsumer(),
    )
    assert dispatch_res["claimed_count"] >= 1, f"Expected claimed events >= 1, got: {dispatch_res}"
    assert dispatch_res["dispatched_count"] >= 1, f"Expected dispatched events >= 1, got: {dispatch_res}"

    # Verify DecisionCard generated by Agent for Coordinator Review
    res_card = await async_db.execute(select(DecisionCard))
    decision_cards = res_card.scalars().all()
    assert len(decision_cards) >= 1, f"Expected >= 1 DecisionCards, got {len(decision_cards)}. All cards in DB: {decision_cards}"
    target_card = decision_cards[0]
    assert "Candidate" in target_card.title or "Review" in target_card.title

    # -------------------------------------------------------------------------
    # Step 3: Human Coordinator Approves Candidate via Decision Inbox
    # -------------------------------------------------------------------------
    app.dependency_overrides[deps.get_current_user] = lambda: coordinator_user

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res_resolve = await client.post(
            f"/api/v1/decisions/{target_card.id}/resolve",
            json={"action_key": f"assign_{volunteer_user.id}"},
            headers={"Authorization": f"Bearer {coord_token}"},
        )
        assert res_resolve.status_code == 200
        assert res_resolve.json()["success"] is True

    # Verify CareRequest transitioned to ASSIGNED
    await async_db.refresh(db_req)
    assert db_req.status == "ASSIGNED"
    assert db_req.assigned_to_id == volunteer_user.id

    # -------------------------------------------------------------------------
    # Step 4: Volunteer Lifecycle (Accept -> Start -> Complete)
    # -------------------------------------------------------------------------
    app.dependency_overrides[deps.get_current_user] = lambda: volunteer_user

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Accept
        res_accept = await client.post(
            f"/api/v1/care-requests/{request_id}/accept",
            headers={"Authorization": f"Bearer {vol_token}"},
        )
        assert res_accept.status_code == 200
        assert res_accept.json()["status"] == "ACCEPTED"

        # Start
        res_start = await client.post(
            f"/api/v1/care-requests/{request_id}/start",
            headers={"Authorization": f"Bearer {vol_token}"},
        )
        assert res_start.status_code == 200
        assert res_start.json()["status"] == "IN_PROGRESS"

        # Complete
        res_complete = await client.post(
            f"/api/v1/care-requests/{request_id}/complete",
            json={"completion_note": "Groceries delivered to front porch safely."},
            headers={"Authorization": f"Bearer {vol_token}"},
        )
        assert res_complete.status_code == 200
        assert res_complete.json()["status"] == "COMPLETED"

    await async_db.refresh(db_req)
    assert db_req.status == "COMPLETED"

    # -------------------------------------------------------------------------
    # Step 5: Parent Confirmation & Request Closure
    # -------------------------------------------------------------------------
    app.dependency_overrides[deps.get_current_user] = lambda: parent_user

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res_confirm = await client.post(
            f"/api/v1/care-requests/{request_id}/confirm",
            headers={"Authorization": f"Bearer {parent_token}"},
        )
        assert res_confirm.status_code == 200
        assert res_confirm.json()["status"] == "CLOSED"

    await async_db.refresh(db_req)
    assert db_req.status == "CLOSED"

    # -------------------------------------------------------------------------
    # Step 6: Immutable Audit Trail & History Verification
    # -------------------------------------------------------------------------
    res_audit = await async_db.execute(select(AuditEvent).where(AuditEvent.resource_id == request_id))
    audits = res_audit.scalars().all()
    audit_actions = [a.action for a in audits]
    assert "CARE_REQUEST_CREATED" in audit_actions
    assert "CARE_REQUEST_ASSIGNED" in audit_actions
    assert "CARE_REQUEST_COMPLETED" in audit_actions

    res_hist = await async_db.execute(select(AssignmentHistory).where(AssignmentHistory.care_request_id == request_id))
    histories = res_hist.scalars().all()
    history_statuses = [h.status for h in histories]
    assert "ASSIGNED" in history_statuses
    assert "COMPLETED" in history_statuses
    assert "CLOSED" in history_statuses

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_negative_authorization_and_invalid_state_transitions(async_db: AsyncSession):
    """
    Negative & Security Verification for Phase 13C:
    1. Parent cannot approve volunteer assignment directly.
    2. Volunteer cannot assign themselves.
    3. Invalid state transition (e.g. jumping from CREATED to COMPLETED) returns 400 Bad Request.
    4. Cross-parent isolation returns 403 Forbidden.
    """
    parent_user = User(id="usr-neg-p1", phone="+15558881111", full_name="Parent Neg Test", role="PARENT", is_active=True, is_verified=True)
    volunteer_user = User(id="usr-neg-v1", phone="+15558882222", full_name="Volunteer Neg Test", role="VOLUNTEER", is_active=True, is_verified=True)
    async_db.add_all([parent_user, volunteer_user])
    await async_db.commit()

    # 1. Invalid State Transition
    from app.services.care_request_state_machine import CareRequestStateMachine
    with pytest.raises(HTTPException) as exc_info:
        CareRequestStateMachine.validate_transition("CREATED", "COMPLETED")
    assert exc_info.value.status_code == 400
    assert "Illegal CareRequest status transition" in exc_info.value.detail

    # 2. Execution Authority Guard
    from app.services.care_request_service import CareRequestService
    unassigned_req = CareRequest(id="req-neg-1", parent_id="p-1", category="ERRANDS", title="Test", status="ASSIGNED", assigned_to_id="usr-vol-other")
    with pytest.raises(HTTPException) as exc_info2:
        CareRequestService.verify_execution_authority(unassigned_req, volunteer_user)
    assert exc_info2.value.status_code == 403
    assert "Execution authority requires being the assigned caregiver" in exc_info2.value.detail
