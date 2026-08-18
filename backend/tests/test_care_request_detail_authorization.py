import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.care_request import CareRequest, AssignmentHistory
from app.models.care_network import CareMember
from app.api.deps import verify_parent_authorization
from app.core.authorization import CarePermission
from fastapi import HTTPException

@pytest.mark.asyncio
async def test_authorized_caregiver_views_care_request_detail(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Authorized caregiver queries GET /api/v1/care-requests/{request_id}.
    Verifies that detailed request information and assignment history are returned.
    """
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Ride to Cardiology",
        description="Mom needs transportation for cardiology appointment.",
        priority="CRITICAL",
        status="PENDING_ASSIGNMENT",
        requested_time="Tomorrow 10:00 AM",
        location_name="St. Jude Hospital",
        address="100 Main St",
    )
    async_db.add(req)
    await async_db.flush()

    hist = AssignmentHistory(
        care_request_id=req.id,
        assignee_id="c-2",
        assignee_name="Sarah Woodson",
        assignee_role="Daughter",
        status="DECLINED",
        reason="Schedule conflict",
    )
    async_db.add(hist)
    await async_db.commit()

    res = await client.get(f"/api/v1/care-requests/{req.id}")
    assert res.status_code == 200
    data = res.json()

    assert data["id"] == req.id
    assert data["parent_id"] == "p-1"
    assert data["category"] == "TRANSPORTATION"
    assert data["priority"] == "CRITICAL"
    assert len(data["history"]) == 1
    assert data["history"][0]["assignee_name"] == "Sarah Woodson"
    assert data["history"][0]["status"] == "DECLINED"

@pytest.mark.asyncio
async def test_unauthorized_parent_context_returns_403(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Caregiver attempts to view a CareRequest for an unauthorized parent context.
    Verifies backend raises HTTP 403 Forbidden.
    """
    req = CareRequest(
        parent_id="p-unauthorized-999",
        category="MEDICATION",
        title="Unauthorized Med Task",
        description="Private medical task",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    res = await client.get(f"/api/v1/care-requests/{req.id}")
    assert res.status_code == 403
    assert "Access Denied" in res.json()["detail"]

@pytest.mark.asyncio
async def test_missing_category_permission_returns_403(async_db: AsyncSession):
    """
    Scenario: Caregiver holds CareMember record for parent, but lacks MEDICATION permission.
    Verifies verify_parent_authorization raises HTTP 403 Forbidden.
    """
    user = User(id="usr-restricted-1", phone="+15550009999", full_name="Restricted Friend", role="FRIEND_NEIGHBOR", is_active=True)
    member = CareMember(
        parent_id="p-1",
        user_id=user.id,
        name=user.full_name,
        relationship="Neighbor",
        phone=user.phone,
        status="ACTIVE",
        permissions=["CHECK_INS", "TRANSPORTATION"], # Missing MEDICATION permission
    )
    async_db.add_all([user, member])
    await async_db.commit()

    with pytest.raises(HTTPException) as exc_info:
        await verify_parent_authorization("p-1", CarePermission.MEDICATION, async_db, user)

    assert exc_info.value.status_code == 403
    assert "Missing required permission 'MEDICATION'" in exc_info.value.detail

@pytest.mark.asyncio
async def test_inactive_care_member_returns_403(async_db: AsyncSession):
    """
    Scenario: Caregiver holds CareMember record, but status is 'INACTIVE'.
    Verifies verify_parent_authorization raises HTTP 403 Forbidden.
    """
    user = User(id="usr-inactive-1", phone="+15550008888", full_name="Inactive Member", role="FAMILY", is_active=True)
    member = CareMember(
        parent_id="p-1",
        user_id=user.id,
        name=user.full_name,
        relationship="Cousin",
        phone=user.phone,
        status="INACTIVE",
        permissions=["TRANSPORTATION"],
    )
    async_db.add_all([user, member])
    await async_db.commit()

    with pytest.raises(HTTPException) as exc_info:
        await verify_parent_authorization("p-1", CarePermission.TRANSPORTATION, async_db, user)

    assert exc_info.value.status_code == 403
    assert "Access Denied" in exc_info.value.detail

@pytest.mark.asyncio
async def test_nonexistent_request_id_returns_404(client: AsyncClient):
    """
    Scenario: Querying a non-existent request ID.
    Verifies backend returns HTTP 404 Not Found.
    """
    res = await client.get("/api/v1/care-requests/req-nonexistent-999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"]
