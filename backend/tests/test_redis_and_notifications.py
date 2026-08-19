import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from unittest.mock import patch

from app.models.care_request import CareRequest
from app.models.outbox import OutboxEvent
from app.models.notification import NotificationRecord
from app.models.user import User
from app.core.redis import check_redis_health, publish_redis_event
from app.services.care_request_service import CareRequestService
from app.services.event_transport_service import RedisEventTransport
from app.services.notification_service import DevelopmentNotificationAdapter, NotificationService
from app.services.outbox_dispatcher_service import OutboxDispatcherService

@pytest.mark.asyncio
async def test_redis_healthcheck_and_connection():
    """
    Scenario: Healthcheck function executes against Redis connection.
    Verifies it returns True (when Redis online) or False (offline) without crashing app.
    """
    health = await check_redis_health()
    assert isinstance(health, bool)

@pytest.mark.asyncio
async def test_redis_offline_fallback_preserves_outbox(async_db: AsyncSession):
    """
    Scenario: Redis server is completely down or unreachable.
    CRITICAL INVARIANT: Domain mutation and PostgreSQL Outbox insertion MUST succeed,
    and outbox event MUST remain durable in database. Redis failure NEVER breaks CareSync domain.
    """
    user = User(id="usr-pj-1", phone="+15551234567", full_name="Susan Woodson", role="PARENT", is_active=True)
    req = CareRequest(
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Redis Offline Safety Test",
        description="Testing domain safety when redis is down",
        priority="HIGH",
        status="IN_PROGRESS",
        assigned_to_id="usr-pj-1",
        requested_time="Today",
    )
    async_db.add_all([user, req])
    await async_db.commit()

    # Mock Redis publish to raise connection error
    with patch("app.core.redis.publish_redis_event", side_effect=ConnectionError("Redis connection refused")):
        completed_req = await CareRequestService.complete_care_request(
            db=async_db,
            request_id=req.id,
            current_user=user,
            completion_note="Completed despite redis offline",
        )
        assert completed_req.status == "COMPLETED"

        # Outbox dispatch gracefully continues
        stats = await OutboxDispatcherService.dispatch_pending_events(db=async_db, batch_size=10)
        assert stats["claimed_count"] >= 1

    # Verify outbox event in PostgreSQL is safely DISPATCHED
    res_outbox = await async_db.execute(
        select(OutboxEvent).where(
            OutboxEvent.aggregate_id == req.id,
            OutboxEvent.event_type == "CARE_REQUEST_COMPLETED",
        )
    )
    outbox_evt = res_outbox.scalars().first()
    assert outbox_evt is not None
    assert outbox_evt.status == "DISPATCHED"

@pytest.mark.asyncio
async def test_redis_event_transport_publishing(async_db: AsyncSession):
    """
    Scenario: Publishing outbox event payload via RedisEventTransport.
    Verifies transport returns boolean result safely.
    """
    evt = OutboxEvent(
        id="evt-redis-100",
        aggregate_type="CareRequest",
        aggregate_id="req-100",
        event_type="CARE_REQUEST_STARTED",
        payload={"data": {"title": "Started Ride"}},
        status="PENDING",
    )

    transport = RedisEventTransport()
    res = await transport.publish(evt)
    assert isinstance(res, bool)

@pytest.mark.asyncio
async def test_notification_service_development_adapter(async_db: AsyncSession):
    """
    Scenario: NotificationService receives outbox event and invokes DevelopmentNotificationAdapter.
    Verifies NotificationRecord is persisted with status 'SENT' and delivery details.
    """
    evt = OutboxEvent(
        id="evt-notif-1",
        aggregate_type="CareRequest",
        aggregate_id="req-escalated-50",
        event_type="CARE_REQUEST_ESCALATED",
        payload={"parent_id": "p-1", "data": {"failure_reason": "UNABLE_TO_COMPLETE"}},
        status="PENDING",
    )

    notif_service = NotificationService(adapter=DevelopmentNotificationAdapter())
    record = await notif_service.notify_from_outbox_event(db=async_db, event=evt)
    await async_db.commit()

    assert record is not None
    assert record.event_id == "evt-notif-1"
    assert record.recipient_id == "p-1"
    assert record.notification_type == "PUSH"
    assert record.status == "SENT"
    assert "human approval" in record.body.lower()

@pytest.mark.asyncio
async def test_notification_consumer_idempotency_prevents_duplicate_sends(async_db: AsyncSession):
    """
    Scenario: Outbox event is processed twice by NotificationService.
    Verifies duplicate delivery attempt for (event_id, recipient_id, notification_type) is safely ignored.
    """
    evt = OutboxEvent(
        id="evt-notif-dup-2",
        aggregate_type="CareRequest",
        aggregate_id="req-completed-60",
        event_type="CARE_REQUEST_COMPLETED",
        payload={"parent_id": "p-1", "data": {"title": "Dr Appointment Ride"}},
        status="PENDING",
    )

    notif_service = NotificationService(adapter=DevelopmentNotificationAdapter())

    # First delivery
    rec1 = await notif_service.notify_from_outbox_event(db=async_db, event=evt)
    await async_db.commit()
    assert rec1 is not None

    # Duplicate delivery attempt
    rec2 = await notif_service.notify_from_outbox_event(db=async_db, event=evt)
    await async_db.commit()
    assert rec2 is not None
    assert rec2.id == rec1.id # Returned same existing record without duplicate insertion

    # Verify only 1 NotificationRecord in database
    res = await async_db.execute(
        select(NotificationRecord).where(
            NotificationRecord.event_id == evt.id,
            NotificationRecord.recipient_id == "p-1",
            NotificationRecord.notification_type == "PUSH",
        )
    )
    records = res.scalars().all()
    assert len(records) == 1

@pytest.mark.asyncio
async def test_notification_failure_does_not_corrupt_domain_transaction(async_db: AsyncSession):
    """
    Scenario: External notification adapter throws an exception during delivery attempt.
    CRITICAL INVARIANT: Notification exception MUST NOT corrupt domain state or outbox event dispatch.
    """
    class CrashingNotificationAdapter:
        async def send_notification(self, **kwargs) -> NotificationRecord:
            raise RuntimeError("Notification provider API down 503")

    evt = OutboxEvent(
        id="evt-crash-notif-99",
        aggregate_type="CareRequest",
        aggregate_id="req-99",
        event_type="CHECK_IN_SUBMITTED",
        payload={"parent_id": "p-1", "data": {"status_summary": "All good"}},
        status="PENDING",
    )
    async_db.add(evt)
    await async_db.commit()

    crashing_service = NotificationService(adapter=CrashingNotificationAdapter())

    # Dispatch event with crashing notification adapter
    with patch("app.services.outbox_dispatcher_service.NotificationService", return_value=crashing_service):
        stats = await OutboxDispatcherService.dispatch_pending_events(db=async_db, batch_size=10)
        assert stats["dispatched_count"] >= 1

    # Verify outbox event is successfully DISPATCHED
    res_evt = await async_db.execute(select(OutboxEvent).where(OutboxEvent.id == evt.id))
    updated_evt = res_evt.scalars().first()
    assert updated_evt.status == "DISPATCHED"
