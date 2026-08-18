import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.care_request import CareRequest
from app.models.care_network import CareMember
from app.services.checkin_service import CheckInService

@pytest.mark.asyncio
async def test_authorized_caregiver_sees_persisted_care_requests(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Parent submits 'NEED_HELP' check-in -> CareRequest is persisted.
    Authorized caregiver queries GET /api/v1/care-requests?parent_id=p-1.
    Verifies that caregiver sees real persisted domain CareRequest.
    """
    # 1. Parent submits check-in
    parent_user = User(id="usr-pj-vis-1", phone="+15551110001", full_name="Susan Woodson", role="PARENT", is_active=True)
    async_db.add(parent_user)
    await async_db.commit()

    checkin_res = await CheckInService.submit_checkin(
        db=async_db,
        current_user=parent_user,
        parent_id="p-1",
        feeling_branch="NEED_HELP",
        status_summary="Need help getting prescription.",
        need_category="PHARMACY",
        urgency="HIGH",
    )
    assert checkin_res["care_request"] is not None
    created_req_id = checkin_res["care_request"]["id"]

    # 2. Authorized caregiver fetches requests
    res = await client.get("/api/v1/care-requests?parent_id=p-1")
    assert res.status_code == 200
    requests = res.json()

    matched = next((r for r in requests if r["id"] == created_req_id), None)
    assert matched is not None
    assert matched["category"] == "PHARMACY"
    assert matched["priority"] == "HIGH"
    assert matched["status"] == "PENDING_ASSIGNMENT"

@pytest.mark.asyncio
async def test_unauthorized_caregiver_cross_parent_visibility_denied(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Unauthorized user attempts to view CareRequests for Parent 'p-unauthorized-999'.
    Verifies backend returns HTTP 403 Forbidden.
    """
    res = await client.get("/api/v1/care-requests?parent_id=p-unauthorized-999")
    assert res.status_code == 403
    assert "Access Denied" in res.json()["detail"]

@pytest.mark.asyncio
async def test_family_home_read_model_endpoint(client: AsyncClient):
    """
    Scenario: Authorized caregiver loads Family Home Dashboard read model.
    Verifies GET /api/v1/family/home returns active parent context, open requests count, and recent activity.
    """
    res = await client.get("/api/v1/family/home?parent_id=p-1")
    assert res.status_code == 200
    data = res.json()

    assert data["active_parent_id"] == "p-1"
    assert "active_parent_name" in data
    assert "pending_decisions_count" in data
    assert "open_requests_count" in data
    assert isinstance(data["recent_requests"], list)
