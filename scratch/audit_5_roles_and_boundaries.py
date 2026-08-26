import asyncio
import sys
import os

sys.path.append(os.path.abspath("backend"))

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.main import app
from app.models.user import User
from app.core.database import get_db, Base
from app.core.security import create_access_token

ROLES_USERS = [
    {"phone": "+15550000001", "name": "Sarah Jenkins (Parent)", "role": "PARENT"},
    {"phone": "+15550000002", "name": "David Jenkins (Family)", "role": "FAMILY"},
    {"phone": "+15550000003", "name": "Elena Rostova (Volunteer)", "role": "VOLUNTEER"},
    {"phone": "+15550000004", "name": "Marcus Vance (Coordinator)", "role": "COORDINATOR"},
    {"phone": "+15550000005", "name": "System Admin (Admin)", "role": "ADMIN"},
]

async def run_audit():
    # Use memory database for 100% thread-safe audit
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    tokens = {}
    async with async_session() as session:
        for u_data in ROLES_USERS:
            user = User(
                id=f"usr-{u_data['role'].lower()}-audit-1",
                phone=u_data["phone"],
                full_name=u_data["name"],
                role=u_data["role"],
                is_active=True,
                is_verified=True,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            token = create_access_token(subject=user.id)
            tokens[u_data["role"]] = {"user_id": user.id, "phone": u_data["phone"], "token": token, "user": user}

    async def override_get_db():
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    print("=== 5-ROLE USERS & JWT TOKENS READY ===")
    for role, info in tokens.items():
        print(f"Role: {role:<12} Phone: {info['phone']:<15} ID: {info['user_id']}")

    print("\n=== STARTING 5-ROLE REAL HTTP SECURITY BOUNDARY AUDIT ===")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        print("\n--- 1. Unauthenticated Security Boundary Checks (HTTP 401) ---")
        for route in ["/api/v1/auth/me", "/api/v1/volunteer/home", "/api/v1/trust/dashboard", "/api/v1/settings", "/api/v1/notifications"]:
            res = await client.get(route)
            print(f"UNAUTHENTICATED GET {route:<28} -> HTTP {res.status_code} (Expected 401)")
            assert res.status_code == 401

        print("\n--- 2. Parent Role Access & Isolation Checks ---")
        p_headers = {"Authorization": f"Bearer {tokens['PARENT']['token']}"}
        res = await client.get("/api/v1/auth/me", headers=p_headers)
        print(f"PARENT GET /api/v1/auth/me          -> HTTP {res.status_code}, Role={res.json().get('role')}")
        assert res.status_code == 200 and res.json()["role"] == "PARENT"

        res = await client.get("/api/v1/volunteer/home", headers=p_headers)
        print(f"PARENT GET /api/v1/volunteer/home  -> HTTP {res.status_code} (Expected 403 Forbidden)")
        assert res.status_code == 403

        res = await client.get("/api/v1/trust/dashboard", headers=p_headers)
        print(f"PARENT GET /api/v1/trust/dashboard  -> HTTP {res.status_code} (Expected 403 Forbidden)")
        assert res.status_code == 403

        print("\n--- 3. Volunteer Role Access & Isolation Checks ---")
        v_headers = {"Authorization": f"Bearer {tokens['VOLUNTEER']['token']}"}
        res = await client.get("/api/v1/auth/me", headers=v_headers)
        print(f"VOLUNTEER GET /api/v1/auth/me       -> HTTP {res.status_code}, Role={res.json().get('role')}")
        assert res.status_code == 200 and res.json()["role"] == "VOLUNTEER"

        res = await client.get("/api/v1/volunteer/home", headers=v_headers)
        print(f"VOLUNTEER GET /api/v1/volunteer/home -> HTTP {res.status_code} (Expected 200 OK)")
        assert res.status_code == 200

        res = await client.get("/api/v1/trust/dashboard", headers=v_headers)
        print(f"VOLUNTEER GET /api/v1/trust/dashboard -> HTTP {res.status_code} (Expected 403 Forbidden)")
        assert res.status_code == 403

        print("\n--- 4. Family Role Access Checks ---")
        f_headers = {"Authorization": f"Bearer {tokens['FAMILY']['token']}"}
        res = await client.get("/api/v1/auth/me", headers=f_headers)
        print(f"FAMILY GET /api/v1/auth/me         -> HTTP {res.status_code}, Role={res.json().get('role')}")
        assert res.status_code == 200 and res.json()["role"] == "FAMILY"

        res = await client.get("/api/v1/volunteer/home", headers=f_headers)
        print(f"FAMILY GET /api/v1/volunteer/home     -> HTTP {res.status_code} (Expected 403 Forbidden)")
        assert res.status_code == 403

        print("\n--- 5. Coordinator & Admin Governance Access Checks ---")
        c_headers = {"Authorization": f"Bearer {tokens['COORDINATOR']['token']}"}
        res = await client.get("/api/v1/trust/dashboard", headers=c_headers)
        print(f"COORDINATOR GET /api/v1/trust/dashboard -> HTTP {res.status_code} (Expected 200 OK)")
        assert res.status_code == 200

        a_headers = {"Authorization": f"Bearer {tokens['ADMIN']['token']}"}
        res = await client.get("/api/v1/trust/dashboard", headers=a_headers)
        print(f"ADMIN GET /api/v1/trust/dashboard       -> HTTP {res.status_code} (Expected 200 OK)")
        assert res.status_code == 200

    app.dependency_overrides.clear()
    await engine.dispose()
    print("\n=== ALL 5-ROLE HTTP SECURITY BOUNDARY AUDITS PASSED 100% CLEANLY ===")

if __name__ == "__main__":
    asyncio.run(run_audit())
