import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.care_request import CareRequest
from app.models.user import User
from app.models.care_network import CareMember
from app.api.deps import verify_parent_authorization
from app.core.authorization import CarePermission
from fastapi import HTTPException

@pytest.mark.asyncio
async def test_authorized_caregiver_requests_matching(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Authorized caregiver requests matching recommendations for a pending request.
    Verifies that Top-K explainable candidates are returned with reasons.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Ride to Clinic",
        description="Transportation needed",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/match")
    assert res.status_code == 200
    data = res.json()

    assert data["request_id"] == req.id
    assert data["status"] == "CANDIDATES_FOUND"
    assert data["strategy"] == "FAMILY_FIRST"
    assert isinstance(data["candidates"], list)
    assert len(data["candidates"]) > 0
    assert "reasons" in data["candidates"][0]
    assert len(data["candidates"][0]["reasons"]) > 0

@pytest.mark.asyncio
async def test_cross_parent_matching_returns_403(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Caregiver attempts matching for request in an unauthorized parent context.
    Verifies backend raises HTTP 403 Forbidden.
    """
    req = CareRequest(
        parent_id="p-unauthorized-999",
        category="TRANSPORTATION",
        title="Cross parent match",
        description="Unauthorized",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/match")
    assert res.status_code == 403
    assert "Access Denied" in res.json()["detail"]

@pytest.mark.asyncio
async def test_suspended_and_unverified_volunteers_excluded(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Candidate pool contains suspended, unverified, and valid candidates.
    Verifies HardConstraintFilter excludes suspended and unverified candidates.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Test Filter Task",
        description="Testing constraints",
        priority="NORMAL",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    custom_pool = [
        {
            "id": "vol-suspended",
            "name": "Suspended Bob",
            "type": "VOLUNTEER",
            "is_active": True,
            "is_verified": False,
            "verification_status": "SUSPENDED",
            "is_available": True,
            "permissions": ["TRANSPORTATION"],
        },
        {
            "id": "vol-unverified",
            "name": "Unverified Alice",
            "type": "VOLUNTEER",
            "is_active": True,
            "is_verified": False,
            "verification_status": "UNVERIFIED",
            "is_available": True,
            "permissions": ["TRANSPORTATION"],
        },
        {
            "id": "vol-valid",
            "name": "Verified Carol",
            "type": "VOLUNTEER",
            "is_active": True,
            "is_verified": True,
            "verification_status": "VERIFIED",
            "is_available": True,
            "permissions": ["TRANSPORTATION"],
            "reliability_score": 4.9,
            "distance_km": 2.0,
        },
    ]

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/match",
        json={"custom_candidate_pool": custom_pool},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "CANDIDATES_FOUND"
    candidate_ids = [c["candidate_id"] for c in data["candidates"]]
    assert "vol-valid" in candidate_ids
    assert "vol-suspended" not in candidate_ids
    assert "vol-unverified" not in candidate_ids

@pytest.mark.asyncio
async def test_candidate_without_task_permission_excluded(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Candidate lacks task permission (category = 'PHARMACY').
    Verifies candidate without task permission is filtered out.
    """
    req = CareRequest(
        parent_id="p-1",
        category="PHARMACY",
        title="Pharmacy Task",
        description="Prescription pickup",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    custom_pool = [
        {
            "id": "cand-wrong-perm",
            "name": "No Perm Dave",
            "type": "VOLUNTEER",
            "is_active": True,
            "is_verified": True,
            "verification_status": "VERIFIED",
            "is_available": True,
            "permissions": ["TRANSPORTATION"], # Missing PHARMACY permission
        },
    ]

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/match",
        json={"custom_candidate_pool": custom_pool},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "NO_SUITABLE_CANDIDATE"
    assert len(data["candidates"]) == 0

@pytest.mark.asyncio
async def test_family_candidate_ranks_before_volunteer(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Eligible family member and volunteer exist.
    Verifies Family-First policy selects family candidate pool.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Family First Test",
        description="Test family priority",
        priority="NORMAL",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/match")
    assert res.status_code == 200
    data = res.json()

    assert data["strategy"] == "FAMILY_FIRST"
    for cand in data["candidates"]:
        assert cand["candidate_type"] == "FAMILY"

@pytest.mark.asyncio
async def test_top_k_bound_enforced(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Candidate pool contains 8 eligible family candidates.
    Verifies returned candidates count is bounded by Top-K = 5.
    """
    req = CareRequest(
        parent_id="p-1",
        category="CHECK_INS",
        title="Top K Test Task",
        description="Testing max candidate count",
        priority="NORMAL",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    large_pool = [
        {
            "id": f"fam-{i}",
            "name": f"Family Member {i}",
            "relationship": "Relative",
            "type": "FAMILY",
            "is_active": True,
            "is_available": True,
            "parent_id": "p-1",
            "permissions": ["CHECK_INS"],
            "reliability_score": 4.0 + (i * 0.1),
        }
        for i in range(8)
    ]

    res = await client.post(
        f"/api/v1/care-requests/{req.id}/match",
        json={"custom_candidate_pool": large_pool},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "CANDIDATES_FOUND"
    assert len(data["candidates"]) == 5

@pytest.mark.asyncio
async def test_matching_does_not_mutate_request_state(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Matching engine executes successfully for CareRequest.
    Verifies that CareRequest.status remains 'PENDING_ASSIGNMENT' and no assignee is mutated.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="State Mutation Check",
        description="Verify no automatic assignment",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/match")
    assert res.status_code == 200

    # Verify Database state remains unchanged
    res_req = await async_db.execute(select(CareRequest).where(CareRequest.id == req.id))
    persisted_req = res_req.scalars().first()

    assert persisted_req.status == "PENDING_ASSIGNMENT"
    assert persisted_req.assigned_to_id is None

@pytest.mark.asyncio
async def test_matching_rejected_for_closed_or_completed_requests(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Attempting candidate matching for a CareRequest in status 'COMPLETED' or 'CLOSED'.
    Verifies backend raises HTTP 400 Bad Request.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Completed Task",
        description="Already done",
        priority="NORMAL",
        status="COMPLETED",
        requested_time="Yesterday",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.post(f"/api/v1/care-requests/{req.id}/match")
    assert res.status_code == 400
    assert "Candidate matching is not permitted" in res.json()["detail"]
