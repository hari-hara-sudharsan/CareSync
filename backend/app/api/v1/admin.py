from datetime import datetime, timezone
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import require_admin_role
from app.models.user import User
from app.models.decision import AuditEvent
from app.trust.models import VerificationRecord

router = APIRouter()

# ADMIN is deliberately absent: administrators are provisioned out-of-band
# (python -m app.scripts.provision_admin), never through an API call.
GrantableRole = Literal["PARENT", "FAMILY", "VOLUNTEER", "COORDINATOR"]
VerificationDecision = Literal["VERIFIED", "REJECTED", "SUSPENDED", "REVOKED"]

class RoleAssignmentRequest(BaseModel):
    role: GrantableRole
    reason: str = Field(..., min_length=3, max_length=500)

class VerificationDecisionRequest(BaseModel):
    decision: VerificationDecision
    id_verified: bool = False
    background_checked: bool = False
    notes: Optional[str] = Field(None, max_length=1000)

async def _get_target_user(db: AsyncSession, user_id: str) -> User:
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")
    return user

@router.post("/users/{user_id}/role", summary="Assign a User Role (Admin, Audited)")
async def assign_user_role(
    user_id: str,
    payload: RoleAssignmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_role),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrators cannot change their own role.")

    target = await _get_target_user(db, user_id)
    if target.role == "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator accounts cannot be changed through the API.",
        )

    previous_role = target.role
    if previous_role == payload.role:
        return {"user_id": target.id, "role": target.role, "changed": False}

    target.role = payload.role
    if payload.role == "VOLUNTEER":
        res_rec = await db.execute(select(VerificationRecord).where(VerificationRecord.user_id == target.id))
        if not res_rec.scalars().first():
            db.add(VerificationRecord(user_id=target.id, status="PENDING"))

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action="USER_ROLE_CHANGED",
        resource_type="User",
        resource_id=target.id,
        details={"previous_role": previous_role, "new_role": payload.role, "reason": payload.reason},
    ))
    await db.commit()
    return {"user_id": target.id, "role": target.role, "previous_role": previous_role, "changed": True}

@router.post("/volunteers/{user_id}/verification", summary="Record a Volunteer Verification Decision (Admin, Audited)")
async def decide_volunteer_verification(
    user_id: str,
    payload: VerificationDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_role),
):
    target = await _get_target_user(db, user_id)
    if target.role != "VOLUNTEER":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is not a volunteer applicant.")

    if payload.decision == "VERIFIED" and not (payload.id_verified and payload.background_checked):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Approval requires both identity verification and a background check.",
        )

    res_rec = await db.execute(select(VerificationRecord).where(VerificationRecord.user_id == target.id))
    record = res_rec.scalars().first()
    if not record:
        record = VerificationRecord(user_id=target.id)
        db.add(record)

    previous_status = record.status
    record.status = payload.decision
    record.id_verified = payload.id_verified if payload.decision == "VERIFIED" else False
    record.background_checked = payload.background_checked if payload.decision == "VERIFIED" else False
    record.verified_at = datetime.now(timezone.utc).isoformat() if payload.decision == "VERIFIED" else None
    record.notes = payload.notes

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action="VOLUNTEER_VERIFICATION_DECIDED",
        resource_type="VerificationRecord",
        resource_id=target.id,
        details={"previous_status": previous_status, "decision": payload.decision},
    ))
    await db.commit()
    return {"user_id": target.id, "verification_status": record.status, "previous_status": previous_status}
