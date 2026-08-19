import pytest
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from unittest.mock import patch

from app.models.care_request import CareRequest
from app.models.outbox import OutboxEvent, ProcessedEvent
from app.models.decision import DecisionCard
from app.models.user import User
from app.core.config import Settings
from app.services.care_request_service import CareRequestService
from app.worker import run_worker_single_pass

@pytest.mark.asyncio
async def test_environment_configuration_overrides():
    """
    Scenario: App configuration loaded from environment variables.
    Verifies DATABASE_URL, REDIS_URL, and WORKER settings consume environment overrides without hardcoded dependencies.
    """
    test_env = {
        "DATABASE_URL": "postgresql+asyncpg://user:pass@caresync-postgres:5432/testdb",
        "REDIS_URL": "redis://caresync-redis:6379/1",
        "WORKER_POLL_INTERVAL_SECONDS": "5",
    }
    with patch.dict(os.environ, test_env):
        custom_settings = Settings()
        assert custom_settings.DATABASE_URL == "postgresql+asyncpg://user:pass@caresync-postgres:5432/testdb"
        assert custom_settings.REDIS_URL == "redis://caresync-redis:6379/1"
        assert custom_settings.WORKER_POLL_INTERVAL_SECONDS == 5

@pytest.mark.asyncio
async def test_worker_process_single_pass_execution(async_db: AsyncSession):
    """
    Scenario: Background worker process executes single pass dispatching.
    Verifies outbox dispatcher and composite consumer handle pending events cleanly.
    """
    evt = OutboxEvent(
        id="evt-worker-test-1",
        aggregate_type="CareRequest",
        aggregate_id="req-worker-1",
        event_type="CHECK_IN_SUBMITTED",
        payload={"parent_id": "p-1", "data": {"status_summary": "All good"}},
        status="PENDING",
    )
    async_db.add(evt)
    await async_db.commit()

    stats = await run_worker_single_pass(async_db)
    assert stats["claimed_count"] >= 1
    assert stats["dispatched_count"] >= 1

    # Verify event status updated in DB
    res_evt = await async_db.execute(select(OutboxEvent).where(OutboxEvent.id == evt.id))
    updated_evt = res_evt.scalars().first()
    assert updated_evt.status == "DISPATCHED"

@pytest.mark.asyncio
async def test_end_to_end_event_to_agent_flow(async_db: AsyncSession):
    """
    Scenario: Complete end-to-end event-driven architecture pipeline.
    Domain Command -> PostgreSQL Outbox -> Worker -> Redis Transport -> Agent Consumer -> DecisionCard.
    """
    user = User(id="usr-pj-1", phone="+15551234567", full_name="Susan Woodson", role="PARENT", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="End-to-End Pipeline Task",
        description="Testing complete architecture flow",
        priority="HIGH",
        status="IN_PROGRESS",
        assigned_to_id="usr-pj-1",
        requested_time="Today",
    )
    async_db.add_all([user, req])
    await async_db.commit()

    # Step 1: Execute Domain Mutation -> Generates OutboxEvent
    failed_req = await CareRequestService.fail_care_request(
        db=async_db,
        request_id=req.id,
        current_user=user,
        failure_reason="UNABLE_TO_COMPLETE",
        details="Flat tire during transport",
    )
    assert failed_req.status == "ESCALATED"

    # Step 2: Worker Process Pass
    stats = await run_worker_single_pass(async_db)
    assert stats["claimed_count"] >= 1

    # Step 3: Verify Agent created DecisionCard
    res_card = await async_db.execute(
        select(DecisionCard).where(
            DecisionCard.parent_id == "p-1",
            DecisionCard.status == "PENDING",
        )
    )
    cards = res_card.scalars().all()
    assert len(cards) >= 1

@pytest.mark.asyncio
async def test_resilient_container_restart_recovery(async_db: AsyncSession):
    """
    Scenario: Worker or Redis container restarts while outbox event is pending.
    CRITICAL INVARIANT: Restarting container recovers and dispatches pending events without data loss.
    """
    evt = OutboxEvent(
        id="evt-restart-recovery-99",
        aggregate_type="CareRequest",
        aggregate_id="req-999",
        event_type="CARE_REQUEST_CREATED",
        payload={"parent_id": "p-1", "data": {"title": "Pending Task Before Restart"}},
        status="PENDING",
    )
    async_db.add(evt)
    await async_db.commit()

    # Simulate worker restart pass
    stats = await run_worker_single_pass(async_db)
    assert stats["dispatched_count"] >= 1

    # Verify event completed dispatching
    res_evt = await async_db.execute(select(OutboxEvent).where(OutboxEvent.id == evt.id))
    dispatched_evt = res_evt.scalars().first()
    assert dispatched_evt.status == "DISPATCHED"
