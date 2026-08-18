import pytest
from httpx import AsyncClient
from fastapi import HTTPException
from app.core.rate_limiter import rate_limiter
from app.core.circuit_breaker import AgentCircuitBreaker, CircuitState
from app.trust.immutable_audit import ImmutableAuditGuard

def test_rate_limiting_protects_against_abuse():
    """Verifies that rate limiter raises HTTP 429 Too Many Requests when limits are exceeded."""
    limiter = rate_limiter
    
    # 3 allowed requests
    limiter.check_rate_limit("test_abuse", "user-1", max_requests=3, window_seconds=60)
    limiter.check_rate_limit("test_abuse", "user-1", max_requests=3, window_seconds=60)
    limiter.check_rate_limit("test_abuse", "user-1", max_requests=3, window_seconds=60)

    # 4th request -> HTTP 429
    with pytest.raises(HTTPException) as exc_info:
        limiter.check_rate_limit("test_abuse", "user-1", max_requests=3, window_seconds=60)

    assert exc_info.value.status_code == 429
    assert "Rate Limit Exceeded" in exc_info.value.detail

def test_append_only_audit_log_immutability():
    """Verifies that updating or deleting immutable audit records raises HTTP 405 Method Not Allowed."""
    with pytest.raises(HTTPException) as exc1:
        ImmutableAuditGuard.enforce_immutability("UPDATE", "AuditEvent")
    assert exc1.value.status_code == 405
    assert "strictly forbidden" in exc1.value.detail

    with pytest.raises(HTTPException) as exc2:
        ImmutableAuditGuard.enforce_immutability("DELETE", "TrustEvent")
    assert exc2.value.status_code == 405

def test_agent_circuit_breaker_trips_and_recovers():
    """Verifies agent circuit breaker trips after consecutive failures and recovers on success."""
    cb = AgentCircuitBreaker(failure_threshold=3, cooldown_seconds=1)
    assert cb.state == CircuitState.CLOSED
    assert cb.allow_execution() is True

    # 3 consecutive failures
    cb.record_failure()
    cb.record_failure()
    cb.record_failure()

    assert cb.state == CircuitState.OPEN
    assert cb.allow_execution() is False

    # Record success -> Restores CLOSED state
    cb.record_success()
    assert cb.state == CircuitState.CLOSED
    assert cb.allow_execution() is True

@pytest.mark.asyncio
async def test_structured_tracing_middleware(client: AsyncClient):
    """Verifies structured tracing middleware generates X-Trace-ID headers."""
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    assert "X-Trace-ID" in res.headers
    assert "X-Response-Time" in res.headers

@pytest.mark.asyncio
async def test_complaint_flooding_rate_limit_endpoint(client: AsyncClient):
    """Verifies rate limiting on POST /api/v1/trust/complaints endpoint."""
    payload = {
        "parent_id": "p-1",
        "target_user_id": "c-1",
        "category": "LATE_ARRIVAL",
        "safety_severity": "NONE",
        "description": "Late arrival test",
    }

    # First 3 succeed
    for _ in range(3):
        res = await client.post("/api/v1/trust/complaints", json=payload)
        assert res.status_code in [200, 429]

    # 4th receives 429 Too Many Requests if not already hit
    res_final = await client.post("/api/v1/trust/complaints", json=payload)
    assert res_final.status_code == 429
    assert "Rate Limit Exceeded" in res_final.json()["detail"]
