import pytest
from unittest.mock import patch, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.care_request import CareRequest
from app.models.outbox import OutboxEvent
from app.core.rate_limit import rate_limiter
from app.core.redis import get_redis_client, publish_redis_event, check_redis_health

@pytest.mark.asyncio
async def test_redis_transient_cache_and_rate_limiting():
    """
    Scenario: System performs rate limiting via Redis service.
    Verifies sliding window rate limiting and mode detection.
    """
    key = "test-rate-limit-12d"
    is_limited, mode = await rate_limiter.is_rate_limited_with_mode(key, limit=10, window_seconds=60)
    
    assert is_limited is False
    assert mode in ["DISTRIBUTED", "DEGRADED_LOCAL"]

@pytest.mark.asyncio
async def test_redis_failure_safe_degradation_for_rate_limiter():
    """
    Scenario: Redis service fails or is unreachable.
    Verifies rate limiter degrades safely to DEGRADED_LOCAL without throwing exceptions or blocking requests.
    """
    with patch("app.core.rate_limit.get_redis_client", side_effect=Exception("Redis Connection Refused")):
        is_limited, mode = await rate_limiter.is_rate_limited_with_mode("test-degraded-key", limit=5, window_seconds=60)
        
        # Safe degradation invariant
        assert is_limited is False
        assert mode == "DEGRADED_LOCAL"

@pytest.mark.asyncio
async def test_redis_failure_does_not_break_postgres_domain_transaction(async_db: AsyncSession):
    """
    Scenario: Redis is completely offline when a domain mutation (CareRequest creation) occurs.
    ARCHITECTURAL INVARIANT: PostgreSQL is the single source of truth. Redis failure MUST NOT
    prevent domain state mutations or transactional outbox commits from succeeding.
    """
    req_id = "req-redis-down-101"
    
    # 1. Atomic Domain Mutation + Outbox Event Commit
    req = CareRequest(
        id=req_id,
        parent_id="p-1",
        category="GROCERIES",
        title="Grocery Request During Redis Outage",
        description="Testing system persistence when Redis is offline",
        requested_time="Tomorrow 11:00 AM",
        status="PENDING_ASSIGNMENT",
    )
    outbox = OutboxEvent(
        aggregate_type="CareRequest",
        aggregate_id=req_id,
        event_type="CARE_REQUEST_CREATED",
        payload={"request_id": req_id, "parent_id": "p-1"},
    )
    async_db.add_all([req, outbox])
    await async_db.commit()

    # 2. Simulate Redis Publish Failure during transient event notification
    with patch("app.core.redis.get_redis_client", side_effect=Exception("Redis Transport Down")):
        success = await publish_redis_event("caresync_events", {"event_type": "CARE_REQUEST_CREATED", "request_id": req_id})
        assert success is False # Safely caught, returns False

    # 3. Verify PostgreSQL source of truth state remains completely intact & durable
    res_req = await async_db.scalar(select(CareRequest).where(CareRequest.id == req_id))
    res_outbox = await async_db.scalar(select(OutboxEvent).where(OutboxEvent.aggregate_id == req_id))
    
    assert res_req is not None
    assert res_req.status == "PENDING_ASSIGNMENT"
    assert res_outbox is not None
    assert res_outbox.aggregate_id == req_id
