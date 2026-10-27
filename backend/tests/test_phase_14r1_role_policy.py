"""
Phase 14R.1 closure: signup role policy, privileged role governance, volunteer verification
gating, server-side assignment eligibility and removal of unauthenticated destructive endpoints.
"""
import pytest
import pytest_asyncio
from unittest.mock import patch
from datetime import timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

import jwt

from app.main import app
from app.core.config import settings, Settings, DEV_ONLY_JWT_SECRET
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.models.user import User
from app.models.parent import ParentProfile
from app.models.care_network import CareMember
from app.models.care_request import CareRequest
from app.models.decision import AuditEvent
from app.trust.models import VerificationRecord
from app.services.otp_service import otp_service

test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
TestingSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

@pytest_asyncio.fixture
async def db() -> AsyncSession:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with TestingSessionLocal() as session:
        yield session
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def http(db: AsyncSession) -> AsyncClient:
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        yield client
    app.dependency_overrides.clear()

def auth(user_id: str) -> dict:
    return {"Authorization": f"Bearer {create_access_token(subject=user_id)}"}

@pytest_asyncio.fixture
async def world(db: AsyncSession) -> dict:
    users = {
        "parent": User(id="u-parent", phone="+15550100001", full_name="Parent One", role="PARENT", is_active=True),
        "family": User(id="u-family", phone="+15550100002", full_name="Family One", role="FAMILY", is_active=True),
        "outsider": User(id="u-outsider", phone="+15550100003", full_name="Unlinked Family", role="FAMILY", is_active=True),
        "vol_ok": User(id="u-vol-ok", phone="+15550100004", full_name="Verified Volunteer", role="VOLUNTEER", is_active=True),
        "vol_pending": User(id="u-vol-pending", phone="+15550100005", full_name="Pending Volunteer", role="VOLUNTEER", is_active=True),
        "coordinator": User(id="u-coord", phone="+15550100006", full_name="Coordinator", role="COORDINATOR", is_active=True),
        "admin": User(id="u-admin", phone="+15550100007", full_name="Admin", role="ADMIN", is_active=True),
        "admin2": User(id="u-admin-2", phone="+15550100008", full_name="Admin Two", role="ADMIN", is_active=True),
    }
    db.add_all(users.values())
    await db.flush()
    db.add(ParentProfile(id="pp-1", user_id="u-parent", full_name="Parent One", care_situation="INDEPENDENT", care_status="ALL_CLEAR"))
    await db.flush()
    db.add(CareMember(
        parent_id="pp-1", user_id="u-family", name="Family One", phone="+15550100002", relationship="Daughter",
        role="FAMILY", status="ACTIVE", permissions=["TRANSPORTATION", "CHECK_INS"],
    ))
    db.add(VerificationRecord(user_id="u-vol-ok", status="VERIFIED", id_verified=True, background_checked=True))
    db.add(VerificationRecord(user_id="u-vol-pending", status="PENDING"))
    await db.commit()
    return users

async def _pending_request(db: AsyncSession, **overrides) -> CareRequest:
    fields = dict(
        parent_id="pp-1", category="TRANSPORTATION", title="Ride to clinic", description="Clinic visit",
        priority="NORMAL", status="PENDING_ASSIGNMENT", requested_time="Today",
    )
    fields.update(overrides)
    req = CareRequest(**fields)
    db.add(req)
    await db.commit()
    return req

async def _signup(http: AsyncClient, phone: str, role=None):
    res = await http.post("/api/v1/auth/request-otp", json={"phone": phone})
    assert res.status_code == 200
    code = await otp_service.get_dev_otp(phone)
    body = {"phone": phone, "otp_code": code}
    if role is not None:
        body["requested_role"] = role
    return await http.post("/api/v1/auth/verify-otp", json=body)

# --- Signup role policy -----------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("privileged_role", ["ADMIN", "COORDINATOR"])
async def test_signup_cannot_self_select_privileged_role(http: AsyncClient, db: AsyncSession, privileged_role):
    phone = "+15550200001" if privileged_role == "ADMIN" else "+15550200002"
    res = await _signup(http, phone, privileged_role)
    assert res.status_code == 422
    assert (await db.execute(select(User).where(User.phone == phone))).scalars().first() is None

@pytest.mark.asyncio
async def test_request_otp_does_not_create_account(http: AsyncClient, db: AsyncSession):
    res = await http.post("/api/v1/auth/request-otp", json={"phone": "+15550200003"})
    assert res.status_code == 200
    assert (await db.execute(select(User).where(User.phone == "+15550200003"))).scalars().first() is None

@pytest.mark.asyncio
async def test_parent_signup_creates_parent_and_audit(http: AsyncClient, db: AsyncSession):
    res = await _signup(http, "+15550200004", "PARENT")
    assert res.status_code == 200
    assert res.json()["role"] == "PARENT"
    user = (await db.execute(select(User).where(User.phone == "+15550200004"))).scalars().first()
    audit = (await db.execute(select(AuditEvent).where(AuditEvent.resource_id == user.id))).scalars().first()
    assert audit.action == "USER_REGISTERED"

@pytest.mark.asyncio
async def test_default_signup_is_least_privileged_family(http: AsyncClient):
    res = await _signup(http, "+15550200005")
    assert res.status_code == 200
    assert res.json()["role"] == "FAMILY"

@pytest.mark.asyncio
async def test_volunteer_signup_is_pending_without_task_access(http: AsyncClient, db: AsyncSession):
    await _pending_request(db)
    res = await _signup(http, "+15550200006", "VOLUNTEER")
    assert res.status_code == 200
    user_id = res.json()["user_id"]
    record = (await db.execute(select(VerificationRecord).where(VerificationRecord.user_id == user_id))).scalars().first()
    assert record.status == "PENDING"

    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}
    assert (await http.get("/api/v1/volunteer/tasks", headers=headers)).status_code == 403
    home = await http.get("/api/v1/volunteer/home", headers=headers)
    assert home.status_code == 200
    assert home.json()["task_access_enabled"] is False
    assert home.json()["available_opportunities"] == []

@pytest.mark.asyncio
async def test_existing_user_cannot_self_promote_at_login(http: AsyncClient, world):
    res = await _signup(http, world["family"].phone, "VOLUNTEER")
    assert res.status_code == 200
    assert res.json()["role"] == "FAMILY"

# --- Token integrity --------------------------------------------------------------------

@pytest.mark.asyncio
async def test_forged_and_orphan_tokens_rejected(http: AsyncClient, world):
    forged = jwt.encode({"sub": "u-admin"}, "attacker-secret", algorithm="HS256")
    res = await http.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert res.status_code == 401
    expired = create_access_token(subject="u-admin", expires_delta=timedelta(minutes=-5))
    assert (await http.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired}"})).status_code == 401
    assert (await http.get("/api/v1/auth/me", headers=auth("u-does-not-exist"))).status_code == 401

def test_deployed_environment_refuses_dev_jwt_secret():
    with pytest.raises(RuntimeError):
        Settings(ENVIRONMENT="prod", JWT_SECRET=DEV_ONLY_JWT_SECRET).validate_runtime_security()
    Settings(ENVIRONMENT="prod", JWT_SECRET="a-real-secret-value").validate_runtime_security()

@pytest.mark.asyncio
async def test_dev_otp_sink_hidden_outside_local(http: AsyncClient):
    with patch.object(settings, "ENVIRONMENT", "prod"):
        res = await http.get("/api/v1/auth/dev-otp-sink", params={"phone": "+15550200007"})
    assert res.status_code == 404

# --- Privileged role governance ---------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("actor", ["parent", "family", "vol_ok", "coordinator"])
async def test_non_admin_cannot_grant_roles(http: AsyncClient, world, actor):
    res = await http.post(
        "/api/v1/admin/users/u-outsider/role",
        json={"role": "COORDINATOR", "reason": "attempted escalation"},
        headers=auth(world[actor].id),
    )
    assert res.status_code == 403

@pytest.mark.asyncio
async def test_user_cannot_promote_self(http: AsyncClient, world):
    res = await http.post(
        "/api/v1/admin/users/u-family/role",
        json={"role": "COORDINATOR", "reason": "self promotion"},
        headers=auth("u-family"),
    )
    assert res.status_code == 403

@pytest.mark.asyncio
async def test_admin_grants_coordinator_with_audit(http: AsyncClient, db: AsyncSession, world):
    res = await http.post(
        "/api/v1/admin/users/u-outsider/role",
        json={"role": "COORDINATOR", "reason": "Operations team onboarding"},
        headers=auth("u-admin"),
    )
    assert res.status_code == 200
    assert res.json()["role"] == "COORDINATOR"
    audit = (await db.execute(
        select(AuditEvent).where(AuditEvent.action == "USER_ROLE_CHANGED", AuditEvent.resource_id == "u-outsider")
    )).scalars().first()
    assert audit.actor_id == "u-admin"
    assert audit.details["previous_role"] == "FAMILY"

@pytest.mark.asyncio
async def test_admin_role_cannot_be_granted_or_altered_via_api(http: AsyncClient, world):
    grant = await http.post(
        "/api/v1/admin/users/u-outsider/role", json={"role": "ADMIN", "reason": "x" * 5}, headers=auth("u-admin"),
    )
    assert grant.status_code == 422
    demote = await http.post(
        "/api/v1/admin/users/u-admin-2/role", json={"role": "FAMILY", "reason": "x" * 5}, headers=auth("u-admin"),
    )
    assert demote.status_code == 403
    self_change = await http.post(
        "/api/v1/admin/users/u-admin/role", json={"role": "FAMILY", "reason": "x" * 5}, headers=auth("u-admin"),
    )
    assert self_change.status_code == 403

# --- Volunteer verification -------------------------------------------------------------

@pytest.mark.asyncio
async def test_volunteer_verification_requires_admin_and_checks(http: AsyncClient, db: AsyncSession, world):
    url = "/api/v1/admin/volunteers/u-vol-pending/verification"
    assert (await http.post(url, json={"decision": "VERIFIED", "id_verified": True, "background_checked": True},
                            headers=auth("u-coord"))).status_code == 403
    assert (await http.post(url, json={"decision": "VERIFIED", "id_verified": True, "background_checked": True},
                            headers=auth("u-vol-pending"))).status_code == 403
    assert (await http.post(url, json={"decision": "VERIFIED"}, headers=auth("u-admin"))).status_code == 422
    assert (await http.get("/api/v1/volunteer/tasks", headers=auth("u-vol-pending"))).status_code == 403

    ok = await http.post(url, json={"decision": "VERIFIED", "id_verified": True, "background_checked": True},
                         headers=auth("u-admin"))
    assert ok.status_code == 200
    assert (await http.get("/api/v1/volunteer/tasks", headers=auth("u-vol-pending"))).status_code == 200
    audit = (await db.execute(select(AuditEvent).where(AuditEvent.action == "VOLUNTEER_VERIFICATION_DECIDED"))).scalars().first()
    assert audit.actor_id == "u-admin"

    suspended = await http.post(url, json={"decision": "SUSPENDED", "notes": "complaint"}, headers=auth("u-admin"))
    assert suspended.status_code == 200
    assert (await http.get("/api/v1/volunteer/tasks", headers=auth("u-vol-pending"))).status_code == 403

@pytest.mark.asyncio
async def test_volunteer_task_list_excludes_other_assignments_and_parent_identity(http: AsyncClient, db: AsyncSession, world):
    await _pending_request(db, title="Open ride")
    await _pending_request(db, title="Someone else's ride", status="ASSIGNED", assigned_to_id="u-family")
    res = await http.get("/api/v1/volunteer/tasks", headers=auth("u-vol-ok"))
    assert res.status_code == 200
    body = res.json()
    titles = [t["title"] for t in body["available_opportunities"] + body["assigned_tasks"]]
    assert "Someone else's ride" not in titles
    assert "Open ride" in titles
    assert all("parent_id" not in t and "description" not in t for t in body["available_opportunities"])

# --- Assignment eligibility is server-side ----------------------------------------------

@pytest.mark.asyncio
async def test_assignment_rejects_unverified_volunteer_even_with_forged_dto(http: AsyncClient, db: AsyncSession, world):
    req = await _pending_request(db)
    forged = {"id": "u-vol-pending", "type": "VOLUNTEER", "is_verified": True, "verification_status": "VERIFIED"}
    res = await http.post(
        f"/api/v1/care-requests/{req.id}/assign",
        json={"assignee_id": "u-vol-pending", "candidate_dto": forged},
        headers=auth("u-family"),
    )
    assert res.status_code == 400
    assert "Ineligible Candidate" in res.json()["detail"]

@pytest.mark.asyncio
async def test_assignment_rejects_users_outside_circle(http: AsyncClient, db: AsyncSession, world):
    req = await _pending_request(db)
    for assignee in ["u-outsider", "u-coord", "u-nonexistent"]:
        res = await http.post(f"/api/v1/care-requests/{req.id}/assign", json={"assignee_id": assignee}, headers=auth("u-family"))
        assert res.status_code == 400, assignee

@pytest.mark.asyncio
async def test_assignment_to_verified_volunteer_and_circle_member(http: AsyncClient, db: AsyncSession, world):
    req = await _pending_request(db)
    res = await http.post(f"/api/v1/care-requests/{req.id}/assign", json={"assignee_id": "u-vol-ok"}, headers=auth("u-family"))
    assert res.status_code == 200
    assert res.json()["assigned_to_name"] == "Verified Volunteer"

    req2 = await _pending_request(db)
    res2 = await http.post(f"/api/v1/care-requests/{req2.id}/assign", json={"assignee_id": "u-family"}, headers=auth("u-parent"))
    assert res2.status_code == 200

@pytest.mark.asyncio
async def test_matching_ignores_client_candidate_pool_outside_test_env(http: AsyncClient, db: AsyncSession, world):
    req = await _pending_request(db)
    fake_pool = [{"id": "ghost", "name": "Ghost Helper", "type": "FAMILY", "parent_id": "pp-1"}]
    with patch.object(settings, "ENVIRONMENT", "development"):
        res = await http.post(f"/api/v1/care-requests/{req.id}/match", json={"custom_candidate_pool": fake_pool},
                              headers=auth("u-family"))
    assert res.status_code == 200
    ids = [c.get("candidate_id") or c.get("id") for c in res.json()["candidates"]]
    assert "ghost" not in ids
    assert "u-family" in ids

# --- Generic state override and destructive endpoints -----------------------------------

@pytest.mark.asyncio
async def test_generic_transition_is_admin_only(http: AsyncClient, db: AsyncSession, world):
    req = await _pending_request(db, status="IN_PROGRESS", assigned_to_id="u-vol-ok")
    for actor in ["u-parent", "u-family", "u-vol-ok", "u-coord"]:
        res = await http.post(f"/api/v1/care-requests/{req.id}/transition/COMPLETED", headers=auth(actor))
        assert res.status_code == 403, actor
    await db.refresh(req)
    assert req.status == "IN_PROGRESS"

@pytest.mark.asyncio
async def test_demo_reset_requires_admin(http: AsyncClient, world):
    assert (await http.post("/api/v1/demo/reset")).status_code == 401
    assert (await http.post("/api/v1/demo/reset", headers=auth("u-family"))).status_code == 403
    # Disabled by default even for administrators
    assert (await http.post("/api/v1/demo/reset", headers=auth("u-admin"))).status_code == 403
