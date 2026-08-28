import pytest
from httpx import AsyncClient
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.checkin import CheckInEvent
from app.models.care_request import CareRequest
from app.services.checkin_service import CheckInService
from app.models.user import User

@pytest.mark.asyncio
async def test_authenticated_parent_checkin_well(async_db: AsyncSession):
    """Verifies 'WELL' branch creates CheckInEvent and NO CareRequest."""
    user = User(id="usr-pj-1", phone="+15550001111", full_name="Susan Woodson", role="PARENT", is_active=True)
    async_db.add(user)
    await async_db.commit()

    res = await CheckInService.submit_checkin(
        db=async_db,
        current_user=user,
        parent_id="p-1",
        feeling_branch="WELL",
        status_summary="Feeling great today after morning walk.",
    )

    assert res["success"] is True
    assert res["feeling_branch"] == "WELL"
    assert res["requires_escalation"] is False
    assert res["care_request"] is None

    # Database state verification
    res_chk = await async_db.execute(select(CheckInEvent).where(CheckInEvent.id == res["checkin_id"]))
    chk = res_chk.scalars().first()
    assert chk is not None
    assert chk.care_request_id is None

@pytest.mark.asyncio
async def test_authenticated_parent_checkin_need_help(async_db: AsyncSession):
    """Verifies 'NEED_HELP' branch creates CheckInEvent AND a real CareRequest."""
    user = User(id="usr-pj-2", phone="+15550002222", full_name="Susan Woodson", role="PARENT", is_active=True)
    async_db.add(user)
    await async_db.commit()

    res = await CheckInService.submit_checkin(
        db=async_db,
        current_user=user,
        parent_id="p-1",
        feeling_branch="NEED_HELP",
        status_summary="Need help getting groceries today.",
        need_category="ERRANDS",
        urgency="NORMAL",
    )

    assert res["success"] is True
    assert res["feeling_branch"] == "NEED_HELP"
    assert res["requires_escalation"] is True
    assert res["care_request"] is not None
    assert res["care_request"]["category"] == "ERRANDS"
    assert res["care_request"]["status"] == "PENDING_ASSIGNMENT"

    # Database state verification
    res_req = await async_db.execute(select(CareRequest).where(CareRequest.id == res["care_request"]["id"]))
    req = res_req.scalars().first()
    assert req is not None
    assert req.parent_id == "p-1"

@pytest.mark.asyncio
async def test_idempotent_duplicate_checkin_submission(async_db: AsyncSession):
    """Verifies that submitting with same idempotency key returns cached response without duplicate CareRequest."""
    user = User(id="usr-pj-3", phone="+15550003333", full_name="Susan Woodson", role="PARENT", is_active=True)
    async_db.add(user)
    await async_db.commit()

    idemp_key = "idemp_chk_unique_999"

    # Submission 1 -> Creates CareRequest
    res1 = await CheckInService.submit_checkin(
        db=async_db,
        current_user=user,
        parent_id="p-1",
        feeling_branch="NEED_HELP",
        status_summary="Need ride to pharmacy.",
        need_category="TRANSPORTATION",
        idempotency_key=idemp_key,
    )

    # Submission 2 (Duplicate) -> Returns identical cached response
    res2 = await CheckInService.submit_checkin(
        db=async_db,
        current_user=user,
        parent_id="p-1",
        feeling_branch="NEED_HELP",
        status_summary="Need ride to pharmacy.",
        need_category="TRANSPORTATION",
        idempotency_key=idemp_key,
    )

    assert res1["checkin_id"] == res2["checkin_id"]
    assert res1["care_request"]["id"] == res2["care_request"]["id"]

@pytest.mark.asyncio
async def test_cross_parent_checkin_rejected(async_db: AsyncSession):
    """Verifies check-in attempt for unauthorized parent context is denied with HTTP 403 Forbidden."""
    user = User(id="usr-stranger-chk", phone="+15559990000", full_name="Stranger User", role="FAMILY", is_active=True)
    async_db.add(user)
    await async_db.commit()

    with pytest.raises(HTTPException) as exc_info:
        await CheckInService.submit_checkin(
            db=async_db,
            current_user=user,
            parent_id="p-unauthorized-999",
            feeling_branch="WELL",
            status_summary="Trying unauthorized check-in.",
        )

    assert exc_info.value.status_code == 403
    assert "Access Denied" in exc_info.value.detail

@pytest.mark.asyncio
async def test_invalid_checkin_branch_rejected(async_db: AsyncSession):
    """Verifies invalid feeling_branch raises HTTP 400 Bad Request."""
    user = User(id="usr-pj-4", phone="+15550004444", full_name="Susan Woodson", role="PARENT", is_active=True)
    async_db.add(user)
    await async_db.commit()

    with pytest.raises(HTTPException) as exc_info:
        await CheckInService.submit_checkin(
            db=async_db,
            current_user=user,
            parent_id="p-1",
            feeling_branch="INVALID_BRANCH",
            status_summary="Invalid check-in attempt.",
        )
    assert exc_info.value.status_code == 400
    assert "Invalid feeling_branch" in exc_info.value.detail


@pytest.mark.asyncio
async def test_authenticated_parent_onboarding_flow(client: AsyncClient, async_db: AsyncSession):
    """Verifies that an authenticated parent can complete all onboarding steps and update profile."""
    from app.core.security import create_access_token
    user = User(id="usr-onb-test", phone="+15558887777", full_name="New Onboarding User", role="PARENT", is_active=True)
    async_db.add(user)
    await async_db.commit()

    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Save Profile
    r1 = await client.post("/api/v1/parents/onboarding/profile", json={
        "preferredName": "Martha",
        "fullName": "Martha Stewart",
        "preferredLanguage": "en",
        "timezone": "America/New_York",
    }, headers=headers)
    assert r1.status_code == 200
    assert r1.json()["success"] is True

    # Step 2: Save Care Situation
    r2 = await client.post("/api/v1/parents/onboarding/care-situation", json={
        "careSituation": "FAMILY",
    }, headers=headers)
    assert r2.status_code == 200
    assert r2.json()["success"] is True

    # Step 3: Save Care Preferences
    r3 = await client.post("/api/v1/parents/onboarding/care-preferences", json={
        "careNeeds": ["MEDICATION_REMINDERS", "DAILY_CHECK_INS"],
    }, headers=headers)
    assert r3.status_code == 200
    assert r3.json()["success"] is True

    # Step 4: Complete Onboarding
    r4 = await client.post("/api/v1/parents/onboarding/complete", json={}, headers=headers)
    assert r4.status_code == 200
    assert r4.json()["success"] is True

    # Step 5: Verify /auth/me returns updated name
    r_me = await client.get("/api/v1/auth/me", headers=headers)
    assert r_me.status_code == 200
    assert r_me.json()["full_name"] == "Martha Stewart"

