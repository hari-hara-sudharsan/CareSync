from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.api.deps import require_volunteer_role, require_verified_volunteer
from app.models.user import User
from app.models.care_request import CareRequest
from app.trust.models import VerificationRecord, TaskReliability
from app.trust.verification import VerificationService

router = APIRouter()

def _assigned_task_view(t: CareRequest) -> dict:
    """Task-scoped view for the assigned volunteer: logistics only, no parent profile or medical history."""
    return {
        "id": t.id,
        "category": t.category,
        "title": t.title,
        "description": t.description,
        "priority": t.priority,
        "status": t.status,
        "requested_time": t.requested_time,
    }

def _opportunity_view(t: CareRequest) -> dict:
    """Discovery view of an unassigned task: no parent identity and no free-text description."""
    return {
        "id": t.id,
        "category": t.category,
        "title": t.title,
        "priority": t.priority,
        "requested_time": t.requested_time,
    }

@router.get("/home", summary="Volunteer Workspace Home Read Model")
async def get_volunteer_home(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_volunteer_role),
):
    """
    Volunteer Workspace Read Model Endpoint.
    Any VOLUNTEER account can see its own verification status; task data is only
    returned once an administrator has approved the volunteer's verification.
    """
    res_ver = await db.execute(select(VerificationRecord).where(VerificationRecord.user_id == current_user.id))
    record = res_ver.scalars().first()
    is_eligible = await VerificationService.is_candidate_eligible(db, current_user.id, "VOLUNTEER")

    res_rel = await db.execute(select(TaskReliability).where(TaskReliability.user_id == current_user.id))
    reliability = [
        {"category": r.category, "reliability_score": round(r.reliability_score, 1), "completed_count": r.completed_count}
        for r in res_rel.scalars().all()
    ]

    assigned_tasks = []
    open_tasks = []
    if is_eligible:
        res_assigned = await db.execute(
            select(CareRequest)
            .where(
                CareRequest.assigned_to_id == current_user.id,
                CareRequest.status.in_(["ASSIGNED", "ACCEPTED", "IN_PROGRESS"])
            )
            .order_by(desc(CareRequest.created_at))
        )
        assigned_tasks = res_assigned.scalars().all()

        res_open = await db.execute(
            select(CareRequest)
            .where(CareRequest.status == "PENDING_ASSIGNMENT")
            .order_by(desc(CareRequest.created_at))
            .limit(10)
        )
        open_tasks = res_open.scalars().all()

    return {
        "volunteer_id": current_user.id,
        "volunteer_name": current_user.full_name,
        "verification_status": record.status if record else "UNVERIFIED",
        "task_access_enabled": is_eligible,
        "reliability": reliability,
        "assigned_tasks_count": len(assigned_tasks),
        "assigned_tasks": [_assigned_task_view(t) for t in assigned_tasks],
        "available_opportunities": [_opportunity_view(t) for t in open_tasks],
    }

@router.get("/tasks", summary="Get Eligible Volunteer Care Tasks")
async def get_volunteer_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_verified_volunteer),
):
    """
    Returns the verified volunteer's own assigned tasks plus unassigned opportunities.
    Tasks assigned to other caregivers are never listed.
    """
    res_assigned = await db.execute(
        select(CareRequest)
        .where(
            CareRequest.assigned_to_id == current_user.id,
            CareRequest.status.in_(["ASSIGNED", "ACCEPTED", "IN_PROGRESS"])
        )
        .order_by(desc(CareRequest.created_at))
    )
    res_open = await db.execute(
        select(CareRequest)
        .where(CareRequest.status == "PENDING_ASSIGNMENT")
        .order_by(desc(CareRequest.created_at))
    )
    return {
        "assigned_tasks": [_assigned_task_view(t) for t in res_assigned.scalars().all()],
        "available_opportunities": [_opportunity_view(t) for t in res_open.scalars().all()],
    }
