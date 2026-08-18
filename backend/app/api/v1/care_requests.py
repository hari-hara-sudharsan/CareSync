from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user, verify_parent_authorization
from app.models.user import User
from app.models.care_request import CareRequest, AssignmentHistory
from app.models.care_network import CareMember
from app.schemas.care_request import CareRequestCreate, CareRequestRead, CareRequestAssign
from app.services.care_request_service import CareRequestService
from app.services.care_request_state_machine import CareRequestStatus
from app.services.matching_engine.matching_service import MatchingEngineService
from app.core.authorization import CarePermission

router = APIRouter()

class MatchingPayload(BaseModel):
    custom_candidate_pool: Optional[List[Dict[str, Any]]] = None

class CompletionPayload(BaseModel):
    completion_note: Optional[str] = None

def map_category_to_permission(category: str) -> CarePermission:
    cat_upper = category.upper() if category else ""
    if "TRANSPORT" in cat_upper:
        return CarePermission.TRANSPORTATION
    elif "MED" in cat_upper or "PHARM" in cat_upper:
        return CarePermission.MEDICATION
    elif "APPOINT" in cat_upper:
        return CarePermission.APPOINTMENTS
    elif "HISTORY" in cat_upper:
        return CarePermission.CARE_HISTORY
    return CarePermission.CHECK_INS

@router.get("", summary="Get Care Requests with Filters & Parent Isolation")
async def get_care_requests(
    parent_id: str = "p-1",
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

    required_perm = map_category_to_permission(req.category)
    await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    res_hist = await db.execute(
        select(AssignmentHistory)
        .where(AssignmentHistory.care_request_id == request_id)
        .order_by(desc(AssignmentHistory.created_at))
    )
    histories = res_hist.scalars().all()

    return {
        "id": req.id,
        "parent_id": req.parent_id,
        "parent_name": "Susan Woodson" if req.parent_id == "p-1" else "George Miller",
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

    if req.status in ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "PARENT_CONFIRMED", "CLOSED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Operation: Candidate matching is not permitted for CareRequest in status '{req.status}'."
        )

    required_perm = map_category_to_permission(req.category)
    await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    if payload and payload.custom_candidate_pool is not None:
        candidate_pool = payload.custom_candidate_pool
    else:
        candidate_pool = [
            {
                "id": "c-1",
                "name": "David Woodson",
                "relationship": "Son",
                "type": "FAMILY",
                "is_active": True,
                "is_available": True,
                "is_primary_contact": True,
                "parent_id": req.parent_id,
                "distance_km": 2.5,
                "reliability_score": 4.9,
                "permissions": ["TRANSPORTATION", "ERRANDS", "MEDICATION", "CHECK_INS", "PHARMACY"],
                "has_transport_capability": True,
                "phone": "+1 (555) 234-5678",
            },
            {
                "id": "c-2",
                "name": "Sarah Woodson",
                "relationship": "Daughter",
                "type": "FAMILY",
                "is_active": True,
                "is_available": True,
                "is_primary_contact": False,
                "parent_id": req.parent_id,
                "distance_km": 5.0,
                "reliability_score": 4.8,
                "permissions": ["TRANSPORTATION", "ERRANDS", "CHECK_INS"],
                "has_transport_capability": True,
                "phone": "+1 (555) 876-5432",
            },
            {
                "id": "c-3",
                "name": "Priya Sharma",
                "relationship": "Verified Volunteer",
                "type": "VOLUNTEER",
                "is_active": True,
                "is_verified": True,
                "verification_status": "VERIFIED",
                "is_available": True,
                "distance_km": 1.4,
                "reliability_score": 4.9,
                "permissions": ["TRANSPORTATION", "ERRANDS", "PHARMACY", "MEDICATION", "CHECK_INS"],
                "has_transport_capability": True,
                "phone": "+1 (555) 345-6789",
            },
        ]

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

    result = await db.execute(select(User).where(User.id == payload.assignee_id))
    assignee = result.scalars().first()
    assignee_name = payload.assignee_name or (assignee.full_name if assignee else ("David Woodson" if payload.assignee_id == "c-1" else ("Priya Sharma" if payload.assignee_id == "c-3" else "Assigned Helper")))
    assignee_role = payload.assignee_role or (assignee.role if assignee else ("Son (Family)" if payload.assignee_id == "c-1" else ("Verified Volunteer" if payload.assignee_id == "c-3" else "Family Member")))

    assigned_req = await CareRequestService.assign_care_request(
        db=db,
        request_id=request_id,
        assignee_id=payload.assignee_id,
        assignee_name=assignee_name,
        assignee_role=assignee_role,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        candidate_dto=payload.candidate_dto,
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

@router.post("/{request_id}/transition/{target_status}", summary="Transition Care Request State")
async def transition_care_request_status(
    request_id: str,
    target_status: str,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res_req.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest {request_id} not found.")

    required_perm = map_category_to_permission(req.category)
    await verify_parent_authorization(req.parent_id, required_perm, db, current_user)

    updated = await CareRequestService.update_request_status(
        db=db,
        request_id=request_id,
        target_status=target_status,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        reason=reason,
    )
    return updated
