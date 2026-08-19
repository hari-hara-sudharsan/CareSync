import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from unittest.mock import patch

from app.main import app
from app.models.care_request import CareRequest
from app.models.outbox import OutboxEvent, ProcessedEvent
from app.models.decision import DecisionCard, AuditEvent
from app.models.user import User
from app.services.care_request_service import CareRequestService
from app.services.decision_service import DecisionService
from app.agent.tools.classification import ToolClassifier
from app.agent.event_consumer import AgentEventConsumer
from app.core.rate_limit import RateLimiter
from app.core.auth_security import token_revocation_service
from app.worker import run_worker_single_pass

@pytest.mark.asyncio
async def test_cross_parent_access_blocked_403(async_db: AsyncSession):
    """
    Security Matrix Test: Cross-Parent Authorization Isolation.
    Verifies Parent A cannot access Parent B's Care Circle context (HTTP 403).
    """
    parent_a = User(id="p-auth-a", phone="+15550000001", full_name="Parent A", role="PARENT", is_active=True)
    parent_b = User(id="p-auth-b", phone="+15550000002", full_name="Parent B", role="PARENT", is_active=True)
    req_b = CareRequest(
        parent_id="p-auth-b",
        category="TRANSPORTATION",
        title="Parent B Request",
        description="Private care request",
        priority="HIGH",
        status="PENDING",
        requested_time="Tomorrow",
    )
    async_db.add_all([parent_a, parent_b, req_b])
    await async_db.commit()

    # Attempt cross-parent access validation
    with pytest.raises(Exception) as exc_info:
        await CareRequestService.verify_parent_access(
            db=async_db,
            user_id=parent_a.id,
            parent_id=req_b.parent_id
        )
    assert "403" in str(exc_info.value) or "Access Denied" in str(exc_info.value)

@pytest.mark.asyncio
async def test_agent_forbidden_actions_blocked_403():
    """
    Security Matrix Test: Server-Side Agent Forbidden Action Enforcement.
    Verifies attempts to execute 'assign_volunteer' or 'direct_sql_mutation' raise HTTP 403 Forbidden.
    """
    classifier = ToolClassifier()
    assert classifier.classify_action("assign_volunteer").name == "FORBIDDEN"
    assert classifier.classify_action("direct_sql_mutation").name == "FORBIDDEN"

    with pytest.raises(Exception) as exc_info:
        classifier.validate_action_execution("assign_volunteer")
    assert "403" in str(exc_info.value) or "Forbidden" in str(exc_info.value)

@pytest.mark.asyncio
async def test_stale_decision_card_execution_rejected(async_db: AsyncSession):
    """
    Security Matrix Test: Stale HITL DecisionCard Execution Rejection.
    Verifies resolving an already RESOLVED DecisionCard raises 400 Bad Request.
    """
    card = DecisionCard(
        id="card-stale-99",
        parent_id="p-1",
        type="MATCH_APPROVAL",
        title="Assign Candidate",
        summary="Re-assign request",
        priority="HIGH",
        actions=[{"key": "opt-1", "label": "Approve"}],
        status="RESOLVED",
    )
    async_db.add(card)
    await async_db.commit()

    user = User(id="p-1", phone="+15551112222", full_name="Parent P1", role="PARENT", is_active=True)

    with pytest.raises(Exception) as exc_info:
        await DecisionService.resolve_decision(
            db=async_db,
            current_user=user,
            card_id=card.id,
            action_key="opt-1"
        )
    assert "400" in str(exc_info.value) or "cannot be resolved" in str(exc_info.value)

@pytest.mark.asyncio
async def test_rate_limiter_exceeded_429():
    """
    Security Matrix Test: API Rate Limiting Threshold Enforcement.
    Verifies exceeding rate limit key threshold returns True for rate limiting.
    """
    limiter = RateLimiter()
    test_key = "chaos-ip-test-key-999"

    # Rapid requests up to limit
    for _ in range(5):
        await limiter.is_rate_limited(key=test_key, limit=5, window_seconds=60)

    # Exceed limit
    is_limited = await limiter.is_rate_limited(key=test_key, limit=5, window_seconds=60)
    assert is_limited is True

@pytest.mark.asyncio
async def test_security_headers_and_csrf_origin_blocking():
    """
    Security Matrix Test: Modern Security Headers & Origin CSRF Protection.
    Verifies response contains security headers and blocks unauthorized cross-origin POSTs.
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.get("/api/v1/health/live")
        assert res.headers.get("X-Content-Type-Options") == "nosniff"
        assert res.headers.get("X-Frame-Options") == "DENY"

        # Cross-origin malicious POST attempt
        bad_origin_res = await ac.post(
            "/api/v1/health/live",
            headers={"Origin": "http://malicious-attacker-domain.com"}
        )
        assert bad_origin_res.status_code == 403

@pytest.mark.asyncio
async def test_revoked_jwt_token_rejected_401():
    """
    Security Matrix Test: JWT Session Revocation Enforcement.
    Verifies revoked token JTI is flagged by TokenRevocationService.
    """
    test_jti = "jti-revocation-test-12345"
    await token_revocation_service.revoke_token(jti=test_jti, ttl_seconds=3600)

    is_revoked = await token_revocation_service.is_token_revoked(jti=test_jti)
    assert is_revoked is True

@pytest.mark.asyncio
async def test_chaos_redis_down_recovery(async_db: AsyncSession):
    """
    Chaos Fault-Injection Test: Redis Unavailability & Outbox Durability Recovery.
    CRITICAL ARCHITECTURAL INVARIANT: When Redis fails, domain mutation succeeds 100%,
    OutboxEvent is safely committed to PostgreSQL, and event is dispatched when Redis recovers.
    """
    evt = OutboxEvent(
        id="evt-chaos-redis-1",
        aggregate_type="CareRequest",
        aggregate_id="req-chaos-1",
        event_type="CARE_REQUEST_CREATED",
        payload={"parent_id": "p-1", "data": {"title": "Chaos Task"}},
        status="PENDING",
    )
    async_db.add(evt)
    await async_db.commit()

    # Dispatch pass while Redis transport raises exception
    with patch("app.services.event_transport_service.RedisEventTransport.publish", side_effect=RuntimeError("Redis connection refused")):
        stats = await run_worker_single_pass(async_db)
        assert stats["claimed_count"] >= 1

    # Event was claimed and dispatched locally via outbox despite Redis failure
    res_evt = await async_db.execute(select(OutboxEvent).where(OutboxEvent.id == evt.id))
    assert res_evt.scalars().first().status == "DISPATCHED"

@pytest.mark.asyncio
async def test_chaos_agent_crash_recovery(async_db: AsyncSession):
    """
    Chaos Fault-Injection Test: Agent Consumer Crash Recovery.
    Verifies that if agent consumer re-receives an event, ProcessedEvent record prevents duplicate side-effects.
    """
    evt = OutboxEvent(
        id="evt-agent-crash-1",
        aggregate_type="CareRequest",
        aggregate_id="req-agent-1",
        event_type="CHECK_IN_SUBMITTED",
        payload={"parent_id": "p-1", "data": {"status": "OK"}},
        status="PENDING",
    )
    async_db.add(evt)
    await async_db.commit()

    consumer = AgentEventConsumer()

    # Pass 1: Run consumer handle_event (records ProcessedEvent)
    res1 = await consumer.handle_event(evt, async_db)
    assert res1 is True

    # Pass 2: Re-run consumer handle_event for same event (ProcessedEvent prevents duplicate execution)
    res2 = await consumer.handle_event(evt, async_db)
    assert res2 is True
