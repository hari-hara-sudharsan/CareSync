import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.main import app
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.models.user import User
from app.models.parent import ParentProfile
from app.models.care_network import CareMember
from app.models.care_request import CareRequest
from app.models.medication import Medication
from app.models.appointment import Appointment
from app.trust.models import VerificationRecord, Complaint

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

@pytest_asyncio.fixture
async def sec_db() -> AsyncSession:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def http_client(sec_db: AsyncSession) -> AsyncClient:
    async def override_get_db():
        yield sec_db

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
    app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def seed_personas(sec_db: AsyncSession):
    """Seeds authentic multi-party CareSync personas with explicit DB relationships."""
    # 1. Parent A (Susan) and Parent B (George)
    user_parent_a = User(id="usr-p-a", phone="+15551110001", full_name="Susan Woodson", role="PARENT", is_active=True, is_verified=True)
    user_parent_b = User(id="usr-p-b", phone="+15551110002", full_name="George Miller", role="PARENT", is_active=True, is_verified=True)
    sec_db.add_all([user_parent_a, user_parent_b])
    await sec_db.flush()

    prof_a = ParentProfile(id="parent-a", user_id=user_parent_a.id, full_name="Susan Woodson", care_situation="INDEPENDENT", care_status="ALL_CLEAR")
    prof_b = ParentProfile(id="parent-b", user_id=user_parent_b.id, full_name="George Miller", care_situation="INDEPENDENT", care_status="ALL_CLEAR")
    sec_db.add_all([prof_a, prof_b])
    await sec_db.flush()

    # 2. Family Member A (David, connected to Parent A only)
    user_family_a = User(id="usr-fam-a", phone="+15552220001", full_name="David Woodson", role="FAMILY", is_active=True, is_verified=True)
    # Family Member B (Sarah, connected to Parent B only)
    user_family_b = User(id="usr-fam-b", phone="+15552220002", full_name="Sarah Miller", role="FAMILY", is_active=True, is_verified=True)
    sec_db.add_all([user_family_a, user_family_b])
    await sec_db.flush()

    cm_a = CareMember(
        parent_id=prof_a.id,
        user_id=user_family_a.id,
        name="David Woodson",
        phone="+15552220001",
        relationship="Son",
        role="PRIMARY_GUARDIAN",
        status="ACTIVE",
        permissions=["CHECK_INS", "MEDICATION", "APPOINTMENTS", "TRANSPORTATION", "ERRANDS", "CARE_HISTORY"],
        is_primary_contact=True,
    )
    cm_b = CareMember(
        parent_id=prof_b.id,
        user_id=user_family_b.id,
        name="Sarah Miller",
        phone="+15552220002",
        relationship="Daughter",
        role="FAMILY",
        status="ACTIVE",
        permissions=["CHECK_INS", "ERRANDS"],
        is_primary_contact=True,
    )
    sec_db.add_all([cm_a, cm_b])

    # 3. Volunteer 1 (Marcus) and Volunteer 2 (Priya)
    user_vol_1 = User(id="usr-vol-1", phone="+15553330001", full_name="Marcus Chen", role="VOLUNTEER", is_active=True, is_verified=True)
    user_vol_2 = User(id="usr-vol-2", phone="+15553330002", full_name="Priya Sharma", role="VOLUNTEER", is_active=True, is_verified=True)
    sec_db.add_all([user_vol_1, user_vol_2])

    # 4. Coordinator (Elena) and Admin (Arthur)
    user_coord = User(id="usr-coord-1", phone="+15554440001", full_name="Elena Rostova", role="COORDINATOR", is_active=True, is_verified=True)
    user_admin = User(id="usr-admin-1", phone="+15555550001", full_name="Arthur Pendelton", role="ADMIN", is_active=True, is_verified=True)
    sec_db.add_all([user_coord, user_admin])

    # 5. Inactive / Disabled User
    user_inactive = User(id="usr-disabled", phone="+15559990001", full_name="Disabled User", role="FAMILY", is_active=False, is_verified=False)
    sec_db.add(user_inactive)

    # 6. Seed Care Requests: Task 1 assigned to Volunteer 1, Task 2 unassigned
    req_task_1 = CareRequest(
        id="req-task-1",
        parent_id=prof_a.id,
        category="ERRANDS",
        title="Weekly Grocery Delivery",
        description="Grocery run at Whole Foods",
        priority="MEDIUM",
        status="ASSIGNED",
        requested_time="Today 4:00 PM",
        location_name="Whole Foods",
        address="123 Market St",
        assigned_to_id=user_vol_1.id,
        assigned_to_name=user_vol_1.full_name,
        assigned_to_role="VOLUNTEER",
    )
    req_task_2 = CareRequest(
        id="req-task-2",
        parent_id=prof_b.id,
        category="TRANSPORTATION",
        title="Doctor Ride",
        description="Transport to clinic",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
        requested_time="Tomorrow 10:00 AM",
        location_name="Clinic 101",
        address="456 Health Ave",
    )
    sec_db.add_all([req_task_1, req_task_2])

    # 7. Seed Medical & Appointment Records for Parent A
    med_1 = Medication(
        id="med-a-1",
        parent_id=prof_a.id,
        name="Lisinopril",
        dosage="10mg Tablet",
        instructions="Take with water",
        prescribing_doctor="Dr. Jenkins",
    )
    apt_1 = Appointment(
        id="apt-a-1",
        parent_id=prof_a.id,
        title="Cardiology Visit",
        provider_name="Dr. Jenkins",
        location_name="Heart Clinic",
        address="789 Medical Blvd",
        starts_at="Tomorrow 10:00 AM",
        status="CONFIRMED",
    )
    sec_db.add_all([med_1, apt_1])

    await sec_db.commit()

    return {
        "parent_a": user_parent_a,
        "parent_b": user_parent_b,
        "prof_a": prof_a,
        "prof_b": prof_b,
        "family_a": user_family_a,
        "family_b": user_family_b,
        "volunteer_1": user_vol_1,
        "volunteer_2": user_vol_2,
        "coordinator": user_coord,
        "admin": user_admin,
        "inactive": user_inactive,
        "req_task_1": req_task_1,
        "req_task_2": req_task_2,
    }

def get_auth_header(user_id: str) -> dict:
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}

# =========================================================================
# P0.1: Unauthenticated Access Guard Tests (HTTP 401)
# =========================================================================
@pytest.mark.asyncio
async def test_unauthenticated_requests_return_401(http_client: AsyncClient, seed_personas):
    """Unauthenticated requests to protected endpoints must fail with 401 Unauthorized."""
    endpoints = [
        ("GET", "/api/v1/auth/me"),
        ("GET", "/api/v1/parent/home"),
        ("GET", "/api/v1/care-requests"),
        ("GET", "/api/v1/volunteer/home"),
        ("GET", "/api/v1/trust/dashboard"),
    ]
    for method, path in endpoints:
        if method == "GET":
            res = await http_client.get(path)
        else:
            res = await http_client.post(path, json={})
        assert res.status_code == 401, f"Expected 401 for unauthenticated {path}, got {res.status_code}"

# =========================================================================
# P0.2: Authoritative Identity & Token Validation (JWT Tests)
# =========================================================================
@pytest.mark.asyncio
async def test_auth_me_resolves_authoritative_database_identity(http_client: AsyncClient, seed_personas):
    """GET /api/v1/auth/me returns authoritative DB identity matching JWT subject."""
    p = seed_personas
    res = await http_client.get("/api/v1/auth/me", headers=get_auth_header(p["parent_a"].id))
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == p["parent_a"].id
    assert data["role"] == "PARENT"
    assert data["full_name"] == "Susan Woodson"

@pytest.mark.asyncio
async def test_invalid_or_disabled_jwt_fails_401(http_client: AsyncClient, seed_personas):
    """Invalid, tampered, unknown, or disabled user JWT tokens return 401."""
    p = seed_personas
    # 1. Tampered token
    res_tampered = await http_client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert res_tampered.status_code == 401

    # 2. Unknown subject ID
    unknown_token = create_access_token(subject="usr-non-existent-999")
    res_unknown = await http_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {unknown_token}"})
    assert res_unknown.status_code == 401

    # 3. Disabled / Inactive user
    res_disabled = await http_client.get("/api/v1/auth/me", headers=get_auth_header(p["inactive"].id))
    assert res_disabled.status_code == 401

# =========================================================================
# P0.3 & P0.4: ABAC & Cross-Parent Data Isolation Tests
# =========================================================================
@pytest.mark.asyncio
async def test_parent_own_vs_cross_parent_isolation(http_client: AsyncClient, seed_personas):
    """Parent A can access own requests (200), but Parent A accessing Parent B returns 403."""
    p = seed_personas
    # Parent A -> Parent A care requests -> 200 OK
    res_own = await http_client.get(f"/api/v1/care-requests?parent_id={p['prof_a'].id}", headers=get_auth_header(p["parent_a"].id))
    assert res_own.status_code == 200

    # Parent A -> Parent B care requests -> 403 Forbidden
    res_cross = await http_client.get(f"/api/v1/care-requests?parent_id={p['prof_b'].id}", headers=get_auth_header(p["parent_a"].id))
    assert res_cross.status_code == 403
    assert "Access Denied" in res_cross.json()["detail"]

@pytest.mark.asyncio
async def test_family_connected_vs_unconnected_isolation(http_client: AsyncClient, seed_personas):
    """Family Member A can access connected Parent A (200), but accessing unconnected Parent B returns 403."""
    p = seed_personas
    # Family A -> Connected Parent A -> 200 OK
    res_conn = await http_client.get(f"/api/v1/care-requests?parent_id={p['prof_a'].id}", headers=get_auth_header(p["family_a"].id))
    assert res_conn.status_code == 200

    # Family A -> Unconnected Parent B -> 403 Forbidden
    res_unconn = await http_client.get(f"/api/v1/care-requests?parent_id={p['prof_b'].id}", headers=get_auth_header(p["family_a"].id))
    assert res_unconn.status_code == 403

# =========================================================================
# P0.5: Volunteer Data Minimization & Task Scoping Tests
# =========================================================================
@pytest.mark.asyncio
async def test_volunteer_assigned_task_vs_unassigned_task_access(http_client: AsyncClient, seed_personas):
    """Volunteer 1 can view assigned Task 1 (sanitized 200), but accessing unassigned Task 2 returns 403."""
    p = seed_personas
    # Volunteer 1 -> Assigned Task 1 -> 200 OK (Sanitized: no parent medical info)
    res_assigned = await http_client.get(f"/api/v1/care-requests/{p['req_task_1'].id}", headers=get_auth_header(p["volunteer_1"].id))
    assert res_assigned.status_code == 200
    data = res_assigned.json()
    assert data["id"] == p["req_task_1"].id
    assert "title" in data
    assert "location_name" in data
    assert "parent_name" not in data, "Parent name/identity must be sanitized for volunteer"
    assert "medical_history" not in data

    # Volunteer 1 -> Unassigned Task 2 -> 403 Forbidden
    res_unassigned = await http_client.get(f"/api/v1/care-requests/{p['req_task_2'].id}", headers=get_auth_header(p["volunteer_1"].id))
    assert res_unassigned.status_code == 403

    # Volunteer 2 -> Task 1 (assigned to Vol 1) -> 403 Forbidden
    res_other_vol = await http_client.get(f"/api/v1/care-requests/{p['req_task_1'].id}", headers=get_auth_header(p["volunteer_2"].id))
    assert res_other_vol.status_code == 403

@pytest.mark.asyncio
async def test_volunteer_cannot_access_clinical_records(http_client: AsyncClient, seed_personas):
    """Volunteers attempting to access parent medical or appointment endpoints receive 403."""
    p = seed_personas
    # Volunteer -> Medications endpoint -> 403 Forbidden
    res_med = await http_client.get(f"/api/v1/medications/today?parent_id={p['prof_a'].id}", headers=get_auth_header(p["volunteer_1"].id))
    assert res_med.status_code == 403

    # Volunteer -> Appointments endpoint -> 403 Forbidden
    res_apt = await http_client.get(f"/api/v1/appointments?parent_id={p['prof_a'].id}", headers=get_auth_header(p["volunteer_1"].id))
    assert res_apt.status_code == 403

# =========================================================================
# P0.6: Cross-Role Boundary Enforcements
# =========================================================================
@pytest.mark.asyncio
async def test_parent_cannot_access_volunteer_or_admin_endpoints(http_client: AsyncClient, seed_personas):
    """Parent role attempting to access Volunteer or Admin endpoints receives 403."""
    p = seed_personas
    # Parent -> Volunteer Home -> 403 Forbidden
    res_vol = await http_client.get("/api/v1/volunteer/home", headers=get_auth_header(p["parent_a"].id))
    assert res_vol.status_code == 403

    # Parent -> Admin Trust Dashboard -> 403 Forbidden
    res_adm = await http_client.get("/api/v1/trust/dashboard", headers=get_auth_header(p["parent_a"].id))
    assert res_adm.status_code == 403

@pytest.mark.asyncio
async def test_volunteer_cannot_access_admin_endpoints(http_client: AsyncClient, seed_personas):
    """Volunteer role attempting to access Admin endpoints receives 403."""
    p = seed_personas
    res = await http_client.get("/api/v1/trust/dashboard", headers=get_auth_header(p["volunteer_1"].id))
    assert res.status_code == 403

@pytest.mark.asyncio
async def test_admin_authorized_for_governance_dashboard(http_client: AsyncClient, seed_personas):
    """Admin role accesses trust dashboard successfully (200)."""
    p = seed_personas
    res = await http_client.get("/api/v1/trust/dashboard", headers=get_auth_header(p["admin"].id))
    assert res.status_code == 200
    assert "total_complaints_count" in res.json()
