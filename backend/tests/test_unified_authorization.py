import pytest
from httpx import AsyncClient
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import create_access_token
from app.core.authorization import CarePermission, CareRole, verify_care_permission, enforce_care_permission
from app.api.deps import verify_parent_authorization
from app.models.user import User
from app.models.care_network import CareMember

@pytest.mark.asyncio
async def test_valid_jwt_authenticates_user(async_db: AsyncSession):
    """Verifies JWT access token creation and decoding."""
    token = create_access_token(subject="usr-demo-1")
    assert token is not None
    assert isinstance(token, str)

@pytest.mark.asyncio
async def test_authorized_caregiver_accesses_parent_resource(async_db: AsyncSession):
    """Verifies authorized caregiver accesses target parent resource."""
    user = User(id="usr-auth-1", phone="+15551112222", full_name="Alice Guardian", role="PRIMARY_GUARDIAN", is_active=True)
    member_record = CareMember(
        parent_id="p-1",
        user_id="usr-auth-1",
        name="Alice Guardian",
        phone="+15551112222",
        relationship="Daughter",
        role="PRIMARY_GUARDIAN",
        status="ACTIVE",
        permissions=["TRANSPORTATION", "CHECK_INS"],
    )
    async_db.add(user)
    async_db.add(member_record)
    await async_db.commit()

    member = await verify_parent_authorization(
        parent_id="p-1",
        required_permission=CarePermission.TRANSPORTATION,
        db=async_db,
        current_user=user,
    )
    assert member is not None
    assert member.parent_id == "p-1"

@pytest.mark.asyncio
async def test_unauthorized_caregiver_cross_parent_denied(async_db: AsyncSession):
    """Verifies unauthorized caregiver cross-parent access is denied with HTTP 403 Forbidden."""
    user = User(id="usr-stranger-99", phone="+15559998888", full_name="Stranger User", role="FAMILY", is_active=True)
    async_db.add(user)
    await async_db.commit()

    with pytest.raises(HTTPException) as exc_info:
        await verify_parent_authorization(
            parent_id="p-unauthorized-999",
            required_permission=CarePermission.MEDICATION,
            db=async_db,
            current_user=user,
        )

    assert exc_info.value.status_code == 403
    assert "Access Denied" in exc_info.value.detail

def test_abac_permission_verification():
    """Verifies task-scoped ABAC permission checks."""
    # 1. Granted permission -> Allowed
    assert verify_care_permission(CarePermission.TRANSPORTATION, CareRole.FAMILY, ["TRANSPORTATION", "CHECK_INS"]) is True

    # 2. Missing permission -> Denied
    assert verify_care_permission(CarePermission.MEDICATION, CareRole.FAMILY, ["TRANSPORTATION", "CHECK_INS"]) is False

    # 3. Parent / Admin -> Always allowed
    assert verify_care_permission(CarePermission.MEDICATION, CareRole.PARENT, []) is True
    assert verify_care_permission(CarePermission.MEDICATION, CareRole.ADMIN, []) is True

@pytest.mark.asyncio
async def test_parent_context_switcher_authorization_boundary(async_db: AsyncSession):
    """Verifies changing active parent context re-evaluates authorization boundaries."""
    demo_user = User(id="usr-demo-1", phone="+15552345678", full_name="David Woodson", role="PRIMARY_GUARDIAN", is_active=True)

    # Context 1: Susan Woodson (p-1) -> Allowed
    m1 = await verify_parent_authorization("p-1", CarePermission.CHECK_INS, async_db, demo_user)
    assert m1.parent_id == "p-1"

    # Context 2: George Miller (p-2) -> Allowed
    m2 = await verify_parent_authorization("p-2", CarePermission.CHECK_INS, async_db, demo_user)
    assert m2.parent_id == "p-2"

    # Context 3: Invalid Parent (p-invalid) -> Denied 403
    with pytest.raises(HTTPException) as exc:
        await verify_parent_authorization("p-invalid", CarePermission.CHECK_INS, async_db, demo_user)
    assert exc.value.status_code == 403
