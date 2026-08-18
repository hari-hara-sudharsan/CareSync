from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.checkin import CheckInEvent
from app.models.care_request import CareRequest
from app.services.care_request_service import CareRequestService
from app.services.care_request_state_machine import CareRequestStatus
from pydantic import BaseModel

router = APIRouter()

class CheckInCreateSchema(BaseModel):
    parent_id: str
    feeling_branch: str # 'WELL' | 'NEED_HELP' | 'CONCERN' | 'URGENT'
    status_summary: str
    note: Optional[str] = None

@router.get("", summary="Get Parent Check-In History")
async def get_checkins(
    parent_id: str = "p-1",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await CareRequestService.verify_parent_access(db, current_user.id, parent_id)
    result = await db.execute(
        select(CheckInEvent)
        .where(CheckInEvent.parent_id == parent_id)
        .order_by(desc(CheckInEvent.created_at))
    )
    return result.scalars().all()

@router.post("", summary="Submit Parent Daily Check-In (Triggers CareRequest if Needed)")
async def submit_checkin(
    payload: CheckInCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await CareRequestService.verify_parent_access(db, current_user.id, payload.parent_id)

    requires_help = payload.feeling_branch in ["NEED_HELP", "CONCERN", "URGENT"]
    is_emergency = payload.feeling_branch == "URGENT"

    created_care_request_id = None

    # Cross-Domain Trigger: If parent needs help, backend creates a CareRequest
    if requires_help:
        priority = "CRITICAL" if is_emergency else "HIGH"
        care_req = await CareRequestService.create_care_request(
            db=db,
            user_id=current_user.id,
            user_name=current_user.full_name,
            parent_id=payload.parent_id,
            category="CHECK_IN",
            title=f"Check-In Escalation ({payload.feeling_branch})",
            description=f"Parent check-in response: '{payload.status_summary}'. Note: {payload.note or 'No additional details provided.'}",
            priority=priority,
            requested_time="Immediate",
        )
        created_care_request_id = care_req.id

    checkin = CheckInEvent(
        parent_id=payload.parent_id,
        feeling_branch=payload.feeling_branch,
        status_summary=payload.status_summary,
        note=payload.note,
        requires_escalation=requires_help,
        is_emergency=is_emergency,
        care_request_id=created_care_request_id,
    )
    db.add(checkin)
    await db.commit()
    await db.refresh(checkin)

    return {
        "success": True,
        "checkin_id": checkin.id,
        "feeling_branch": checkin.feeling_branch,
        "care_request_created": requires_help,
        "care_request_id": created_care_request_id,
    }
