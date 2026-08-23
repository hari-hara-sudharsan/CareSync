import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.main import app
from app.models.user import User
from app.core.database import get_db
from app.api import deps
from app.api.deps import get_current_user, require_roles, require_volunteer_role

@pytest.mark.asyncio
async def test_unauthenticated_requests_rejected_with_401(async_db: AsyncSession):
    """
    Test 1: Unauthenticated requests to protected endpoints return 401 Unauthorized.
    """
    async def override_db():
        yield async_db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides.pop(get_current_user, None)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as unauth_client:
        res1 = await unauth_client.get("/api/v1/auth/me")
        assert res1.status_code == 401

        res2 = await unauth_client.get("/api/v1/volunteer/home")
        assert res2.status_code == 401

        res3 = await unauth_client.get("/api/v1/trust/dashboard")
        assert res3.status_code == 401

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_parent_role_forbidden_from_volunteer_and_trust_dashboards(async_db: AsyncSession):
    """
    Test 2: Parent role is strictly forbidden from accessing Volunteer & Admin Trust dashboards.
    Direct API access returns HTTP 403 Forbidden.
    """
    parent_user = User(
        id="usr-parent-rbac-1",
        phone="+15551118888",
        full_name="Parent User RBAC",
        role="PARENT",
        is_active=True,
        is_verified=True,
    )
    async_db.add(parent_user)
    await async_db.commit()

    volunteer_guard = require_volunteer_role
    with pytest.raises(HTTPException) as exc_info:
        await volunteer_guard(current_user=parent_user)
    assert exc_info.value.status_code == 403
    assert "Access Denied: Role 'PARENT' is not authorized" in exc_info.value.detail

    admin_guard = require_roles(["ADMIN", "COORDINATOR"])
    with pytest.raises(HTTPException) as exc_info2:
        await admin_guard(current_user=parent_user)
    assert exc_info2.value.status_code == 403
    assert "Access Denied" in exc_info2.value.detail

@pytest.mark.asyncio
async def test_volunteer_role_forbidden_from_admin_dashboard(async_db: AsyncSession):
    """
    Test 3: Volunteer role is forbidden from accessing Admin/Coordinator Trust dashboard.
    """
    volunteer_user = User(
        id="usr-volunteer-rbac-1",
        phone="+15552228888",
        full_name="Volunteer User RBAC",
        role="VOLUNTEER",
        is_active=True,
        is_verified=True,
    )
    async_db.add(volunteer_user)
    await async_db.commit()

    admin_guard = require_roles(["ADMIN", "COORDINATOR"])
    with pytest.raises(HTTPException) as exc_info:
        await admin_guard(current_user=volunteer_user)
    assert exc_info.value.status_code == 403
    assert "Access Denied" in exc_info.value.detail

@pytest.mark.asyncio
async def test_volunteer_role_allowed_to_access_volunteer_home(async_db: AsyncSession):
    """
    Test 4: Volunteer role is authorized to access Volunteer Home dashboard.
    """
    volunteer_user = User(
        id="usr-volunteer-rbac-2",
        phone="+15553338888",
        full_name="Volunteer User Valid",
        role="VOLUNTEER",
        is_active=True,
        is_verified=True,
    )
    async_db.add(volunteer_user)
    await async_db.commit()

    volunteer_guard = require_volunteer_role
    resolved_user = await volunteer_guard(current_user=volunteer_user)
    assert resolved_user.id == volunteer_user.id
    assert resolved_user.role == "VOLUNTEER"

@pytest.mark.asyncio
async def test_settings_retrieval_and_update(async_db: AsyncSession):
    """
    Test 5: Verifies GET /api/v1/settings and PUT /api/v1/settings for real PostgreSQL settings persistence.
    """
    user = User(
        id="usr-settings-test-1",
        phone="+15554448888",
        full_name="Settings Test User",
        email="settings.test@example.com",
        role="FAMILY",
        is_active=True,
        is_verified=True,
    )
    async_db.add(user)
    await async_db.commit()

    async def override_db():
        yield async_db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as raw_client:
        res1 = await raw_client.get("/api/v1/settings")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["account"]["full_name"] == "Settings Test User"
        assert data1["account"]["role"] == "FAMILY"

        res2 = await raw_client.put(
            "/api/v1/settings",
            json={"full_name": "Updated Settings User Name", "email": "updated.email@example.com"},
        )
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["success"] is True
        assert data2["account"]["full_name"] == "Updated Settings User Name"

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_notifications_retrieval(async_db: AsyncSession):
    """
    Test 6: Verifies GET /api/v1/notifications returns real database notifications for authenticated user.
    """
    user = User(
        id="usr-notif-test-1",
        phone="+15555558888",
        full_name="Notif Test User",
        role="PARENT",
        is_active=True,
        is_verified=True,
    )
    async_db.add(user)
    await async_db.commit()

    async def override_db():
        yield async_db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as raw_client:
        res = await raw_client.get("/api/v1/notifications")
        assert res.status_code == 200
        data = res.json()
        assert "notifications" in data
        assert len(data["notifications"]) >= 1

    app.dependency_overrides.clear()
