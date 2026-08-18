from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.rate_limiter import rate_limiter
from app.api.deps import get_current_user
from app.models.user import User
from app.trust.models import VerificationRecord, Complaint
from app.trust.verification import VerificationService
from app.trust.reliability import TaskReliabilityService
from app.trust.complaints import ComplaintService
from app.services.care_request_service import CareRequestService
from pydantic import BaseModel

router = APIRouter()

class ComplaintCreateSchema(BaseModel):
    parent_id: str
    target_user_id: str
    category: str # TASK_NOT_COMPLETED, LATE_ARRIVAL, NO_SHOW, SAFETY_CONCERN
    safety_severity: str = "NONE" # NONE, CONCERN, HIGH, EMERGENCY
    description: str

@router.get("/verification/{user_id}", summary="Get User Verification Status")
async def get_verification_status(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(VerificationRecord).where(VerificationRecord.user_id == user_id))
    record = res.scalars().first()

    if not record:
        return {
            "user_id": user_id,
            "status": "UNVERIFIED",
            "id_verified": False,
            "background_checked": False,
        }
    return record

@router.get("/reliability/{user_id}", summary="Get Task-Scoped Reliability Ratings")
async def get_task_reliability(
    user_id: str,
    category: str = "TRANSPORTATION",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    score = await TaskReliabilityService.get_task_reliability(db, user_id, category)
    return {
        "user_id": user_id,
        "category": category,
        "reliability_score": score,
    }

@router.post("/complaints", summary="File Caregiver/Parent Complaint")
async def file_complaint(
    payload: ComplaintCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Rate Limiting & Abuse Protection: Max 3 complaints per minute per user
    rate_limiter.check_rate_limit("complaint_file", current_user.id, max_requests=3, window_seconds=60)

    await CareRequestService.verify_parent_access(db, current_user.id, payload.parent_id)

    result = await ComplaintService.file_complaint(
        db=db,
        parent_id=payload.parent_id,
        complainant_id=current_user.id,
        target_user_id=payload.target_user_id,
        category=payload.category,
        safety_severity=payload.safety_severity,
        description=payload.description,
    )
    return result

@router.get("/complaints", summary="Get Parent Complaints")
async def get_complaints(
    parent_id: str = "p-1",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await CareRequestService.verify_parent_access(db, current_user.id, parent_id)
    res = await db.execute(
        select(Complaint)
        .where(Complaint.parent_id == parent_id)
        .order_by(desc(Complaint.created_at))
    )
    return res.scalars().all()
