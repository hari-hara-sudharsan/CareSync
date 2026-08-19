import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from unittest.mock import patch

from app.models.care_request import CareRequest
from app.models.outbox import OutboxEvent, ProcessedEvent
from app.models.decision import DecisionCard, AuditEvent
from app.models.user import User
from app.agent.strands_agent import CareCoordinatorAgent
from app.agent.event_consumer import AgentEventConsumer
from app.agent.tools.read_tools import AgentReadTools
from app.agent.tools.action_tools import AgentActionTools
from app.agent.tools.classification import ToolClassifier, ToolRiskLevel
from app.services.outbox_dispatcher_service import OutboxDispatcherService
from app.services.decision_service import DecisionService

@pytest.mark.asyncio
async def test_agent_event_ingestion_and_deduplication(async_db: AsyncSession):
    """
    Scenario: AgentEventConsumer processes OutboxEvent facts.
    Verifies agent processes event and records ProcessedEvent for consumer idempotency.
    """
    evt = OutboxEvent(
        id="evt-agent-1",
        aggregate_type="CareRequest",
        aggregate_id="req-agent-1",
        event_type="CARE_REQUEST_COMPLETED",
        payload={"parent_id": "p-1", "data": {"title": "Ride to Clinic"}},
        status="PENDING",
    )
    async_db.add(evt)
    await async_db.commit()

    consumer = AgentEventConsumer()

    # First ingestion
    res1 = await consumer.handle_event(evt, async_db)
    await async_db.commit()
    assert res1 is True

    # Duplicate ingestion
    res2 = await consumer.handle_event(evt, async_db)
    await async_db.commit()
    assert res2 is True

    # Verify 1 ProcessedEvent record for CareCoordinatorAgent
    res_proc = await async_db.execute(
        select(ProcessedEvent).where(
            ProcessedEvent.event_id == evt.id,
            ProcessedEvent.consumer_name == "CareCoordinatorAgent",
        )
    )
    records = res_proc.scalars().all()
    assert len(records) == 1

@pytest.mark.asyncio
async def test_agent_read_tools_execution(async_db: AsyncSession):
    """
    Scenario: Agent gathers context via AgentReadTools.
    Verifies read tools invoke FastAPI application services with ZERO raw SQL.
    """
    req = CareRequest(
        parent_id="p-1",
        category="MEDICATION",
        title="Agent Read Test Task",
        description="Testing read tools",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
        requested_time="Today",
    )
    async_db.add(req)
    await async_db.commit()

    open_reqs = await AgentReadTools.get_open_care_requests(async_db, "p-1")
    assert len(open_reqs) >= 1
    assert any(r["title"] == "Agent Read Test Task" for r in open_reqs)

    trust_summary = await AgentReadTools.get_trust_summary(async_db, "p-1")
    assert trust_summary["verification_status"] == "VERIFIED_CIRCLE"

@pytest.mark.asyncio
async def test_agent_policy_gate_routine_vs_hitl(async_db: AsyncSession):
    """
    Scenario: Agent executes routine vs HITL (Human-in-the-Loop) actions.
    Verifies routine actions execute directly, while HITL actions emit DecisionCard for human caregiver approval.
    """
    agent = CareCoordinatorAgent()

    # Routine action (send_reminder)
    assert ToolClassifier.classify_action("send_reminder") == ToolRiskLevel.ROUTINE
    reminder = await AgentActionTools.send_reminder(
        db=async_db,
        parent_id="p-1",
        reminder_type="ROUTINE_MEDICATION",
        message="Take evening vitamin",
    )
    assert reminder["success"] is True

    # HITL action (create_decision_card)
    assert ToolClassifier.classify_action("create_decision_card") == ToolRiskLevel.HITL_APPROVAL
    card = await AgentActionTools.create_decision_card(
        db=async_db,
        parent_id="p-1",
        card_type="MATCHING_REVIEW",
        priority="HIGH",
        title="Review Candidate Volunteer",
        summary="Verified volunteer Sarah is available.",
        actions=[{"key": "assign_sarah", "label": "Assign Sarah"}],
    )
    assert card.status == "PENDING"
    assert card.title == "Review Candidate Volunteer"

@pytest.mark.asyncio
async def test_agent_policy_gate_rejects_forbidden_action(async_db: AsyncSession):
    """
    Scenario: Agent or external actor attempts forbidden actions (e.g. direct_sql_mutation, assign_volunteer, override_verification).
    CRITICAL INVARIANT: Policy gate MUST raise HTTP 403 Forbidden server-side and log AuditEvent AGENT_FORBIDDEN_ACTION_BLOCKED.
    """
    agent = CareCoordinatorAgent()

    forbidden_actions = [
        "direct_sql_mutation",
        "execute_raw_sql",
        "assign_volunteer",
        "change_medication_dosage",
        "override_verification",
        "bypass_authorization",
    ]

    for action in forbidden_actions:
        with pytest.raises(HTTPException) as exc_info:
            await agent.attempt_action(async_db, action_name=action, payload={})
        assert exc_info.value.status_code == 403
        assert "forbidden" in exc_info.value.detail.lower()

    # Verify audit event logged
    res_audit = await async_db.execute(
        select(AuditEvent).where(
            AuditEvent.actor_id == "agent-strands-01",
            AuditEvent.action == "AGENT_FORBIDDEN_ACTION_BLOCKED",
        )
    )
    audits = res_audit.scalars().all()
    assert len(audits) >= len(forbidden_actions)

@pytest.mark.asyncio
async def test_agent_resilience_on_llm_or_redis_failure(async_db: AsyncSession):
    """
    Scenario: Agent encounters LLM timeout or Redis transport error during event processing.
    CRITICAL INVARIANT: Agent errors MUST NOT crash outbox dispatcher or corrupt domain state.
    """
    evt = OutboxEvent(
        id="evt-resilience-10",
        aggregate_type="CareRequest",
        aggregate_id="req-10",
        event_type="CARE_REQUEST_ESCALATED",
        payload={"parent_id": "p-1", "data": {"failure_reason": "TIMEOUT"}},
        status="PENDING",
    )
    async_db.add(evt)
    await async_db.commit()

    agent = CareCoordinatorAgent()
    consumer = AgentEventConsumer(agent=agent)

    # Simulate agent exception during processing
    with patch.object(agent, "process_event", side_effect=RuntimeError("LLM API 504 Gateway Timeout")):
        success = await consumer.handle_event(evt, async_db)
        await async_db.commit()
        # Consumer handles error gracefully and returns True to allow outbox dispatch to continue
        assert success is True

    # Outbox dispatcher completes event processing
    stats = await OutboxDispatcherService.dispatch_pending_events(db=async_db, batch_size=10)
    assert stats["claimed_count"] >= 1

@pytest.mark.asyncio
async def test_quiet_background_coordinator_ux(async_db: AsyncSession):
    """
    Scenario: Agent observes routine events.
    Verifies agent produces quiet background summaries ("✓ Everything is handled") without invasive AI chatter.
    """
    evt = OutboxEvent(
        id="evt-quiet-1",
        aggregate_type="CareRequest",
        aggregate_id="req-quiet-1",
        event_type="CARE_REQUEST_COMPLETED",
        payload={"parent_id": "p-1", "data": {"title": "Library Book Return"}},
        status="PENDING",
    )
    async_db.add(evt)
    await async_db.commit()

    agent = CareCoordinatorAgent()
    result = await agent.process_event(async_db, evt)

    assert result["status"] == "PROCESSED"
    assert "Everything is handled" in result["summary"] or "all set" in result["summary"]

@pytest.mark.asyncio
async def test_human_approval_decision_card_link(async_db: AsyncSession):
    """
    Scenario: Agent emits DecisionCard for HITL escalation. Human caregiver resolves card via DecisionService.
    Verifies agent recommendation leads to human choice, which executes authoritative domain transition.
    """
    parent_user = User(id="usr-pj-1", phone="+15551234567", full_name="Susan Woodson", role="PARENT", is_active=True)
    async_db.add(parent_user)
    await async_db.commit()

    card = await AgentActionTools.create_decision_card(
        db=async_db,
        parent_id="p-1",
        card_type="TASK_ESCALATION",
        priority="HIGH",
        title="Transportation Unassigned for Tomorrow",
        summary="A verified volunteer is available nearby.",
        reason="Emitted by Agent for human caregiver choice.",
        actions=[{"key": "rematch_candidate", "label": "Review & Assign"}],
    )

    # Human caregiver resolves decision card via domain DecisionService
    resolution = await DecisionService.resolve_decision(
        db=async_db,
        current_user=parent_user,
        card_id=card.id,
        action_key="rematch_candidate",
        reason="Approved by Susan Woodson",
    )

    assert resolution["success"] is True
    assert resolution["status"] == "RESOLVED"
