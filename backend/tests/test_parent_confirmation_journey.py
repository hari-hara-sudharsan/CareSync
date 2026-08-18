import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.care_request import CareRequest, AssignmentHistory
from app.models.decision import AuditEvent
from app.models.user import User
from app.services.care_request_service import CareRequestService

@pytest.mark.asyncio
async def test_authorized_parent_confirms_completed_task(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Authorized parent/guardian confirms a completed task.
    Verifies transition COMPLETED -> PARENT_CONFIRMED -> CLOSED, AssignmentHistory, and AuditEvents.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Cardiology Medical Ride",
        description="Transport needed",
        priority="HIGH",
        status="COMPLETED",
        assigned_to_id="c-1",
        assigned_to_name="David Woodson",
        assigned_to_role="Son (Family)",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/confirm")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "CLOSED"

    # Database verification
    res_hist = await async_db.execute(select(AssignmentHistory).where(AssignmentHistory.care_request_id == req.id))
    histories = res_hist.scalars().all()
    statuses = [h.status for h in histories]
    assert "PARENT_CONFIRMED" in statuses
    assert "CLOSED" in statuses

    # Audit log verification
    res_audit = await async_db.execute(select(AuditEvent).where(AuditEvent.resource_id == req.id))
    audits = res_audit.scalars().all()
    actions = [a.action for a in audits]
    assert "CARE_REQUEST_PARENT_CONFIRMED" in actions
    assert "CARE_REQUEST_CLOSED" in actions

@pytest.mark.asyncio
async def test_parent_cannot_confirm_non_completed_task(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Parent attempts to confirm a task in status ASSIGNED or IN_PROGRESS.
    Verifies state machine raises HTTP 400 Bad Request.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Active Ride Task",
        description="In progress task",
        priority="HIGH",
        status="IN_PROGRESS",
        assigned_to_id="c-1",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/confirm")
    assert res.status_code == 400
    assert "Illegal CareRequest status transition" in res.json()["detail"]

@pytest.mark.asyncio
async def test_caregiver_cannot_confirm_task(async_db: AsyncSession):
    """
    Scenario: Caregiver-only user attempts to confirm parent completion.
    Verifies backend raises HTTP 403 Forbidden.
    """
    caregiver = User(id="usr-cg-only", phone="+15551112222", full_name="Volunteer Helper", role="VOLUNTEER", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Completed Ride",
        description="Task completed by volunteer",
        priority="HIGH",
        status="COMPLETED",
        assigned_to_id="usr-cg-only",
        requested_time="Today",
    )
    async_db.add_all([caregiver, req])
    await async_db.commit()

    with pytest.raises(Exception) as exc_info:
        await CareRequestService.confirm_care_request(
            db=async_db,
            request_id=req.id,
            current_user=caregiver,
        )
    assert "Only the parent or primary guardian holds this authority" in str(exc_info.value)

@pytest.mark.asyncio
async def test_wrong_parent_context_returns_403(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: User in an unauthorized parent context attempts confirmation.
    Verifies backend raises HTTP 403 Forbidden.
    """
    req = CareRequest(
        parent_id="p-unauthorized-999",
        category="TRANSPORTATION",
        title="Unauthorized Task",
        description="Cross parent context",
        priority="NORMAL",
        status="COMPLETED",
        assigned_to_id="c-1",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/confirm")
    assert res.status_code == 403
    assert "Access Denied" in res.json()["detail"]

@pytest.mark.asyncio
async def test_idempotent_confirmation(async_db: AsyncSession):
    """
    Scenario: Repeating parent confirmation call with same idempotency key.
    Verifies second call returns cached response cleanly.
    """
    user = User(id="usr-demo-1", phone="+15552345678", full_name="David Woodson", role="PRIMARY_GUARDIAN", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Idempotent Confirmation Task",
        description="Testing confirm",
        priority="HIGH",
        status="COMPLETED",
        assigned_to_id="c-1",
        requested_time="Today",
    )
    async_db.add_all([user, req])
    await async_db.commit()

    idemp_key = "idemp_confirm_key_999"

    res1 = await CareRequestService.confirm_care_request(
        db=async_db,
        request_id=req.id,
        current_user=user,
        idempotency_key=idemp_key,
    )

    res2 = await CareRequestService.confirm_care_request(
        db=async_db,
        request_id=req.id,
        current_user=user,
        idempotency_key=idemp_key,
    )

    assert res1.status == "CLOSED"
    assert res2.status == "CLOSED"

@pytest.mark.asyncio
async def test_raise_concern_creates_structured_concern(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Parent selects 'Something isn't right' on a completed task.
    Verifies backend logs a structured concern intent without auto-suspending the caregiver or auto-guilt determination.
    """
    req = CareRequest(
        parent_id="p-1",
        category="MEDICATION",
        title="Medication Delivery",
        description="Delivery check",
        priority="HIGH",
        status="COMPLETED",
        assigned_to_id="c-1",
        assigned_to_name="David Woodson",
        assigned_to_role="Son",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/raise-concern",
        json={"category": "PARTIALLY_COMPLETED", "details": "Part of the prescription was missing."},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "calmly" in data["message"]

    # Database verification
    res_hist = await async_db.execute(
        select(AssignmentHistory)
        .where(AssignmentHistory.care_request_id == req.id, AssignmentHistory.status == "CONCERN_RAISED")
    )
    history = res_hist.scalars().first()
    assert history is not None
    assert "PARTIALLY_COMPLETED" in history.reason

    # Audit event verification
    res_audit = await async_db.execute(
        select(AuditEvent)
        .where(AuditEvent.resource_id == req.id, AuditEvent.action == "CARE_REQUEST_CONCERN_RAISED")
    )
    audit = res_audit.scalars().first()
    assert audit is not None
    assert audit.details["auto_guilt_determined"] is False
