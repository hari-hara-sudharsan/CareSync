import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.main import app
from app.api.deps import get_current_user
from app.models.user import User
from app.core.security import create_access_token
from app.services.otp_service import otp_service

@pytest.mark.asyncio
async def test_otp_request_and_dev_sink_flow(client: AsyncClient, async_db: AsyncSession):
    """
    Test 1 & 2 & 4: Requests OTP for a user, verifies dev OTP sink access, and checks resend cooldown.
    """
    phone = "+15559876543"

    # Request OTP
    resp = await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "Verification code sent to" in data["message"]
    assert "dev_otp" not in data, "Production/normal request-otp response MUST NOT contain plain dev_otp"

    # Retrieve OTP from dev-otp-sink
    sink_resp = await client.get(f"/api/v1/auth/dev-otp-sink?phone={phone}")
    assert sink_resp.status_code == 200
    sink_data = sink_resp.json()
    assert "dev_otp" in sink_data
    assert len(sink_data["dev_otp"]) == 6

    # Test resend cooldown (immediate second request)
    resp2 = await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    assert resp2.status_code == 429
    assert "Resend cooldown active" in resp2.json()["detail"]

@pytest.mark.asyncio
async def test_otp_verification_success(client: AsyncClient, async_db: AsyncSession):
    """
    Test 5 & 11 & 16: Verifies correct OTP, receives JWT token, and checks user verification status.
    """
    phone = "+15551112222"
    
    # Request OTP
    req_resp = await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    assert req_resp.status_code == 200

    # Get generated OTP from dev sink
    otp_code = await otp_service.get_dev_otp(phone)
    assert otp_code is not None

    # Verify OTP
    ver_resp = await client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp_code": otp_code})
    assert ver_resp.status_code == 200
    token_data = ver_resp.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    # Verify user record in DB
    result = await async_db.execute(select(User).where(User.phone == phone))
    user = result.scalars().first()
    assert user is not None
    assert user.is_verified is True

@pytest.mark.asyncio
async def test_incorrect_otp_attempts_and_lockout(client: AsyncClient, async_db: AsyncSession):
    """
    Test 6 & 9: Verifies incorrect OTP attempt tracking and lockout after 5 failed attempts.
    """
    phone = "+15553334444"
    await client.post("/api/v1/auth/request-otp", json={"phone": phone})

    # 4 Failed attempts
    for attempt in range(1, 5):
        resp = await client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp_code": "000000"})
        assert resp.status_code == 400
        assert "Incorrect verification code" in resp.json()["detail"]

    # 5th Failed attempt -> Lockout
    resp5 = await client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp_code": "000000"})
    assert resp5.status_code == 400
    assert "Too many incorrect attempts" in resp5.json()["detail"]

@pytest.mark.asyncio
async def test_single_use_consumed_otp(client: AsyncClient, async_db: AsyncSession):
    """
    Test 8: Verifies that a consumed OTP cannot be reused.
    """
    phone = "+15555556666"
    await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    otp_code = await otp_service.get_dev_otp(phone)
    assert otp_code is not None

    # First verification -> Success
    res1 = await client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp_code": otp_code})
    assert res1.status_code == 200

    # Second verification -> Reused code rejected
    res2 = await client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp_code": otp_code})
    assert res2.status_code == 400
    assert "No active verification challenge found" in res2.json()["detail"]

@pytest.mark.asyncio
async def test_unauthenticated_and_invalid_jwt_rejection(async_db: AsyncSession):
    """
    Test 12 & 14 & 15: Directly tests get_current_user security boundary:
    1. Missing token -> 401 Unauthorized
    2. Invalid token -> 401 Unauthorized
    3. Inactive user token -> 401 Unauthorized
    4. Valid active user token -> Returns authenticated User object
    """
    # 1. Missing Token
    with pytest.raises(HTTPException) as exc1:
        await get_current_user(db=async_db, token=None)
    assert exc1.value.status_code == 401
    assert "Bearer token required" in exc1.value.detail

    # 2. Invalid Token
    with pytest.raises(HTTPException) as exc2:
        await get_current_user(db=async_db, token="invalid.bearer.token")
    assert exc2.value.status_code == 401
    assert "Invalid or expired token" in exc2.value.detail

    # 3. Inactive User Token
    user = User(id="usr-inactive-test", phone="+15559990000", full_name="Inactive Test User", role="FAMILY", is_active=False)
    async_db.add(user)
    await async_db.commit()

    inactive_token = create_access_token(subject=user.id)
    with pytest.raises(HTTPException) as exc3:
        await get_current_user(db=async_db, token=inactive_token)
    assert exc3.value.status_code == 401
    assert "User account not found or inactive" in exc3.value.detail

    # 4. Valid Active User Token
    active_user = User(id="usr-active-test", phone="+15558887777", full_name="Active Test User", role="PARENT", is_active=True)
    async_db.add(active_user)
    await async_db.commit()

    valid_token = create_access_token(subject=active_user.id)
    resolved_user = await get_current_user(db=async_db, token=valid_token)
    assert resolved_user.id == active_user.id
    assert resolved_user.phone == "+15558887777"
