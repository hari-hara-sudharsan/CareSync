import pytest
import time
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.main import app
from app.models.user import User
from app.models.care_request import CareRequest
from app.models.outbox import OutboxEvent, ProcessedEvent
from app.core.database import get_db
from app.core.security import create_access_token
from app.services.otp_service import otp_service
from app.services.outbox_dispatcher_service import OutboxDispatcherService, LoggingEventConsumer

@pytest.mark.asyncio
async def test_failure_scenario_otp_lockout_after_max_attempts(async_db: AsyncSession):
    """
    Failure Reality 1: 5 consecutive invalid OTP attempts locks challenge.
    Subsequent attempt returns TOO_MANY_ATTEMPTS.
    """
    phone = "+15559990001"
    
    # Request OTP
    success, msg, code = await otp_service.request_otp(phone)
    assert success is True

    # 5 wrong attempts
    for i in range(5):
        ok, error_msg, err_code = await otp_service.verify_otp(phone, "000000")
        assert ok is False

    # 6th attempt (even with correct or wrong code) must return TOO_MANY_ATTEMPTS
    ok, final_msg, final_code = await otp_service.verify_otp(phone, "000000")
    assert ok is False
    assert final_code == "TOO_MANY_ATTEMPTS" or "locked" in final_msg.lower()

@pytest.mark.asyncio
async def test_failure_scenario_jwt_expiration_and_unauthorized_rejection(async_db: AsyncSession):
    """
    Failure Reality 2: Expired or invalid JWT token is rejected with HTTP 401 Unauthorized.
    """
    async def override_db():
        yield async_db

    app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Invalid Bearer token
        res1 = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.jwt.token"})
        assert res1.status_code == 401

        from datetime import timedelta
        # Expired token (create token with negative timedelta)
        expired_token = create_access_token(subject="usr-test-expired", expires_delta=timedelta(seconds=-3600))
        res2 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert res2.status_code == 401

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_failure_scenario_unauthorized_role_access_rejection(async_db: AsyncSession):
    """
    Failure Reality 3: Parent role attempting to access Volunteer or Governance APIs returns HTTP 403.
    """
    parent = User(
        id="usr-parent-fail-1",
        phone="+15559990002",
        full_name="Parent Fail Test",
        role="PARENT",
        is_active=True,
        is_verified=True,
    )
    async_db.add(parent)
    await async_db.commit()

    async def override_db():
        yield async_db

    app.dependency_overrides[get_db] = override_db

    token = create_access_token(subject=parent.id)
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res1 = await client.get("/api/v1/volunteer/home", headers=headers)
        assert res1.status_code == 403

        res2 = await client.get("/api/v1/trust/dashboard", headers=headers)
        assert res2.status_code == 403

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_failure_scenario_outbox_idempotency_on_duplicate_event(async_db: AsyncSession):
    """
    Failure Reality 4: Duplicate processing of the same OutboxEvent is handled idempotently.
    Second handle_event call returns True without creating duplicate ProcessedEvent records.
    """
    event = OutboxEvent(
        id="evt-dup-test-1",
        aggregate_type="CareRequest",
        aggregate_id="cr-dup-1",
        event_type="CARE_REQUEST_CREATED",
        payload={"title": "Duplicate Event Test"},
        status="PENDING",
    )
    async_db.add(event)
    await async_db.commit()

    consumer = LoggingEventConsumer()

    # First handle
    ok1 = await consumer.handle_event(event, async_db)
    assert ok1 is True
    await async_db.commit()

    # Second handle (duplicate)
    ok2 = await consumer.handle_event(event, async_db)
    assert ok2 is True
    await async_db.commit()

    # Verify only 1 ProcessedEvent record exists
    res = await async_db.execute(
        select(ProcessedEvent).where(
            ProcessedEvent.event_id == event.id,
            ProcessedEvent.consumer_name == consumer.consumer_name,
        )
    )
    records = res.scalars().all()
    assert len(records) == 1

@pytest.mark.asyncio
async def test_failure_scenario_notification_failure_does_not_break_outbox_dispatch(async_db: AsyncSession):
    """
    Failure Reality 5: Outbox event dispatch completes cleanly even if notification delivery fails.
    """
    event = OutboxEvent(
        id="evt-notif-fail-1",
        aggregate_type="CareRequest",
        aggregate_id="cr-notif-fail-1",
        event_type="CARE_REQUEST_CREATED",
        payload={"title": "Notification Fail Test"},
        status="PENDING",
    )
    async_db.add(event)
    await async_db.commit()

    consumer = LoggingEventConsumer()
    # Mock notification_service to raise Exception
    async def failing_notify(*args, **kwargs):
        raise RuntimeError("SMS Gateway Connection Refused")

    consumer.notification_service.notify_from_outbox_event = failing_notify

    # Dispatch should handle exception gracefully and succeed
    dispatch_res = await OutboxDispatcherService.dispatch_pending_events(
        async_db, batch_size=10, max_retries=3, consumer=consumer
    )

    assert dispatch_res["dispatched_count"] >= 1
    await async_db.refresh(event)
    assert event.status == "DISPATCHED"

@pytest.mark.asyncio
async def test_failure_scenario_database_rollback_on_failed_transaction(async_db: AsyncSession):
    """
    Failure Reality 6: Transaction error causes clean rollback; no corrupt partial state persisted.
    """
    initial_res = await async_db.execute(select(CareRequest))
    initial_count = len(initial_res.scalars().all())

    try:
        async with async_db.begin_nested():
            req = CareRequest(
                id="cr-rollback-1",
                parent_id="non-existent-parent-fk-trigger-fail",
                category="ERRANDS",
                title="Rollback Test",
                description="Should roll back",
                requested_time="Tomorrow 10 AM",
            )
            async_db.add(req)
            # Intentionally raise an exception to simulate failure mid-transaction
            raise ValueError("Simulated DB Write Error")
    except ValueError:
        await async_db.rollback()

    final_res = await async_db.execute(select(CareRequest))
    final_count = len(final_res.scalars().all())
    assert final_count == initial_count
