from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.api.deps import get_current_user, verify_parent_authorization
from app.models.user import User
from app.models.parent import ParentProfile
from app.models.care_request import CareRequest
from app.models.decision import DecisionCard
from app.core.authorization import CarePermission

router = APIRouter()

@router.get("/home", summary="Get Family Caregiver Workspace Read Model")
async def get_family_home_read_model(
    parent_id: str = "p-1",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Family Workspace Home Read Model Endpoint.
    
    1. Verifies caregiver authorization for parent_id.
    2. Returns active parent profile, pending decision cards, and recent care requests.
    """
    await verify_parent_authorization(parent_id, CarePermission.CHECK_INS, db, current_user)

    # Fetch Parent Profile
    res_parent = await db.execute(select(ParentProfile).where(ParentProfile.id == parent_id))
    parent = res_parent.scalars().first()
    
    parent_name = parent.full_name if parent else ("Susan Woodson" if parent_id == "p-1" else "George Miller")

    # Fetch Pending Decision Cards
    res_decisions = await db.execute(
        select(DecisionCard).where(
            DecisionCard.parent_id == parent_id,
            DecisionCard.status == "PENDING"
        )
    )
    decisions = res_decisions.scalars().all()

    # Fetch Recent Care Requests
    res_reqs = await db.execute(
        select(CareRequest)
        .where(CareRequest.parent_id == parent_id)
        .order_by(desc(CareRequest.created_at))
        .limit(10)
    )
    reqs = res_reqs.scalars().all()

    return {
        "active_parent_id": parent_id,
        "active_parent_name": parent_name,
        "pending_decisions_count": len(decisions),
        "open_requests_count": len([r for r in reqs if r.status in ["PENDING_ASSIGNMENT", "ASSIGNED"]]),
        "decision_inbox": [
            {
                "id": d.id,
                "type": d.type,
                "title": d.title,
                "summary": d.summary,
                "priority": d.priority,
                "status": d.status,
                "actions": d.actions,
            }
            for d in decisions
        ],
        "recent_requests": [
            {
                "id": r.id,
                "category": r.category,
                "title": r.title,
                "description": r.description,
                "priority": r.priority,
                "status": r.status,
                "requested_time": r.requested_time,
                "created_at": r.created_at,
            }
            for r in reqs
        ],
    }
