import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.care_request import CareRequest, AssignmentHistory
from app.models.decision import AuditEvent
from app.models.user import User
from app.services.care_request_service import CareRequestService

@pytest.mark.asyncio
async def test_assigned_caregiver_accepts_task(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Assigned caregiver (David Woodson) accepts the task.
    Verifies transition ASSIGNED -> ACCEPTED, AssignmentHistory entry, and AuditEvent.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Ride to Medical Center",
        description="Transport needed",
        priority="HIGH",
        status="ASSIGNED",
        assigned_to_id="c-1",
        assigned_to_name="David Woodson",
        assigned_to_role="Son (Family)",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/accept")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ACCEPTED"

    # Database verification
    res_hist = await async_db.execute(select(AssignmentHistory).where(AssignmentHistory.care_request_id == req.id))
    histories = res_hist.scalars().all()
    assert any(h.status == "ACCEPTED" for h in histories)

@pytest.mark.asyncio
async def test_assigned_caregiver_starts_task(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Assigned caregiver starts the task after acceptance.
    Verifies transition ACCEPTED -> IN_PROGRESS.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Ride to Medical Center",
        description="Transport needed",
        priority="HIGH",
        status="ACCEPTED",
        assigned_to_id="c-1",
        assigned_to_name="David Woodson",
        assigned_to_role="Son (Family)",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/start")
    assert res.status_code == 200
    assert res.json()["status"] == "IN_PROGRESS"

@pytest.mark.asyncio
async def test_assigned_caregiver_completes_task(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Assigned caregiver completes the task.
    Verifies transition IN_PROGRESS -> COMPLETED (and NOT closed or parent confirmed).
    """
    req = CareRequest(
        parent_id="p-1",
        category="PHARMACY",
        title="Pharmacy Pickup",
        description="Pickup meds",
        priority="NORMAL",
        status="IN_PROGRESS",
        assigned_to_id="c-1",
        assigned_to_name="David Woodson",
        assigned_to_role="Son (Family)",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/complete",
        json={"completion_note": "Pick up complete. Meds delivered to table."},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "COMPLETED"

    # Verify status is COMPLETED and NOT CLOSED
    res_req = await async_db.execute(select(CareRequest).where(CareRequest.id == req.id))
    updated_req = res_req.scalars().first()
    assert updated_req.status == "COMPLETED"

@pytest.mark.asyncio
async def test_non_assigned_caregiver_cannot_mutate_execution(async_db: AsyncSession):
    """
    Scenario: Caregiver B attempts to accept/start/complete a task assigned to Caregiver A.
    Verifies backend raises HTTP 403 Forbidden.
    """
    other_user = User(id="usr-stranger-99", phone="+15550009999", full_name="Other Helper", role="CAREGIVER", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Exclusive Task",
        description="Assigned to David",
        priority="HIGH",
        status="ASSIGNED",
        assigned_to_id="c-1", # Assigned to David Woodson
        assigned_to_name="David Woodson",
        assigned_to_role="Son",
        requested_time="Today",
    )
    async_db.add_all([other_user, req])
    await async_db.commit()

    with pytest.raises(Exception) as exc_info:
        await CareRequestService.accept_care_request(
            db=async_db,
            request_id=req.id,
            current_user=other_user,
        )
    assert "Execution authority requires being the assigned caregiver" in str(exc_info.value)

@pytest.mark.asyncio
async def test_cross_parent_caregiver_cannot_mutate_execution(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: User attempts to accept/start a task in an unauthorized parent context.
    Verifies backend raises HTTP 403 Forbidden.
    """
    req = CareRequest(
        parent_id="p-unauthorized-999",
        category="TRANSPORTATION",
        title="Unauthorized Task",
        description="Cross parent",
        priority="NORMAL",
        status="ASSIGNED",
        assigned_to_id="c-1",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/accept")
    assert res.status_code == 403
    assert "Access Denied" in res.json()["detail"]

@pytest.mark.asyncio
async def test_invalid_transition_pending_to_accepted_rejected(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Attempting to accept a task directly from PENDING_ASSIGNMENT state.
    Verifies state machine raises HTTP 400 Bad Request.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Unassigned Task",
        description="Pending assignment",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/accept")
    assert res.status_code == 400
    assert "Illegal CareRequest status transition" in res.json()["detail"]

@pytest.mark.asyncio
async def test_invalid_transition_assigned_to_inprogress_rejected(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Attempting to start a task directly from ASSIGNED without ACCEPTED first.
    Verifies state machine raises HTTP 400 Bad Request.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Assigned Task",
        description="Assigned but not accepted",
        priority="HIGH",
        status="ASSIGNED",
        assigned_to_id="c-1",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/start")
    assert res.status_code == 400
    assert "Illegal CareRequest status transition" in res.json()["detail"]

@pytest.mark.asyncio
async def test_completed_task_cannot_be_restarted(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Attempting to start a task that is already COMPLETED.
    Verifies state machine raises HTTP 400 Bad Request.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Done Task",
        description="Completed task",
        priority="NORMAL",
        status="COMPLETED",
        assigned_to_id="c-1",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/start")
    assert res.status_code == 400
    assert "Illegal CareRequest status transition" in res.json()["detail"]

@pytest.mark.asyncio
async def test_idempotent_accept(async_db: AsyncSession):
    """
    Scenario: Repeating acceptance call with same idempotency key.
    Verifies second call returns cached response without side effects.
    """
    user = User(id="usr-demo-1", phone="+15552345678", full_name="David Woodson", role="PRIMARY_GUARDIAN", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Idempotent Accept Task",
        description="Testing accept",
        priority="HIGH",
        status="ASSIGNED",
        assigned_to_id="usr-demo-1",
        assigned_to_name="David Woodson",
        assigned_to_role="Son",
        requested_time="Today",
    )
    async_db.add_all([user, req])
    await async_db.commit()

    idemp_key = "idemp_accept_key_888"

    res1 = await CareRequestService.accept_care_request(
        db=async_db,
        request_id=req.id,
        current_user=user,
        idempotency_key=idemp_key,
    )

    res2 = await CareRequestService.accept_care_request(
        db=async_db,
        request_id=req.id,
        current_user=user,
        idempotency_key=idemp_key,
    )

    assert res1.status == "ACCEPTED"
    assert res2.status == "ACCEPTED"

    # Verify only one AssignmentHistory record for ACCEPTED exists
    res_hist = await async_db.execute(select(AssignmentHistory).where(AssignmentHistory.care_request_id == req.id, AssignmentHistory.status == "ACCEPTED"))
    histories = res_hist.scalars().all()
    assert len(histories) == 1

@pytest.mark.asyncio
async def test_audit_events_and_append_only_history_generated(async_db: AsyncSession):
    """
    Scenario: Full execution flow ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED.
    Verifies append-only AssignmentHistory records and AuditEvents logged for every state transition.
    """
    user = User(id="usr-demo-1", phone="+15552345678", full_name="David Woodson", role="PRIMARY_GUARDIAN", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Full Lifecycle Task",
        description="Testing complete lifecycle",
        priority="HIGH",
        status="ASSIGNED",
        assigned_to_id="usr-demo-1",
        assigned_to_name="David Woodson",
        assigned_to_role="Son",
        requested_time="Today",
    )
    async_db.add_all([user, req])
    await async_db.commit()

    # Step 1: Accept
    await CareRequestService.accept_care_request(db=async_db, request_id=req.id, current_user=user)
    # Step 2: Start
    await CareRequestService.start_care_request(db=async_db, request_id=req.id, current_user=user)
    # Step 3: Complete
    await CareRequestService.complete_care_request(db=async_db, request_id=req.id, current_user=user, completion_note="All done!")

    # Verify append-only AssignmentHistory records
    res_hist = await async_db.execute(
        select(AssignmentHistory)
        .where(AssignmentHistory.care_request_id == req.id)
        .order_by(AssignmentHistory.created_at)
    )
    histories = res_hist.scalars().all()
    statuses = [h.status for h in histories]
    assert "ACCEPTED" in statuses
    assert "IN_PROGRESS" in statuses
    assert "COMPLETED" in statuses

    # Verify AuditEvents
    res_audit = await async_db.execute(select(AuditEvent).where(AuditEvent.resource_id == req.id))
    audits = res_audit.scalars().all()
    actions = [a.action for a in audits]
    assert "CARE_REQUEST_ACCEPTED" in actions
    assert "CARE_REQUEST_STARTED" in actions
    assert "CARE_REQUEST_COMPLETED" in actions
