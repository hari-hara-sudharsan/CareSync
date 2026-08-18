from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.trust.models import Complaint
from app.trust.verification import VerificationService
from app.models.decision import DecisionCard, AuditEvent

class ComplaintService:
    """
    Complaint Lifecycle & Safety Policy Service.
    
    1. Records caregiver/parent safety concerns.
    2. Automatically suspends target candidates on HIGH or EMERGENCY severity complaints.
    3. Emits critical safety DecisionCards for human caregiver review.
    4. Prohibits autonomous AI complaint resolution.
    """

    @staticmethod
    async def file_complaint(
        db: AsyncSession,
        parent_id: str,
        complainant_id: str,
        target_user_id: str,
        category: str,
        safety_severity: str,
        description: str,
    ) -> Dict[str, Any]:
        complaint = Complaint(
            parent_id=parent_id,
            complainant_id=complainant_id,
            target_user_id=target_user_id,
            category=category,
            safety_severity=safety_severity,
            status="OPEN",
            description=description,
        )
        db.add(complaint)
        await db.flush()

        auto_suspended = False
        decision_card_id = None

        # Safety Policy Engine: Automatic suspension on HIGH or EMERGENCY safety severity
        if safety_severity in ["HIGH", "EMERGENCY"]:
            await VerificationService.update_verification_status(
                db=db,
                user_id=target_user_id,
                new_status="SUSPENDED",
                notes=f"Auto-suspended due to {safety_severity} severity complaint #{complaint.id}",
            )
            auto_suspended = True

            # Emit Safety DecisionCard for caregiver HITL review
            card = DecisionCard(
                parent_id=parent_id,
                type="SAFETY_CONCERN_REVIEW",
                priority="CRITICAL",
                status="PENDING",
                title=f"Safety Alert: {category.replace('_', ' ').title()}",
                summary=f"A {safety_severity} safety concern was filed against helper ({target_user_id}). Candidate has been suspended pending your review.",
                reason=f"Complaint Details: {description}",
                actions=[
                    {"key": "uphold_complaint", "label": "Uphold & Keep Suspended", "variant": "danger"},
                    {"key": "dismiss_complaint", "label": "Dismiss Complaint & Restore Helper", "variant": "soft"},
                ],
            )
            db.add(card)
            await db.flush()
            decision_card_id = card.id

        # Audit Event
        audit = AuditEvent(
            actor_id=complainant_id,
            actor_name="Parent/Caregiver",
            action="COMPLAINT_FILED",
            resource_type="Complaint",
            resource_id=complaint.id,
            details={
                "category": category,
                "safety_severity": safety_severity,
                "target_user_id": target_user_id,
                "auto_suspended": auto_suspended,
            },
        )
        db.add(audit)

        await db.commit()
        await db.refresh(complaint)

        return {
            "success": True,
            "complaint_id": complaint.id,
            "safety_severity": complaint.safety_severity,
            "auto_suspended": auto_suspended,
            "decision_card_id": decision_card_id,
        }
