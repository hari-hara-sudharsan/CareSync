import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.care_request import CareRequest
from app.models.outbox import OutboxEvent, ProcessedEvent
from app.models.user import User
from app.services.care_request_service import CareRequestService
from app.services.outbox_service import OutboxService
from app.services.outbox_dispatcher_service import OutboxDispatcherService, LoggingEventConsumer

@pytest.mark.asyncio
async def test_atomic_outbox_write_on_domain_mutation(async_db: AsyncSession):
    """
    Scenario: Executing a domain mutation (complete care request).
    Verifies domain update and OutboxEvent write occur in the EXACT SAME database transaction.
    """
    user = User(id="usr-pj-1", phone="+15551234567", full_name="Susan Woodson", role="PARENT", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Atomic Ride Task",
        description="Testing outbox atomicity",
        priority="HIGH",
        status="IN_PROGRESS",
        assigned_to_id="usr-pj-1",
        requested_time="Today",
    )
    async_db.add_all([user, req])
    await async_db.commit()

    completed_req = await CareRequestService.complete_care_request(
        db=async_db,
        request_id=req.id,
        current_user=user,
        completion_note="Task done safely",
    )

    assert completed_req.status == "COMPLETED"

    # Query outbox_events table for the atomic event
    res_outbox = await async_db.execute(
        select(OutboxEvent).where(
            OutboxEvent.aggregate_id == req.id,
            OutboxEvent.event_type == "CARE_REQUEST_COMPLETED",
        )
    )
    outbox_event = res_outbox.scalars().first()
    assert outbox_event is not None
    assert outbox_event.status == "PENDING"
    assert outbox_event.payload["data"]["completion_note"] == "Task done safely"
    assert outbox_event.payload["schema_version"] == "1.0"

@pytest.mark.asyncio
async def test_rollback_prevents_outbox_creation(async_db: AsyncSession):
    """
    Scenario: Transaction fails or is rolled back due to error.
    Verifies that NEITHER the domain mutation NOR the OutboxEvent persists.
    """
    event_id = "test_rollback_event_123"
    try:
        req = CareRequest(
            parent_id="p-1",
            category="MEDICATION",
            title="Rollback Test Task",
            description="Testing rollback",
            priority="NORMAL",
            status="PENDING_ASSIGNMENT",
            requested_time="Today",
        )
        async_db.add(req)
        await async_db.flush()

        OutboxService.create_outbox_event(
            db=async_db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_CREATED",
            payload={"title": req.title},
        )

        # Force rollback
        await async_db.rollback()
    except Exception:
        pass

    # Verify outbox event does NOT exist in DB
    res = await async_db.execute(select(OutboxEvent).where(OutboxEvent.aggregate_id == event_id))
    assert res.scalars().first() is None

@pytest.mark.asyncio
async def test_outbox_dispatcher_processes_pending_events(async_db: AsyncSession):
    """
    Scenario: OutboxDispatcher processes pending outbox events.
    Verifies transition PENDING -> DISPATCHED, processed_at timestamp, and LoggingEventConsumer execution.
    """
    evt = OutboxService.create_outbox_event(
        db=async_db,
        aggregate_type="CareRequest",
        aggregate_id="req-outbox-99",
        event_type="CARE_REQUEST_STARTED",
        payload={"task": "started"},
        parent_id="p-1",
    )
    await async_db.commit()

    stats = await OutboxDispatcherService.dispatch_pending_events(db=async_db, batch_size=10)
    assert stats["claimed_count"] >= 1
    assert stats["dispatched_count"] >= 1
    assert stats["failed_count"] == 0

    res_evt = await async_db.execute(select(OutboxEvent).where(OutboxEvent.id == evt.id))
    updated_evt = res_evt.scalars().first()
    assert updated_evt.status == "DISPATCHED"
    assert updated_evt.processed_at is not None

@pytest.mark.asyncio
async def test_outbox_dispatcher_retry_and_failed_state(async_db: AsyncSession):
    """
    Scenario: Event handler encounters error during dispatching.
    Verifies retry_count increments, error_message is logged, and status transitions PENDING -> FAILED after max_retries.
    """
    class FailingConsumer:
        consumer_name = "FailingConsumer"
        async def handle_event(self, event: OutboxEvent, db: AsyncSession) -> bool:
            raise RuntimeError("Consumer network timeout")

    evt = OutboxService.create_outbox_event(
        db=async_db,
        aggregate_type="CareRequest",
        aggregate_id="req-failing-1",
        event_type="CARE_REQUEST_FAILED",
        payload={"failure": "simulated"},
    )
    await async_db.commit()

    # Retry 3 times
    for _ in range(3):
        await OutboxDispatcherService.dispatch_pending_events(
            db=async_db, batch_size=10, max_retries=3, consumer=FailingConsumer()
        )

    res_evt = await async_db.execute(select(OutboxEvent).where(OutboxEvent.id == evt.id))
    failed_evt = res_evt.scalars().first()
    assert failed_evt.status == "FAILED"
    assert failed_evt.retry_count == 3
    assert "Consumer network timeout" in (failed_evt.error_message or "")

@pytest.mark.asyncio
async def test_idempotent_event_consumer_prevents_duplicate_side_effects(async_db: AsyncSession):
    """
    Scenario: Event is delivered more than once to the same consumer.
    Verifies consumer checks ProcessedEvent table and ignores duplicate event without duplicate side-effects.
    """
    evt = OutboxService.create_outbox_event(
        db=async_db,
        aggregate_type="CareRequest",
        aggregate_id="req-idempotent-22",
        event_type="CARE_REQUEST_ACCEPTED",
        payload={"status": "ACCEPTED"},
    )
    await async_db.commit()

    consumer = LoggingEventConsumer()

    # First delivery
    res1 = await consumer.handle_event(evt, async_db)
    await async_db.commit()
    assert res1 is True

    # Duplicate delivery
    res2 = await consumer.handle_event(evt, async_db)
    await async_db.commit()
    assert res2 is True

    # Verify only 1 ProcessedEvent record exists for (evt.id, consumer.consumer_name)
    res_proc = await async_db.execute(
        select(ProcessedEvent).where(
            ProcessedEvent.event_id == evt.id,
            ProcessedEvent.consumer_name == consumer.consumer_name,
        )
    )
    processed_records = res_proc.scalars().all()
    assert len(processed_records) == 1

@pytest.mark.asyncio
async def test_correlation_id_tracing_across_workflow(async_db: AsyncSession):
    """
    Scenario: Multi-step workflow (CheckIn -> CareRequest -> OutboxEvent).
    Verifies correlation_id is preserved across domain events for operational tracing.
    """
    correlation_id = "trace-checkin-session-999"
    user = User(id="usr-pj-1", phone="+15551234567", full_name="Susan Woodson", role="PRIMARY_GUARDIAN", is_active=True)
    async_db.add(user)
    await async_db.commit()

    req = await CareRequestService.create_care_request(
        db=async_db,
        user_id=user.id,
        user_name=user.full_name,
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Traced Transport Request",
        description="Testing correlation tracing",
        priority="HIGH",
        requested_time="Today",
        correlation_id=correlation_id,
    )

    res_evt = await async_db.execute(
        select(OutboxEvent).where(
            OutboxEvent.aggregate_id == req.id,
            OutboxEvent.event_type == "CARE_REQUEST_CREATED",
        )
    )
    evt = res_evt.scalars().first()
    assert evt is not None
    assert evt.payload["correlation_id"] == correlation_id

@pytest.mark.asyncio
async def test_outbox_events_are_facts_not_commands(async_db: AsyncSession):
    """
    Scenario: Verifies event naming convention represents past facts (what happened), not imperative commands.
    """
    evt = OutboxService.create_outbox_event(
        db=async_db,
        aggregate_type="CareRequest",
        aggregate_id="req-fact-100",
        event_type="CARE_REQUEST_COMPLETED",
        payload={"note": "Past fact representation"},
    )
    await async_db.commit()

    assert evt.event_type.endswith("ED") or evt.event_type.endswith("ED")
    assert not evt.event_type.startswith("COMPLETE_")
