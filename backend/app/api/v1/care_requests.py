from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.care_request import CareRequest, AssignmentHistory
from app.models.care_network import CareMember
from app.schemas.care_request import CareRequestCreate, CareRequestRead, CareRequestAssign
from app.services.care_request_service import CareRequestService
from app.services.care_request_state_machine import CareRequestStatus
from app.services.matching_engine.matching_service import MatchingEngineService

router = APIRouter()

@router.get("", summary="Get Care Requests with Filters & Parent Isolation")
async def get_care_requests(
    parent_id: str = "p-1",
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await CareRequestService.verify_parent_access(db, current_user.id, parent_id)

    query = select(CareRequest).where(CareRequest.parent_id == parent_id)
    if status_filter:
        query = query.where(CareRequest.status == status_filter)
    
    result = await db.execute(query)
    requests = result.scalars().all()
    return requests

@router.post("", summary="Create New Care Request (Transactional)")
async def create_care_request(
    req: CareRequestCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await CareRequestService.verify_parent_access(db, current_user.id, req.parent_id)

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest {request_id} not found.")

    await CareRequestService.verify_parent_access(db, current_user.id, req.parent_id)

    # Candidate Pool for Matching Engine Evaluation
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
            "permissions": ["TRANSPORTATION", "ERRANDS", "MEDICATION", "CHECK_INS"],
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
            "is_available": True,
            "distance_km": 1.4,
            "reliability_score": 4.9,
            "permissions": ["TRANSPORTATION", "ERRANDS"],
            "has_transport_capability": True,
            "phone": "+1 (555) 345-6789",
        },
    ]

    recommendation = MatchingEngineService.match_candidates(req, candidate_pool)
    return recommendation

@router.post("/{request_id}/assign", summary="Assign Care Request to Candidate (Atomic Transaction)")
async def assign_care_request(
    request_id: str,
    payload: CareRequestAssign,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == payload.assignee_id))
    assignee = result.scalars().first()
    assignee_name = assignee.full_name if assignee else "Assigned Helper"
    assignee_role = assignee.role if assignee else "Family Member"

    assigned_req = await CareRequestService.assign_care_request(
        db=db,
        request_id=request_id,
        assignee_id=payload.assignee_id,
        assignee_name=assignee_name,
        assignee_role=assignee_role,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        idempotency_key=idempotency_key,
    )
    return assigned_req

@router.post("/{request_id}/transition/{target_status}", summary="Transition Care Request State")
async def transition_care_request_status(
    request_id: str,
    target_status: str,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = await CareRequestService.update_request_status(
        db=db,
        request_id=request_id,
        target_status=target_status,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        reason=reason,
    )
    return updated
