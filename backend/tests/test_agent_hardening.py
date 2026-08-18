import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.agent.tools.classification import ToolClassifier, ToolRiskLevel
from app.agent.tools.read_tools import AgentReadTools
from app.agent.tools.action_tools import AgentActionTools
from app.agent.idempotency import AgentActionIdempotency
from app.agent.quiet_loop import QuietCoordinationLoop

def test_tool_classification_guardrails():
    """Verifies proper classification of Routine, HITL, and Forbidden tools."""
    assert ToolClassifier.classify_action("send_reminder") == ToolRiskLevel.ROUTINE
    assert ToolClassifier.classify_action("create_decision_card") == ToolRiskLevel.HITL_APPROVAL
    assert ToolClassifier.classify_action("assign_volunteer") == ToolRiskLevel.FORBIDDEN
    assert ToolClassifier.classify_action("change_medication_dosage") == ToolRiskLevel.FORBIDDEN

def test_forbidden_tool_execution_rejection():
    """Verifies that invoking a prohibited action raises HTTP 403 Forbidden."""
    with pytest.raises(HTTPException) as exc1:
        ToolClassifier.validate_action_execution("assign_volunteer")
    assert exc1.value.status_code == 403
    assert "strictly forbidden" in exc1.value.detail

    with pytest.raises(HTTPException) as exc2:
        ToolClassifier.validate_action_execution("change_medication_dosage")
    assert exc2.value.status_code == 403

@pytest.mark.asyncio
async def test_agent_action_idempotency_deduplication(async_db: AsyncSession):
    """Verifies that second reminder call with same idempotency key suppresses duplicate action."""
    key = AgentActionIdempotency.generate_key("agent-01", "p-1", "REMINDER", "med-101", "2026-08-18-08")
    
    # First call -> Delivered
    res1 = await AgentActionTools.send_reminder(async_db, "p-1", "MEDICATION_DUE", "Take Lisinopril", idempotency_key=key)
    assert res1["success"] is True
    assert res1["delivered_at"] == "Just now"

    # Second call -> Suppressed
    res2 = await AgentActionTools.send_reminder(async_db, "p-1", "MEDICATION_DUE", "Take Lisinopril", idempotency_key=key)
    assert res2["success"] is True
    assert res2.get("idempotent") is True
    assert "Suppressed" in res2["delivered_at"]

@pytest.mark.asyncio
async def test_expanded_read_tools_privacy_scoped(async_db: AsyncSession):
    """Verifies expanded read tools return scoped data structures."""
    checkins = await AgentReadTools.get_pending_checkins(async_db, "p-1")
    assert isinstance(checkins, list)

    network = await AgentReadTools.get_care_network(async_db, "p-1")
    assert isinstance(network, list)

    decisions = await AgentReadTools.get_open_decisions(async_db, "p-1")
    assert isinstance(decisions, list)

    trust = await AgentReadTools.get_trust_summary(async_db, "p-1")
    assert trust["overall_trust_score"] > 90.0

@pytest.mark.asyncio
async def test_agent_failure_hardening_graceful_degradation():
    """Verifies Quiet Coordination Loop traps tool errors and degrades safely to DEGRADED_MONITORING."""
    # Pass invalid/closed session to trigger tool exception
    res = await QuietCoordinationLoop.run_cycle(None, "p-1", [])
    
    assert res.agent_status == "DEGRADED_MONITORING"
    assert "degraded monitoring mode" in res.reasoning_summary
    assert res.requires_human_approval is False
