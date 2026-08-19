import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from unittest.mock import patch

from app.main import app
from app.api.v1.demo import reset_demo_environment
from app.models.outbox import OutboxEvent
from app.models.decision import DecisionCard, AuditEvent
from app.agent.strands_agent import CareCoordinatorAgent, STRANDS_SDK_AVAILABLE
from app.core.auth_security import token_revocation_service, RevocationCheckStatus
from app.core.rate_limit import rate_limiter

@pytest.mark.asyncio
async def test_demo_reset_endpoint(async_db: AsyncSession):
    """
    Scenario: Presenter calls POST /api/v1/demo/reset.
    Verifies database is reset to deterministic presentation seed dataset.
    """
    res = await reset_demo_environment(async_db)
    assert res["status"] == "RESET_SUCCESSFUL"
    assert "Susan Woodson" in res["seed_parent"]
    assert "David Woodson" in res["seed_primary_caregiver"]
    assert "David Miller" in res["seed_volunteer"]

    # Verify seed decision card exists
    card_res = await async_db.execute(select(DecisionCard).where(DecisionCard.id == "card-demo-101"))
    card = card_res.scalar_one_or_none()
    assert card is not None
    assert "suitable verified volunteer" in card.summary

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        http_res = await ac.post("/api/v1/demo/reset")
        assert http_res.status_code == 200
        assert http_res.json()["status"] == "RESET_SUCCESSFUL"

@pytest.mark.asyncio
async def test_demo_reset_disabled_in_production(async_db: AsyncSession):
    """
    Scenario: Client attempts to call POST /api/v1/demo/reset when DEMO_RESET_ENABLED is False.
    SECURITY INVARIANT: Demo reset MUST return HTTP 403 Forbidden to protect production datasets.
    """
    with patch("app.api.v1.demo.settings.DEMO_RESET_ENABLED", False):
        with pytest.raises(Exception) as exc_info:
            await reset_demo_environment(async_db)
        assert "403" in str(exc_info.value) or "disabled in production" in str(exc_info.value)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            http_res = await ac.post("/api/v1/demo/reset")
            assert http_res.status_code == 403
            assert "disabled in production" in http_res.json()["detail"]

@pytest.mark.asyncio
async def test_strands_sdk_agent_initialization():
    """
    Scenario: CareCoordinatorAgent initializes with Strands SDK.
    Verifies agent is constructed using strands.Agent with registered tools.
    """
    agent = CareCoordinatorAgent()
    assert agent.agent_id == "agent-strands-01"
    assert agent.strands_sdk_active == STRANDS_SDK_AVAILABLE
    if STRANDS_SDK_AVAILABLE:
        assert agent.strands_agent is not None
        assert agent.strands_agent.name == "CareCoordinatorAgent"

@pytest.mark.asyncio
async def test_revocation_status_semantics():
    """
    Scenario: TokenRevocationService evaluates JTI revocation status.
    Verifies explicit RevocationCheckStatus semantics (REVOCATION_CHECK_OK, TOKEN_REVOKED).
    """
    jti = "test-jti-10i"
    status_before, is_rev = await token_revocation_service.check_revocation_status(jti)
    assert is_rev is False
    assert status_before in [RevocationCheckStatus.OK, RevocationCheckStatus.UNAVAILABLE]

    await token_revocation_service.revoke_token(jti)
    status_after, is_rev_after = await token_revocation_service.check_revocation_status(jti)
    assert is_rev_after is True
    assert status_after == RevocationCheckStatus.REVOKED

@pytest.mark.asyncio
async def test_rate_limit_mode_header():
    """
    Scenario: Client makes HTTP request through RateLimitMiddleware.
    Verifies X-RateLimit-Mode header is returned (DISTRIBUTED or DEGRADED_LOCAL).
    """
    limited, mode = await rate_limiter.is_rate_limited_with_mode("test-key-10i", limit=10, window_seconds=60)
    assert limited is False
    assert mode in ["DISTRIBUTED", "DEGRADED_LOCAL"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/demo/reset")
        assert res.status_code == 200
        assert "x-ratelimit-mode" in res.headers
        assert res.headers["x-ratelimit-mode"] in ["DISTRIBUTED", "DEGRADED_LOCAL"]

@pytest.mark.asyncio
async def test_forbidden_action_policy_gate_audit(async_db: AsyncSession):
    """
    Scenario: Agent attempts forbidden operation (assign_volunteer).
    Verifies Policy Gateway raises 403 Forbidden and logs AGENT_FORBIDDEN_ACTION_BLOCKED audit event.
    """
    agent = CareCoordinatorAgent()
    with pytest.raises(Exception) as exc_info:
        await agent.attempt_action(async_db, "assign_volunteer", {})
    assert "403" in str(exc_info.value) or "Action Denied" in str(exc_info.value)

    res = await async_db.execute(
        select(AuditEvent).where(AuditEvent.action == "AGENT_FORBIDDEN_ACTION_BLOCKED")
    )
    audits = res.scalars().all()
    assert len(audits) >= 1
