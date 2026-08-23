from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.decision import DecisionCard, AuditEvent
from app.models.care_request import CareRequest
from app.services.matching_engine.matching_service import MatchingEngineService
from app.agent.tools.classification import ToolClassifier
from app.agent.idempotency import AgentActionIdempotency

class AgentActionTools:
    """
    Controlled Action Tools for the CareSync Agent with Idempotency Guard.
    
    1. Validates Tool Safety Classification (Routine vs HITL vs Forbidden).
    2. Enforces Action Idempotency to prevent notification/decision spams.
    3. Logs every operation to the immutable AuditEvent stream.
    """

    @staticmethod
    async def create_decision_card(
        db: AsyncSession,
        parent_id: str,
        card_type: str,
        priority: str,
        title: str,
        summary: str,
        reason: Optional[str] = None,
        actions: Optional[List[Dict[str, Any]]] = None,
        related_entity_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> DecisionCard:
        ToolClassifier.validate_action_execution("create_decision_card")

        if idempotency_key:
            if await AgentActionIdempotency.is_already_executed(db, idempotency_key):
                # Return existing card
                res = await db.execute(select(DecisionCard).where(DecisionCard.parent_id == parent_id, DecisionCard.title == title))
                card = res.scalars().first()
                if card:
                    return card

        card = DecisionCard(
            parent_id=parent_id,
            related_entity_id=related_entity_id,
            type=card_type,
            priority=priority,
            status="PENDING",
            title=title,
            summary=summary,
            reason=reason or "Emitted by CareSync Agent during Quiet Coordination Loop.",
            actions=actions or [],
        )
        db.add(card)

        audit = AuditEvent(
            actor_id="agent-strands-01",
            actor_name="CareSync Agent",
            action="AGENT_DECISION_EMITTED",
            resource_type="DecisionCard",
            resource_id=card.id,
            details={"type": card_type, "priority": priority, "title": title},
        )
        db.add(audit)
        await db.commit()
        await db.refresh(card)

        if idempotency_key:
            await AgentActionIdempotency.record_execution(db, idempotency_key, "agent-strands-01", "create_decision_card", {"card_id": card.id})

        return card

    @staticmethod
    async def send_reminder(
        db: AsyncSession,
        parent_id: str,
        reminder_type: str,
        message: str,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        ToolClassifier.validate_action_execution("send_reminder")

        if idempotency_key:
            if await AgentActionIdempotency.is_already_executed(db, idempotency_key):
                return {
                    "success": True,
                    "reminder_type": reminder_type,
                    "message": message,
                    "delivered_at": "Suppressed (Duplicate Action)",
                    "idempotent": True,
                }

        audit = AuditEvent(
            actor_id="agent-strands-01",
            actor_name="CareSync Agent",
            action="AGENT_REMINDER_SENT",
            resource_type="Notification",
            details={"reminder_type": reminder_type, "message": message, "parent_id": parent_id},
        )
        db.add(audit)
        await db.commit()

        if idempotency_key:
            await AgentActionIdempotency.record_execution(db, idempotency_key, "agent-strands-01", "send_reminder", {"status": "delivered"})

        return {
            "success": True,
            "reminder_type": reminder_type,
            "message": message,
            "delivered_at": "Just now",
        }

    @staticmethod
    async def execute_prohibited_action(action_name: str) -> None:
        """Explicit wrapper to test and verify rejection of prohibited agent actions."""
        ToolClassifier.validate_action_execution(action_name)

    @staticmethod
    async def request_matching_recommendations(
        db: AsyncSession,
        request_id: str,
        candidate_pool: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        ToolClassifier.validate_action_execution("request_matching_recommendations")

        res = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
        req = res.scalars().first()
        if not req:
            return {"status": "ERROR", "message": f"CareRequest {request_id} not found."}

        recommendations = MatchingEngineService.match_candidates(req, candidate_pool)

        audit = AuditEvent(
            actor_id="agent-strands-01",
            actor_name="CareSync Agent",
            action="AGENT_MATCHING_REQUESTED",
            resource_type="CareRequest",
            resource_id=request_id,
            details={"strategy": recommendations.get("strategy"), "candidates_count": len(recommendations.get("candidates", []))},
        )
        db.add(audit)
        await db.commit()

        return recommendations
