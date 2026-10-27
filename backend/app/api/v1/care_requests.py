from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user, verify_parent_authorization, require_admin_role
from app.models.user import User
from app.models.care_request import CareRequest, AssignmentHistory
from app.models.care_network import CareMember
from app.models.parent import ParentProfile
from app.schemas.care_request import CareRequestCreate, CareRequestRead, CareRequestAssign
from app.services.care_request_service import CareRequestService
from app.services.care_request_state_machine import CareRequestStatus
from app.services.matching_engine.matching_service import MatchingEngineService
from app.services.matching_engine.candidate_directory import CandidateDirectory
from app.core.config import settings
from app.core.authorization import CarePermission, map_category_to_permission

router = APIRouter()

class MatchingPayload(BaseModel):
    # Test-only hook for exercising the matching engine; ignored outside ENVIRONMENT=test.
    custom_candidate_pool: Optional[List[Dict[str, Any]]] = None

class CompletionPayload(BaseModel):
    completion_note: Optional[str] = None

class ConcernPayload(BaseModel):
    category: str = "OTHER"
    details: Optional[str] = None

class FailurePayload(BaseModel):
    failure_reason: str = "UNABLE_TO_COMPLETE"
    details: Optional[str] = None

class DeclinePayload(BaseModel):
    reason: Optional[str] = None

class CancellationPayload(BaseModel):
    reason: Optional[str] = None


@router.get("", summary="Get Care Requests with Filters & Parent Isolation")
async def get_care_requests(
    parent_id: str,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_parent_authorization(parent_id, CarePermission.CHECK_INS, db, current_user)

    query = select(CareRequest).where(CareRequest.parent_id == parent_id)
    if status_filter:
        query = query.where(CareRequest.status == status_filter)
    
    result = await db.execute(query)
    requests = result.scalars().all()
    return requests

@router.get("/{request_id}", summary="Get Care Request Detail with Task-Scoped Authorization")
async def get_care_request_detail(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res.scalars().first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CareRequest '{request_id}' not found."
        )

    # 1. Volunteer Least-Privilege Data Minimization Check ("Volunteer gets task, not medical history")
    if current_user.role == "VOLUNTEER":
        if not req.assigned_to_id or req.assigned_to_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You are not authorized to view this unassigned care task."
            )
        # Return sanitized task-scoped logistics payload for assigned volunteer
        return {
            "id": req.id,
            "category": req.category,
            "title": req.title,
            "description": req.description,
            "priority": req.priority,
            "status": req.status,
            "requested_time": req.requested_time,
            "location_name": req.location_name,
            "address": req.address,
            "created_at": req.created_at,
        }

    # 2. Parent / Family / Admin ABAC Verification
    required_perm = map_category_to_permission(req.category)
    await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    # Resolve parent display name from database ParentProfile
    res_parent = await db.execute(select(ParentProfile).where(ParentProfile.id == req.parent_id))
    parent_prof = res_parent.scalars().first()
    parent_name = parent_prof.full_name if parent_prof else "Parent"

    res_hist = await db.execute(
        select(AssignmentHistory)
        .where(AssignmentHistory.care_request_id == request_id)
        .order_by(desc(AssignmentHistory.created_at))
    )
    histories = res_hist.scalars().all()

    return {
        "id": req.id,
        "parent_id": req.parent_id,
        "parent_name": parent_name,
        "category": req.category,
        "title": req.title,
        "description": req.description,
        "priority": req.priority,
        "status": req.status,
        "requested_time": req.requested_time,
        "location_name": req.location_name,
        "address": req.address,
        "assigned_to": {
            "id": req.assigned_to_id,
            "name": req.assigned_to_name,
            "role": req.assigned_to_role,
        } if req.assigned_to_id else None,
        "history": [
            {
                "id": h.id,
                "assignee_id": h.assignee_id,
                "assignee_name": h.assignee_name,
                "assignee_role": h.assignee_role,
                "status": h.status,
                "reason": h.reason,
                "created_at": h.created_at,
            }
            for h in histories
        ],
        "created_at": req.created_at,
    }

@router.post("", summary="Create New Care Request (Transactional)")
async def create_care_request(
    req: CareRequestCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    required_perm = map_category_to_permission(req.category)
    await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    created_req = await CareRequestService.create_care_request(
        db=db,
        user_id=current_user.id,
        user_name=current_user.full_name,
        parent_id=req.parent_id,
        category=req.category,
        title=req.title,
        description=req.description,
        priority=req.priority,
        requested_time=req.requested_time,
        location_name=req.location_name,
        address=req.address,
        idempotency_key=idempotency_key,
    )
    return created_req

@router.post("/{request_id}/match", summary="Get Candidate Recommendations (Matching Engine)")
async def get_matching_recommendations(
    request_id: str,
    payload: Optional[MatchingPayload] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

    if req.status in ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "PARENT_CONFIRMED", "CLOSED", "CANCELLED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Operation: Candidate matching is not permitted for CareRequest in status '{req.status}'."
        )

    required_perm = map_category_to_permission(req.category)
    await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    if payload and payload.custom_candidate_pool is not None and settings.ENVIRONMENT == "test":
        candidate_pool = payload.custom_candidate_pool
    else:
        candidate_pool = await CandidateDirectory.get_candidate_pool(db, req.parent_id)

    recommendation = MatchingEngineService.match_candidates(req, candidate_pool, top_k=5)
    return recommendation

@router.post("/{request_id}/assign", summary="Assign Care Request to Candidate (Atomic Transaction)")
async def assign_care_request(
    request_id: str,
    payload: CareRequestAssign,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res_req.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

    required_perm = map_category_to_permission(req.category)
    await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    assigned_req = await CareRequestService.assign_care_request(
        db=db,
        request_id=request_id,
        assignee_id=payload.assignee_id,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        idempotency_key=idempotency_key,
    )
    return assigned_req

@router.post("/{request_id}/accept", summary="Accept Assigned Care Request (Assigned Caregiver)")
async def accept_care_request(
    request_id: str,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res_req.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

    if req.assigned_to_id != current_user.id:
        required_perm = map_category_to_permission(req.category)
        await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    accepted_req = await CareRequestService.accept_care_request(
        db=db,
        request_id=request_id,
        current_user=current_user,
        idempotency_key=idempotency_key,
    )
    return accepted_req

@router.post("/{request_id}/start", summary="Start Care Request (Assigned Caregiver)")
async def start_care_request(
    request_id: str,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res_req.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

    if req.assigned_to_id != current_user.id:
        required_perm = map_category_to_permission(req.category)
        await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    started_req = await CareRequestService.start_care_request(
        db=db,
        request_id=request_id,
        current_user=current_user,
        idempotency_key=idempotency_key,
    )
    return started_req

@router.post("/{request_id}/complete", summary="Complete Care Request (Assigned Caregiver)")
async def complete_care_request(
    request_id: str,
    payload: Optional[CompletionPayload] = None,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res_req.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

    if req.assigned_to_id != current_user.id:
        required_perm = map_category_to_permission(req.category)
        await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    note = payload.completion_note if payload else None

    completed_req = await CareRequestService.complete_care_request(
        db=db,
        request_id=request_id,
        current_user=current_user,
        completion_note=note,
        idempotency_key=idempotency_key,
    )
    return completed_req

@router.post("/{request_id}/decline", summary="Decline Assigned Care Request (Assigned Caregiver)")
async def decline_care_request(
    request_id: str,
    payload: Optional[DeclinePayload] = None,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res_req.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

    if req.assigned_to_id != current_user.id:
        required_perm = map_category_to_permission(req.category)
        await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    reason = payload.reason if payload else None

    declined_req = await CareRequestService.decline_care_request(
        db=db,
        request_id=request_id,
        current_user=current_user,
        reason=reason,
        idempotency_key=idempotency_key,
    )
    return declined_req

@router.post("/{request_id}/fail", summary="Report Task Execution Failure (Assigned Caregiver)")
async def fail_care_request(
    request_id: str,
    payload: FailurePayload,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res_req.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

    required_perm = map_category_to_permission(req.category)
    await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    failed_req = await CareRequestService.fail_care_request(
        db=db,
        request_id=request_id,
        current_user=current_user,
        failure_reason=payload.failure_reason,
        details=payload.details,
        idempotency_key=idempotency_key,
    )
    return failed_req

@router.post("/{request_id}/timeout", summary="Deterministic Execution Timeout Handler")
async def timeout_care_request(
    request_id: str,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res_req.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

    required_perm = map_category_to_permission(req.category)
    await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    timed_out_req = await CareRequestService.timeout_care_request(
        db=db,
        request_id=request_id,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        idempotency_key=idempotency_key,
    )
    return timed_out_req

@router.post("/{request_id}/cancel", summary="Cancel Care Request (Parent / Guardian Policy)")
async def cancel_care_request(
    request_id: str,
    payload: Optional[CancellationPayload] = None,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res_req.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

    required_perm = map_category_to_permission(req.category)
    await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    reason = payload.reason if payload else None

    cancelled_req = await CareRequestService.cancel_care_request(
        db=db,
        request_id=request_id,
        current_user=current_user,
        cancellation_reason=reason,
        idempotency_key=idempotency_key,
    )
    return cancelled_req

@router.post("/{request_id}/confirm", summary="Parent Confirm Care Request Completion")
async def confirm_care_request(
    request_id: str,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res_req.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

    required_perm = map_category_to_permission(req.category)
    await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    confirmed_req = await CareRequestService.confirm_care_request(
        db=db,
        request_id=request_id,
        current_user=current_user,
        idempotency_key=idempotency_key,
    )
    return confirmed_req

@router.post("/{request_id}/raise-concern", summary="Parent Raise Concern on Completed Task")
async def raise_care_request_concern(
    request_id: str,
    payload: ConcernPayload,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res_req.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

    required_perm = map_category_to_permission(req.category)
    await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    res = await CareRequestService.raise_care_request_concern(
        db=db,
        request_id=request_id,
        current_user=current_user,
        category=payload.category,
        details=payload.details,
        idempotency_key=idempotency_key,
    )
    return res

@router.post("/{request_id}/transition/{target_status}", summary="Transition Care Request State")
async def transition_care_request_status(
    request_id: str,
    target_status: str,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_role),
):
    """
    Administrative state override. Ordinary workflows must use the dedicated, authority-checked
    endpoints (accept/start/complete/decline/fail/confirm/cancel); this generic transition would
    otherwise let any circle member force states such as COMPLETED or CLOSED.
    """
    res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res_req.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest {request_id} not found.")

    updated = await CareRequestService.update_request_status(
        db=db,
        request_id=request_id,
        target_status=target_status,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        reason=reason,
    )
    return updated
