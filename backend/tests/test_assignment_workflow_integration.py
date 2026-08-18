import pytest
from httpx import AsyncClient
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.care_request import CareRequest, AssignmentHistory
from app.models.decision import DecisionCard, AuditEvent
from app.models.user import User
from app.models.care_network import CareMember
from app.services.care_request_service import CareRequestService
from app.services.decision_service import DecisionService

@pytest.mark.asyncio
async def test_authorized_caregiver_assigns_family_candidate(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Authorized caregiver assigns an eligible family candidate (David Woodson).
    Verifies CareRequest status transitions to 'ASSIGNED' and AssignmentHistory entry is created.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Ride to Doctor",
        description="Transport needed",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/assign",
        json={"assignee_id": "c-1", "assignee_name": "David Woodson", "assignee_role": "Son (Family)"},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "ASSIGNED"
    assert data["assigned_to_id"] == "c-1"
    assert data["assigned_to_name"] == "David Woodson"

    # Database verification
    res_hist = await async_db.execute(select(AssignmentHistory).where(AssignmentHistory.care_request_id == req.id))
    histories = res_hist.scalars().all()
    assert len(histories) == 1
    assert histories[0].assignee_id == "c-1"
    assert histories[0].status == "ASSIGNED"

@pytest.mark.asyncio
async def test_authorized_caregiver_assigns_eligible_volunteer(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Authorized caregiver assigns an eligible verified volunteer (Priya Sharma).
    Verifies CareRequest status transitions to 'ASSIGNED'.
    """
    req = CareRequest(
        parent_id="p-1",
        category="PHARMACY",
        title="Pharmacy Pickup",
        description="Prescription pickup",
        priority="NORMAL",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/assign",
        json={"assignee_id": "c-3", "assignee_name": "Priya Sharma", "assignee_role": "Verified Volunteer"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ASSIGNED"

@pytest.mark.asyncio
async def test_cross_parent_assignment_returns_403(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Caregiver attempts assignment on an unauthorized parent context.
    Verifies backend raises HTTP 403 Forbidden.
    """
    req = CareRequest(
        parent_id="p-unauthorized-999",
        category="TRANSPORTATION",
        title="Unauthorized Task",
        description="Cross parent",
        priority="NORMAL",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/assign",
        json={"assignee_id": "c-1"},
    )
    assert res.status_code == 403
    assert "Access Denied" in res.json()["detail"]

@pytest.mark.asyncio
async def test_stale_suspended_candidate_revalidated_and_rejected(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Candidate was previously matched, but has become SUSPENDED before assignment.
    Verifies revalidation at assignment time rejects candidate with HTTP 400 Bad Request.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Safety Check Ride",
        description="Testing stale candidate",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    suspended_dto = {
        "id": "c-suspended-1",
        "name": "Bad Candidate",
        "type": "VOLUNTEER",
        "is_active": True,
        "is_verified": False,
        "verification_status": "SUSPENDED",
        "is_available": True,
        "permissions": ["TRANSPORTATION"],
    }

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/assign",
        json={
            "assignee_id": "c-suspended-1",
            "assignee_name": "Bad Candidate",
            "assignee_role": "Volunteer",
            "candidate_dto": suspended_dto,
        },
    )
    assert res.status_code == 400
    assert "Ineligible Candidate" in res.json()["detail"]

@pytest.mark.asyncio
async def test_stale_unverified_volunteer_revalidated_and_rejected(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Candidate volunteer is UNVERIFIED at assignment time.
    Verifies revalidation rejects candidate with HTTP 400 Bad Request.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Unverified Ride Task",
        description="Testing unverified volunteer",
        priority="NORMAL",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    unverified_dto = {
        "id": "c-unverified-1",
        "name": "Unverified Person",
        "type": "VOLUNTEER",
        "is_active": True,
        "is_verified": False,
        "verification_status": "UNVERIFIED",
        "is_available": True,
        "permissions": ["TRANSPORTATION"],
    }

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/assign",
        json={
            "assignee_id": "c-unverified-1",
            "candidate_dto": unverified_dto,
        },
    )
    assert res.status_code == 400
    assert "Ineligible Candidate" in res.json()["detail"]

@pytest.mark.asyncio
async def test_candidate_without_task_permission_rejected(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Candidate lacks task category permission at assignment time.
    Verifies revalidation rejects assignment with HTTP 400 Bad Request.
    """
    req = CareRequest(
        parent_id="p-1",
        category="MEDICATION",
        title="Medication Task",
        description="Requires med permission",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    no_perm_dto = {
        "id": "c-no-med-1",
        "name": "No Med Permission",
        "type": "VOLUNTEER",
        "is_active": True,
        "is_verified": True,
        "verification_status": "VERIFIED",
        "is_available": True,
        "permissions": ["TRANSPORTATION"], # Missing MEDICATION permission
    }

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/assign",
        json={
            "assignee_id": "c-no-med-1",
            "candidate_dto": no_perm_dto,
        },
    )
    assert res.status_code == 400
    assert "Ineligible Candidate" in res.json()["detail"]

@pytest.mark.asyncio
async def test_assignment_from_invalid_state_returns_400(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Attempting assignment on a CareRequest in status 'COMPLETED' or 'CLOSED'.
    Verifies state machine raises HTTP 400 Bad Request.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Closed Task",
        description="Already closed",
        priority="NORMAL",
        status="CLOSED",
        requested_time="Yesterday",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/assign",
        json={"assignee_id": "c-1"},
    )
    assert res.status_code == 400
    assert "Illegal CareRequest status transition" in res.json()["detail"] or "already assigned or completed" in res.json()["detail"]

@pytest.mark.asyncio
async def test_concurrent_assignment_conflict_returns_409(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: CareRequest is already assigned to Person A (c-1).
    Caregiver B attempts to assign Person B (c-2).
    Verifies backend raises HTTP 409 Conflict.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Already Assigned Task",
        description="Assigned to David",
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
        f"/api/v1/care-requests/{req.id}/assign",
        json={"assignee_id": "c-2", "assignee_name": "Sarah Woodson", "assignee_role": "Daughter"},
    )
    assert res.status_code == 409
    assert "already assigned" in res.json()["detail"]

@pytest.mark.asyncio
async def test_idempotent_duplicate_assignment(async_db: AsyncSession):
    """
    Scenario: Submitting duplicate assignment requests with same Idempotency-Key.
    Verifies second request returns cached response without duplicate side effects or history entries.
    """
    user = User(id="usr-assigner-1", phone="+15552345678", full_name="David Woodson", role="PRIMARY_GUARDIAN", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Idempotent Task",
        description="Testing duplicate assignment",
        priority="NORMAL",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add_all([user, req])
    await async_db.commit()

    idemp_key = "idemp_assign_key_777"

    res1 = await CareRequestService.assign_care_request(
        db=async_db,
        request_id=req.id,
        assignee_id="c-1",
        assignee_name="David Woodson",
        assignee_role="Son",
        actor_id=user.id,
        actor_name=user.full_name,
        idempotency_key=idemp_key,
    )

    res2 = await CareRequestService.assign_care_request(
        db=async_db,
        request_id=req.id,
        assignee_id="c-1",
        assignee_name="David Woodson",
        assignee_role="Son",
        actor_id=user.id,
        actor_name=user.full_name,
        idempotency_key=idemp_key,
    )

    assert res1.id == res2.id

    # Verify only one AssignmentHistory record exists
    res_hist = await async_db.execute(select(AssignmentHistory).where(AssignmentHistory.care_request_id == req.id))
    histories = res_hist.scalars().all()
    assert len(histories) == 1

@pytest.mark.asyncio
async def test_stale_decision_card_action_cannot_mutate_closed_request(async_db: AsyncSession):
    """
    Scenario: Decision card is linked to a CareRequest that has become CLOSED.
    Verifies resolving decision card on closed request raises HTTP 400 Bad Request.
    """
    user = User(id="usr-demo-1", phone="+15552345678", full_name="David Woodson", role="PRIMARY_GUARDIAN", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Closed Ride Task",
        description="Closed task",
        priority="NORMAL",
        status="CLOSED",
        requested_time="Yesterday",
    )
    async_db.add(req)
    await async_db.flush()

    card = DecisionCard(
        parent_id="p-1",
        related_entity_id=req.id,
        type="TRANSPORTATION_CONFIRMATION",
        priority="HIGH",
        status="PENDING",
        title="Stale Decision",
        summary="Stale card linked to closed request",
    )
    async_db.add(card)
    await async_db.commit()

    with pytest.raises(HTTPException) as exc_info:
        await DecisionService.resolve_decision(
            db=async_db,
            current_user=user,
            card_id=card.id,
            action_key="confirm_family_driver",
        )

    assert exc_info.value.status_code == 400
    assert "already 'CLOSED'" in exc_info.value.detail
