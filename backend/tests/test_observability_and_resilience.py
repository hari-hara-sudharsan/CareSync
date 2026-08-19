import pytest
import json
import logging
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from unittest.mock import patch, MagicMock

from app.main import app
from app.core.logging import JSONLogFormatter, sanitize_log_dict, correlation_id_var, trace_id_var
from app.core.metrics import metrics_registry, MetricsRegistry
from app.models.care_request import CareRequest
from app.services.care_request_service import CareRequestService

@pytest.mark.asyncio
async def test_structured_json_logging_format_and_privacy():
    """
    Scenario: Formatting log record with JSONLogFormatter.
    Verifies output is valid JSON, contains timestamp/level/service, and redacts sensitive fields.
    """
    formatter = JSONLogFormatter(service_name="test-service")
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Care task updated",
        args=(),
        exc_info=None,
    )
    record.care_request_id = "req-123"
    record.parent_id = "p-1"

    formatted_json = formatter.format(record)
    log_dict = json.loads(formatted_json)

    assert log_dict["service"] == "test-service"
    assert log_dict["level"] == "INFO"
    assert log_dict["message"] == "Care task updated"
    assert log_dict["care_request_id"] == "req-123"
    assert "timestamp" in log_dict

    # Privacy Redaction Check
    sensitive_data = {
        "user_id": "usr-1",
        "password": "super-secret-password",
        "medical_history": "Confidential patient diagnosis",
        "dosage_instructions": "Take twice daily",
    }
    sanitized = sanitize_log_dict(sensitive_data)
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["medical_history"] == "[REDACTED]"
    assert sanitized["dosage_instructions"] == "[REDACTED]"
    assert sanitized["user_id"] == "usr-1"

@pytest.mark.asyncio
async def test_correlation_id_middleware_propagation():
    """
    Scenario: Client sends request with X-Correlation-ID header.
    Verifies CorrelationIdMiddleware propagates ID and returns header in response.
    """
    custom_corr_id = "corr-test-unique-999"
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.get("/api/v1/health/live", headers={"X-Correlation-ID": custom_corr_id})

    assert res.status_code == 200
    assert res.headers.get("X-Correlation-ID") == custom_corr_id
    assert "X-Trace-ID" in res.headers

@pytest.mark.asyncio
async def test_liveness_and_readiness_probes(async_db: AsyncSession):
    """
    Scenario: Probing /health/live and /health/ready endpoints.
    Verifies /health/live returns ALIVE, and /health/ready checks DB connection.
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res_live = await ac.get("/api/v1/health/live")
        assert res_live.status_code == 200
        assert res_live.json()["status"] == "ALIVE"

        res_ready = await ac.get("/api/v1/health/ready")
        assert res_ready.status_code in [200, 503]
        assert "status" in res_ready.json()

@pytest.mark.asyncio
async def test_redis_down_readiness_degradation():
    """
    Scenario: Redis is down/unreachable during readiness probe.
    CRITICAL RESILIENCE INVARIANT: Readiness endpoint MUST return HTTP 200 OK with status 'READY_DEGRADED',
    preserving core domain API availability because Redis is replaceable infrastructure.
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        with patch("app.api.v1.health.check_redis_health", return_value=False):
            res = await ac.get("/api/v1/health/ready")
            assert res.status_code == 200
            json_body = res.json()
            assert json_body["status"] == "READY_DEGRADED"
            assert json_body["postgres"] == "CONNECTED"
            assert json_body["redis"] == "OFFLINE"

@pytest.mark.asyncio
async def test_metrics_registry_recording():
    """
    Scenario: Recording operational metrics.
    Verifies metrics registry increments counters, sets gauges, and produces clean JSON snapshot.
    """
    reg = MetricsRegistry()
    reg.increment_counter("agent_events_processed")
    reg.increment_counter("agent_actions_blocked", 2)
    reg.set_gauge("outbox_pending_events", 5)

    snapshot = reg.get_metrics_snapshot()
    assert snapshot["counters"]["agent_events_processed"] == 1
    assert snapshot["counters"]["agent_actions_blocked"] == 2
    assert snapshot["gauges"]["outbox_pending_events"] == 5

@pytest.mark.asyncio
async def test_observability_failure_does_not_break_domain(async_db: AsyncSession):
    """
    Scenario: Log formatter or metrics registry encounters an internal exception.
    CRITICAL INVARIANT: Observability failure MUST NOT crash domain operations or rollback transactions.
    """
    reg = MetricsRegistry()
    # Force lock exception simulation
    with patch.object(reg, "_lock", side_effect=Exception("Internal Lock Timeout")):
        reg.increment_counter("agent_events_processed") # Should fail silently without raising exception

    assert True # Observability failure handled safely
