import logging
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.outbox import OutboxEvent
from app.models.decision import AuditEvent
from app.agent.tools.read_tools import AgentReadTools
from app.agent.tools.action_tools import AgentActionTools
from app.agent.tools.classification import ToolClassifier, ToolRiskLevel

logger = logging.getLogger(__name__)

QUIET_COORDINATOR_PROMPT = """
You are CareSync's Care Coordinator Agent — a quiet, reassuring background care coordinator.
Your signature philosophy: "✓ Everything is handled."
Principles:
1. Intelligence, not executive authority. Backend domain services are authoritative.
2. Never speak invasively to the user. Present concise decision cards only when human choice is required.
3. Zero direct database mutation. Always execute via policy-gated action tools.
4. If an action is FORBIDDEN or requires HITL (Human-in-the-Loop), generate a DecisionCard for caregiver review.
"""

class CareCoordinatorAgent:
    """
    Care Coordinator Agent (Strands SDK Integration Seam).
    Controlled intelligence layer observing outbox events, executing policy-gated read & action tools,
    and preserving strict human-in-the-loop boundaries without business executive authority.
    """
    def __init__(self, agent_id: str = "agent-strands-01"):
        self.agent_id = agent_id
        self.system_prompt = QUIET_COORDINATOR_PROMPT

    async def process_event(self, db: AsyncSession, event: OutboxEvent) -> Dict[str, Any]:
        event_type = event.event_type
        payload = event.payload.get("data", {}) if isinstance(event.payload, dict) else {}
        parent_id = event.payload.get("parent_id", "p-1") if isinstance(event.payload, dict) else "p-1"
        correlation_id = event.payload.get("correlation_id", event.id) if isinstance(event.payload, dict) else event.id

        logger.info(f"[{self.agent_id}] Observing Event '{event_type}' (Correlation ID: '{correlation_id}')")

        # 1. Read-Only Context Observation via Application Service Tools (NO DIRECT SQL)
        open_requests = await AgentReadTools.get_open_care_requests(db, parent_id)
        due_meds = await AgentReadTools.get_due_medications(db, parent_id)
        pending_decisions = await AgentReadTools.get_open_decisions(db, parent_id)

        # 2. Reason & Determine Required Action
        if "ESCALATED" in event_type or "FAILED" in event_type or "TIMEOUT" in event_type:
            # Human-in-the-loop escalation requirement
            risk = ToolClassifier.classify_action("create_decision_card")
            card = await AgentActionTools.create_decision_card(
                db=db,
                parent_id=parent_id,
                card_type="TASK_ESCALATION",
                priority="HIGH",
                title=f"Attention Required: {payload.get('failure_reason', 'Task Issue')}",
                summary="A care request requires human caregiver choice (retry, reassign, or cancel).",
                reason=f"Event '{event_type}' observed by Care Coordinator Agent.",
                actions=[
                    {"key": "rematch_candidate", "label": "Find New Caregiver"},
                    {"key": "cancel_request", "label": "Cancel Request"},
                ],
                idempotency_key=f"agent-card-{event.id}",
            )
            return {
                "event_id": event.id,
                "event_type": event_type,
                "reasoning": "Task escalation requires human decision. Generated DecisionCard.",
                "summary": "Your decision is needed for a care task issue.",
                "tool_executed": "create_decision_card",
                "risk_level": risk.value,
                "status": "HITL_ESCALATED",
                "card_id": card.id,
            }

        elif "COMPLETED" in event_type:
            # Routine confirmation reminder
            risk = ToolClassifier.classify_action("send_reminder")
            result = await AgentActionTools.send_reminder(
                db=db,
                parent_id=parent_id,
                reminder_type="TASK_COMPLETION_CONFIRMATION",
                message="Care task complete. Please confirm completion when convenient.",
                idempotency_key=f"agent-reminder-{event.id}",
            )
            return {
                "event_id": event.id,
                "event_type": event_type,
                "reasoning": "Task completed by caregiver. Sent routine parent confirmation reminder.",
                "summary": "✓ You're all set — Everything important is handled for today.",
                "tool_executed": "send_reminder",
                "risk_level": risk.value,
                "status": "PROCESSED",
                "result": result,
            }

        elif "CHECK_IN" in event_type:
            # Routine check-in acknowledgment
            return {
                "event_id": event.id,
                "event_type": event_type,
                "reasoning": "Parent check-in recorded. No escalation needed.",
                "summary": "✓ Everything is handled for today.",
                "tool_executed": "none",
                "risk_level": ToolRiskLevel.ROUTINE.value,
                "status": "PROCESSED",
            }

        return {
            "event_id": event.id,
            "event_type": event_type,
            "reasoning": "Observed background fact. No active coordination intervention required.",
            "summary": "✓ You're all set — Everything important is handled for today.",
            "tool_executed": "none",
            "risk_level": ToolRiskLevel.ROUTINE.value,
            "status": "PROCESSED",
        }

    async def attempt_action(self, db: AsyncSession, action_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Attempts to execute a named action tool through the ToolClassifier policy gate.
        If action is FORBIDDEN, blocks execution, logs AuditEvent, and raises 403.
        """
        try:
            ToolClassifier.validate_action_execution(action_name)
        except HTTPException as exc:
            # Log forbidden action block audit event
            audit = AuditEvent(
                actor_id=self.agent_id,
                actor_name="CareSync Agent",
                action="AGENT_FORBIDDEN_ACTION_BLOCKED",
                resource_type="ToolGate",
                details={"attempted_action": action_name, "reason": exc.detail},
            )
            db.add(audit)
            await db.commit()
            raise exc

        return {"status": "ALLOWED", "action_name": action_name}
