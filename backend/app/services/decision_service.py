from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException, status

from app.models.decision import DecisionCard, AuditEvent
from app.models.care_request import CareRequest
from app.models.idempotency import IdempotencyRecord
from app.models.user import User
from app.api.deps import verify_parent_authorization
from app.core.authorization import CarePermission

class DecisionService:
    """
    Decision Inbox Domain Service for CareSync Family Workspace.
    
    1. Enforces parent authorization & context boundaries.
    2. Validates DecisionCard status and associated CareRequest state.
    3. Handles idempotent decision resolutions.
    4. Logs immutable AuditEvents for human choices.
    """

    @staticmethod
    async def get_pending_decisions(
        db: AsyncSession, current_user: User, parent_id: str
    ) -> List[Dict[str, Any]]:
        await verify_parent_authorization(parent_id, CarePermission.CHECK_INS, db, current_user)

        res = await db.execute(
            select(DecisionCard)
            .where(DecisionCard.parent_id == parent_id, DecisionCard.status == "PENDING")
            .order_by(desc(DecisionCard.created_at))
        )
        cards = res.scalars().all()

        return [
            {
                "id": c.id,
                "parent_id": c.parent_id,
                "type": c.type,
                "title": c.title,
                "summary": c.summary,
                "priority": c.priority,
                "status": c.status,
                "reason": c.reason,
                "actions": c.actions,
                "created_at": c.created_at,
            }
            for c in cards
        ]

    @staticmethod
    async def resolve_decision(
        db: AsyncSession,
        current_user: User,
        card_id: str,
        action_key: str,
        reason: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Step 1: Idempotency Check
        if idempotency_key:
            res_idemp = await db.execute(
                select(IdempotencyRecord).where(IdempotencyRecord.idempotency_key == idempotency_key)
            )
            existing_rec = res_idemp.scalars().first()
            if existing_rec:
                return existing_rec.response_body

        # Step 2: Fetch DecisionCard
        res_card = await db.execute(select(DecisionCard).where(DecisionCard.id == card_id))
        card = res_card.scalars().first()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"DecisionCard '{card_id}' not found."
            )

        # Step 3: Authorization Check
        await verify_parent_authorization(card.parent_id, CarePermission.CHECK_INS, db, current_user)

        # Step 4: Decision Status Validation
        if card.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Operation: DecisionCard '{card_id}' is already '{card.status}' and cannot be resolved."
            )

        # Step 5: CareRequest Domain State Validation for linked decision cards
        if card.related_entity_id:
            res_req = await db.execute(select(CareRequest).where(CareRequest.id == card.related_entity_id))
            linked_req = res_req.scalars().first()
            if linked_req and linked_req.status in ["COMPLETED", "CLOSED", "PARENT_CONFIRMED"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid Operation: Linked CareRequest '{card.related_entity_id}' is already '{linked_req.status}'."
                )

        # Step 6: Execute Resolution
        card.status = "RESOLVED"
        now_str = datetime.now(timezone.utc).isoformat()

        # Audit Event Log
        audit = AuditEvent(
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            action="DECISION_RESOLVED",
            resource_type="DecisionCard",
            resource_id=card.id,
            details={
                "action_key": action_key,
                "reason": reason or "Resolved by caregiver via Decision Inbox",
                "parent_id": card.parent_id,
            },
        )
        db.add(audit)

        response_body = {
            "success": True,
            "card_id": card.id,
            "action_key": action_key,
            "status": card.status,
            "resolved_at": now_str,
        }

        if idempotency_key:
            idemp_rec = IdempotencyRecord(
                idempotency_key=idempotency_key,
                user_id=current_user.id,
                request_path=f"/api/v1/decisions/{card_id}/resolve",
                response_code=200,
                response_body=response_body,
            )
            db.add(idemp_rec)

        await db.commit()
        return response_body
