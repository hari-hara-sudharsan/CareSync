from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.checkin import CheckInEvent
from app.services.checkin_service import CheckInService
from pydantic import BaseModel

router = APIRouter()

class CheckInCreateSchema(BaseModel):
    parent_id: str
    feeling_branch: str # 'WELL' | 'NEED_HELP'
    status_summary: str
    need_category: Optional[str] = None # 'TRANSPORTATION', 'MEDICATION', 'ERRANDS', 'COMPANIONSHIP'
    urgency: Optional[str] = "NORMAL" # 'LOW', 'NORMAL', 'HIGH', 'URGENT'

@router.get("/today", summary="Get Today's Check-In Status for Active Parent")
async def get_today_checkin_status(
    parent_id: str = "p-1",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CheckInService.get_today_checkin(db, parent_id)

@router.get("", summary="Get Parent Check-In History")
async def get_checkins(
    parent_id: str = "p-1",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(CheckInEvent)
        .where(CheckInEvent.parent_id == parent_id)
        .order_by(desc(CheckInEvent.created_at))
    )
    return res.scalars().all()

@router.post("", summary="Submit Parent Daily Check-In (Triggers CareRequest if Needed)")
async def submit_checkin(
    payload: CheckInCreateSchema,
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await CheckInService.submit_checkin(
        db=db,
        current_user=current_user,
        parent_id=payload.parent_id,
        feeling_branch=payload.feeling_branch,
        status_summary=payload.status_summary,
        need_category=payload.need_category,
        urgency=payload.urgency,
        idempotency_key=x_idempotency_key,
    )
