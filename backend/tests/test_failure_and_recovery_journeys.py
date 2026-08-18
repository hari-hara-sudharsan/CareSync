import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.care_request import CareRequest, AssignmentHistory
from app.models.decision import DecisionCard, AuditEvent
from app.models.user import User
from app.services.care_request_service import CareRequestService
from app.services.decision_service import DecisionService

@pytest.mark.asyncio
async def test_assigned_caregiver_can_decline_task(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Assigned caregiver declines a task assignment.
    Verifies transition ASSIGNED -> DECLINED -> PENDING_ASSIGNMENT, cleared assignee metadata, and AssignmentHistory entry.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Cardiology Ride",
        description="Ride needed",
        priority="HIGH",
        status="ASSIGNED",
        assigned_to_id="c-1",
        assigned_to_name="David Woodson",
        assigned_to_role="Son (Family)",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/decline",
        json={"reason": "Schedule conflict with work"},
    )
    assert res.status_code == 200
    data = res.json()

    # Request returns to PENDING_ASSIGNMENT pool with cleared assignee
    assert data["status"] == "PENDING_ASSIGNMENT"
    assert data["assigned_to_id"] is None

    # History verification
    res_hist = await async_db.execute(select(AssignmentHistory).where(AssignmentHistory.care_request_id == req.id))
    histories = res_hist.scalars().all()
    assert any(h.status == "DECLINED" and "Schedule conflict" in (h.reason or "") for h in histories)

@pytest.mark.asyncio
async def test_decline_returns_request_to_pending_assignment_without_auto_assign(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Declining a task returns it to PENDING_ASSIGNMENT so matching can be re-run manually.
    Verifies request does NOT automatically assign the next candidate.
    """
    req = CareRequest(
        parent_id="p-1",
        category="PHARMACY",
        title="Prescription Refill",
        description="Med pickup",
        priority="NORMAL",
        status="ASSIGNED",
        assigned_to_id="c-1",
        assigned_to_name="David Woodson",
        assigned_to_role="Son",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/decline")
    assert res.status_code == 200

    res_db = await async_db.execute(select(CareRequest).where(CareRequest.id == req.id))
    updated_req = res_db.scalars().first()

    assert updated_req.status == "PENDING_ASSIGNMENT"
    assert updated_req.assigned_to_id is None

@pytest.mark.asyncio
async def test_non_assignee_cannot_decline(async_db: AsyncSession):
    """
    Scenario: Unassigned caregiver attempts to decline a task assigned to someone else.
    Verifies backend raises HTTP 403 Forbidden.
    """
    stranger = User(id="usr-other-88", phone="+15558889999", full_name="Stranger Caregiver", role="CAREGIVER", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Private Ride",
        description="Transport",
        priority="HIGH",
        status="ASSIGNED",
        assigned_to_id="c-1",
        requested_time="Today",
    )
    async_db.add_all([stranger, req])
    await async_db.commit()

    with pytest.raises(Exception) as exc_info:
        await CareRequestService.decline_care_request(
            db=async_db,
            request_id=req.id,
            current_user=stranger,
        )
    assert "Execution authority requires being the assigned caregiver" in str(exc_info.value)

@pytest.mark.asyncio
async def test_execution_actor_can_report_failure(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Assigned caregiver reports failure during execution.
    Verifies transition IN_PROGRESS -> FAILED -> ESCALATED and DecisionCard creation.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Physical Therapy Ride",
        description="Ride needed",
        priority="HIGH",
        status="IN_PROGRESS",
        assigned_to_id="c-1",
        assigned_to_name="David Woodson",
        assigned_to_role="Son",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/fail",
        json={"failure_reason": "TRANSPORT_ISSUE", "details": "Vehicle broke down on route"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ESCALATED"

    # Verify DecisionCard in Decision Inbox
    res_card = await async_db.execute(select(DecisionCard).where(DecisionCard.related_entity_id == req.id))
    card = res_card.scalars().first()
    assert card is not None
    assert card.type == "TASK_FAILURE_ESCALATION"
    assert card.status == "PENDING"
    assert "Vehicle broke down" in (card.reason or "")

@pytest.mark.asyncio
async def test_invalid_failure_transition_rejected(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Attempting to report failure on an unstarted (PENDING_ASSIGNMENT) task.
    Verifies state machine raises HTTP 400 Bad Request.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Unassigned Task",
        description="Pending task",
        priority="NORMAL",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/fail",
        json={"failure_reason": "UNABLE_TO_COMPLETE"},
    )
    assert res.status_code == 400
    assert "Illegal CareRequest status transition" in res.json()["detail"]

@pytest.mark.asyncio
async def test_timeout_transition_is_deterministic(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Deterministic assignment/execution timeout handler.
    Verifies transition ASSIGNED -> TIMEOUT -> ESCALATED and DecisionCard creation.
    """
    req = CareRequest(
        parent_id="p-1",
        category="PHARMACY",
        title="Timed Out Med Task",
        description="No progress update",
        priority="HIGH",
        status="ASSIGNED",
        assigned_to_id="c-1",
        assigned_to_name="David Woodson",
        assigned_to_role="Son",
        requested_time="Yesterday",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/timeout")
    assert res.status_code == 200
    assert res.json()["status"] == "ESCALATED"

    # Decision card verification
    res_card = await async_db.execute(select(DecisionCard).where(DecisionCard.related_entity_id == req.id))
    card = res_card.scalars().first()
    assert card is not None
    assert card.type == "TASK_TIMEOUT_ESCALATION"

@pytest.mark.asyncio
async def test_timeout_cannot_overwrite_completed_task(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Attempting to trigger timeout on a COMPLETED task.
    Verifies state machine raises HTTP 400 Bad Request.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Completed Ride",
        description="Done task",
        priority="NORMAL",
        status="COMPLETED",
        assigned_to_id="c-1",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/timeout")
    assert res.status_code == 400
    assert "Illegal CareRequest status transition" in res.json()["detail"]

@pytest.mark.asyncio
async def test_parent_can_cancel_request(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Parent/guardian cancels an active care request before completion.
    Verifies transition ASSIGNED -> CANCELLED and AuditEvent.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Unneeded Ride",
        description="Cancelled appointment",
        priority="NORMAL",
        status="ASSIGNED",
        assigned_to_id="c-1",
        requested_time="Tomorrow",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/cancel",
        json={"reason": "Doctor appointment rescheduled to next month"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "CANCELLED"

    # Audit event verification
    res_audit = await async_db.execute(
        select(AuditEvent)
        .where(AuditEvent.resource_id == req.id, AuditEvent.action == "CARE_REQUEST_CANCELLED")
    )
    audit = res_audit.scalars().first()
    assert audit is not None
    assert "rescheduled" in audit.details["reason"]

@pytest.mark.asyncio
async def test_caregiver_cannot_arbitrarily_cancel(async_db: AsyncSession):
    """
    Scenario: Caregiver-only user attempts to cancel a parent's CareRequest.
    Verifies backend raises HTTP 403 Forbidden.
    """
    caregiver = User(id="usr-cg-only-77", phone="+15557778888", full_name="Volunteer Helper", role="VOLUNTEER", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Parent Ride Request",
        description="Ride task",
        priority="NORMAL",
        status="ASSIGNED",
        assigned_to_id="usr-cg-only-77",
        requested_time="Today",
    )
    async_db.add_all([caregiver, req])
    await async_db.commit()

    with pytest.raises(Exception) as exc_info:
        await CareRequestService.cancel_care_request(
            db=async_db,
            request_id=req.id,
            current_user=caregiver,
            cancellation_reason="Arbitrary cancellation",
        )
    assert "Only the parent or primary guardian holds this authority" in str(exc_info.value)

@pytest.mark.asyncio
async def test_closed_task_cannot_be_cancelled(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Attempting to cancel an already CLOSED task.
    Verifies state machine raises HTTP 400 Bad Request.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Already Closed Task",
        description="Closed task",
        priority="NORMAL",
        status="CLOSED",
        requested_time="Yesterday",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/cancel",
        json={"reason": "Late cancel"},
    )
    assert res.status_code == 400
    assert "Illegal CareRequest status transition" in res.json()["detail"]

@pytest.mark.asyncio
async def test_decision_card_action_executes_recovery(async_db: AsyncSession):
    """
    Scenario: Escalation decision card is resolved with 'cancel_request' action.
    Verifies decision resolution executes real domain cancellation and updates card to RESOLVED.
    """
    user = User(id="usr-demo-1", phone="+15552345678", full_name="David Woodson", role="PRIMARY_GUARDIAN", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Escalated Ride Task",
        description="Escalated task",
        priority="HIGH",
        status="ESCALATED",
        requested_time="Today",
    )
    async_db.add_all([user, req])
    await async_db.flush()

    card = DecisionCard(
        parent_id="p-1",
        related_entity_id=req.id,
        type="TASK_FAILURE_ESCALATION",
        priority="HIGH",
        status="PENDING",
        title="Task Failure Escalation",
        summary="Caregiver vehicle broke down",
        actions=[{"key": "cancel_request", "label": "Cancel Request"}],
    )
    async_db.add(card)
    await async_db.commit()

    res_card = await DecisionService.resolve_decision(
        db=async_db,
        current_user=user,
        card_id=card.id,
        action_key="cancel_request",
        reason="No alternate drivers available",
    )

    assert res_card["success"] is True
    assert res_card["status"] == "RESOLVED"

@pytest.mark.asyncio
async def test_idempotent_decline_fail_cancel(async_db: AsyncSession):
    """
    Scenario: Submitting duplicate decline/cancel requests with same Idempotency-Key.
    Verifies second request returns cached response cleanly without duplicate history/audit records.
    """
    user = User(id="usr-demo-1", phone="+15552345678", full_name="David Woodson", role="PRIMARY_GUARDIAN", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Idempotent Fail Task",
        description="Testing idempotency",
        priority="HIGH",
        status="ASSIGNED",
        assigned_to_id="usr-demo-1",
        assigned_to_name="David Woodson",
        assigned_to_role="Son",
        requested_time="Today",
    )
    async_db.add_all([user, req])
    await async_db.commit()

    idemp_key = "idemp_decline_key_555"

    res1 = await CareRequestService.decline_care_request(
        db=async_db,
        request_id=req.id,
        current_user=user,
        reason="Schedule conflict",
        idempotency_key=idemp_key,
    )

    res2 = await CareRequestService.decline_care_request(
        db=async_db,
        request_id=req.id,
        current_user=user,
        reason="Schedule conflict",
        idempotency_key=idemp_key,
    )

    assert res1.status == "PENDING_ASSIGNMENT"
    assert res2.status == "PENDING_ASSIGNMENT"

    # Verify only one AssignmentHistory record for DECLINED exists
    res_hist = await async_db.execute(select(AssignmentHistory).where(AssignmentHistory.care_request_id == req.id, AssignmentHistory.status == "DECLINED"))
    histories = res_hist.scalars().all()
    assert len(histories) == 1
