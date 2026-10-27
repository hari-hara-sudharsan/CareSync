import os
# Explicit test configuration: enables test-only hooks and dev tooling gated on a local environment.
os.environ["ENVIRONMENT"] = "test"

import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from app.main import app
from app.core.database import Base, get_db
from app.api.deps import get_current_user
from app.models.user import User

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
async def async_db() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

from app.models.parent import ParentProfile
from app.models.care_network import CareMember

async def _seed_assignable_candidates(db: AsyncSession) -> None:
    """Real candidate records for assignment tests: two family members of p-1 and one verified volunteer."""
    from app.trust.models import VerificationRecord

    family = [
        ("c-1", "+15553330001", "David Woodson", "Son", ["TRANSPORTATION", "ERRANDS", "MEDICATION", "CHECK_INS"]),
        ("c-2", "+15553330002", "Sarah Woodson", "Daughter", ["TRANSPORTATION", "ERRANDS", "CHECK_INS"]),
    ]
    for user_id, phone, name, relationship, permissions in family:
        db.add(User(id=user_id, phone=phone, full_name=name, role="FAMILY", is_active=True, is_verified=True))
        await db.flush()
        db.add(CareMember(
            parent_id="p-1", user_id=user_id, name=name, phone=phone, relationship=relationship,
            role="FAMILY", status="ACTIVE", permissions=permissions,
        ))

    db.add(User(id="c-3", phone="+15553330003", full_name="Priya Sharma", role="VOLUNTEER", is_active=True, is_verified=True))
    await db.flush()
    db.add(VerificationRecord(user_id="c-3", status="VERIFIED", id_verified=True, background_checked=True))
    await db.flush()

@pytest_asyncio.fixture
async def client(async_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield async_db

    async def override_get_current_user():
        result = await async_db.execute(select(User).where(User.id == "usr-demo-1"))
        user = result.scalars().first()
        if not user:
            # Seed Parent user & profile unless the test already created an owner for p-1
            existing_profile = (await async_db.execute(select(ParentProfile).where(ParentProfile.id == "p-1"))).scalars().first()
            if not existing_profile:
                user_parent = User(
                    id="usr-parent-1",
                    phone="+15551234567",
                    full_name="Susan Woodson",
                    role="PARENT",
                    is_active=True,
                    is_verified=True,
                )
                async_db.add(user_parent)
                await async_db.flush()

                parent_prof = ParentProfile(
                    id="p-1",
                    user_id="usr-parent-1",
                    full_name="Susan Woodson",
                    care_situation="INDEPENDENT",
                    care_status="ALL_CLEAR",
                )
                async_db.add(parent_prof)
                await async_db.flush()

            # Seed Demo Caregiver user & active CareMember record
            user = User(
                id="usr-demo-1",
                phone="+15552345678",
                full_name="David Woodson",
                email="david.woodson@example.com",
                role="FAMILY",
                is_active=True,
                is_verified=True,
            )
            async_db.add(user)
            await async_db.flush()

            cm = CareMember(
                parent_id="p-1",
                user_id="usr-demo-1",
                name="David Woodson",
                phone="+15552345678",
                relationship="PRIMARY_GUARDIAN",
                role="PRIMARY_GUARDIAN",
                status="ACTIVE",
                permissions=["CHECK_INS", "MEDICATION", "APPOINTMENTS", "TRANSPORTATION", "ERRANDS", "CARE_HISTORY", "ALL"],
                is_primary_contact=True,
            )
            async_db.add(cm)
            await _seed_assignable_candidates(async_db)
            await async_db.commit()
            await async_db.refresh(user)
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()
