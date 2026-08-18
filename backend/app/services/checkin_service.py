import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException, status

from app.models.checkin import CheckInEvent
from app.models.care_request import CareRequest
from app.models.decision import AuditEvent
from app.models.idempotency import IdempotencyRecord
from app.models.user import User
from app.api.deps import verify_parent_authorization
from app.core.authorization import CarePermission

class CheckInService:
    """
    Check-In Domain Service for CareSync Parent Journey.
    
    1. Enforces parent authorization.
    2. Idempotency deduplication via IdempotencyRecord header/key.
    3. 'WELL' branch -> Persists CheckInEvent only.
    4. 'NEED_HELP' branch -> Persists CheckInEvent AND creates a real CareRequest.
    """

    @staticmethod
    async def get_today_checkin(db: AsyncSession, parent_id: str) -> Dict[str, Any]:
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        res = await db.execute(
            select(CheckInEvent)
            .where(CheckInEvent.parent_id == parent_id)
            .order_by(desc(CheckInEvent.created_at))
        )
        events = res.scalars().all()
        
        today_event = next((e for e in events if e.created_at.startswith(today_str)), None)
        if today_event:
            return {
                "has_checked_in_today": True,
                "feeling_branch": today_event.feeling_branch,
                "summary": today_event.status_summary,
                "checked_in_at": today_event.created_at,
            }

        return {
            "has_checked_in_today": False,
            "feeling_branch": None,
            "summary": None,
            "checked_in_at": None,
        }

    @staticmethod
    async def submit_checkin(
        db: AsyncSession,
        current_user: User,
        parent_id: str,
        feeling_branch: str, # WELL, NEED_HELP
        status_summary: str,
        need_category: Optional[str] = None, # TRANSPORTATION, MEDICATION, ERRANDS, COMPANIONSHIP
        urgency: Optional[str] = "NORMAL", # LOW, NORMAL, HIGH, URGENT
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Step 1: Parent Authorization Verification
        await verify_parent_authorization(parent_id, CarePermission.CHECK_INS, db, current_user)

        # Step 2: Idempotency Check
        if idempotency_key:
            res_idemp = await db.execute(
                select(IdempotencyRecord).where(IdempotencyRecord.idempotency_key == idempotency_key)
            )
            existing_rec = res_idemp.scalars().first()
            if existing_rec:
                return existing_rec.response_body

        # Validate feeling branch
        if feeling_branch not in ["WELL", "NEED_HELP"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid feeling_branch '{feeling_branch}'. Expected 'WELL' or 'NEED_HELP'."
            )

        requires_escalation = feeling_branch == "NEED_HELP"

        # Step 3: Persist CheckInEvent
        checkin_event = CheckInEvent(
            parent_id=parent_id,
            feeling_branch=feeling_branch,
            status_summary=status_summary,
            requires_escalation=requires_escalation,
        )
        db.add(checkin_event)
        await db.flush()

        care_request_id = None
        care_request_data = None

        # Step 4: 'NEED_HELP' Branch -> Create CareRequest
        if requires_escalation:
            category = need_category or "ERRANDS"
            priority = urgency if urgency in ["LOW", "NORMAL", "HIGH", "URGENT"] else "NORMAL"

            req = CareRequest(
                parent_id=parent_id,
                category=category,
                priority=priority,
                title=f"Check-In Assistance: {category.replace('_', ' ').title()}",
                description=f"Parent check-in requested assistance: {status_summary}",
                status="PENDING_ASSIGNMENT",
                requested_time="Immediate",
            )
            db.add(req)
            await db.flush()

            checkin_event.care_request_id = req.id
            care_request_id = req.id
            care_request_data = {
                "id": req.id,
                "category": req.category,
                "priority": req.priority,
                "status": req.status,
                "title": req.title,
            }

        # Audit Event
        audit = AuditEvent(
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            action="CHECKIN_SUBMITTED",
            resource_type="CheckInEvent",
            resource_id=checkin_event.id,
            details={
                "feeling_branch": feeling_branch,
                "requires_escalation": requires_escalation,
                "care_request_id": care_request_id,
            },
        )
        db.add(audit)

        response_body = {
            "success": True,
            "checkin_id": checkin_event.id,
            "parent_id": parent_id,
            "feeling_branch": feeling_branch,
            "status_summary": status_summary,
            "requires_escalation": requires_escalation,
            "care_request": care_request_data,
        }

        if idempotency_key:
            idemp_rec = IdempotencyRecord(
                idempotency_key=idempotency_key,
                user_id=current_user.id,
                request_path="/api/v1/check-ins",
                response_code=200,
                response_body=response_body,
            )
            db.add(idemp_rec)

        await db.commit()
        return response_body
