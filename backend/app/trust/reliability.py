from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.trust.models import TaskReliability, TrustEvent

class TaskReliabilityService:
    """
    Task-Scoped Reliability Engine for CareSync Trust Layer.
    
    Computes category-specific reliability ratings derived from immutable TrustEvents.
    (e.g., Transportation: 96, Groceries: 91, Companionship: 84).
    """

    @staticmethod
    async def get_task_reliability(
        db: AsyncSession, user_id: str, category: str
    ) -> float:
        res = await db.execute(
            select(TaskReliability).where(
                TaskReliability.user_id == user_id,
                TaskReliability.category == category
            )
        )
        rec = res.scalars().first()

        if not rec:
            return 100.0 # Default starting reliability for new verified candidates

        return round(rec.reliability_score, 1)

    @staticmethod
    async def record_trust_event(
        db: AsyncSession,
        user_id: str,
        event_type: str,
        category: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> float:
        res = await db.execute(
            select(TaskReliability).where(
                TaskReliability.user_id == user_id,
                TaskReliability.category == category
            )
        )
        rec = res.scalars().first()

        if not rec:
            rec = TaskReliability(
                user_id=user_id,
                category=category,
                completed_count=0,
                cancelled_count=0,
                no_show_count=0,
                parent_confirmed_count=0,
                reliability_score=100.0,
            )
            db.add(rec)

        impact_delta = 0.0
        if event_type == "TASK_COMPLETED":
            rec.completed_count += 1
            impact_delta = 1.0
        elif event_type == "TASK_PARENT_CONFIRMED":
            rec.parent_confirmed_count += 1
            impact_delta = 2.0
        elif event_type == "TASK_CANCELLED":
            rec.cancelled_count += 1
            impact_delta = -10.0
        elif event_type == "TASK_NO_SHOW":
            rec.no_show_count += 1
            impact_delta = -25.0
        elif event_type == "COMPLAINT_UPHELD":
            impact_delta = -20.0

        new_score = max(0.0, min(100.0, rec.reliability_score + impact_delta))
        rec.reliability_score = new_score

        # Record Trust Event log
        event = TrustEvent(
            user_id=user_id,
            event_type=event_type,
            resource_type=resource_type,
            resource_id=resource_id,
            impact_delta=impact_delta,
            notes=notes,
        )
        db.add(event)

        await db.commit()
        await db.refresh(rec)
        return rec.reliability_score
