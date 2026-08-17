from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.core.authorization import enforce_care_permission, CarePermission, CareRole
from app.models.user import User
from app.models.care_request import CareRequest, AssignmentHistory
from app.schemas.care_request import CareRequestCreate, CareRequestRead, CareRequestAssign

router = APIRouter()

@router.get("", summary="Get Care Requests with Filters")
async def get_care_requests(
    parent_id: str = "p-1",
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Authorization Check
    enforce_care_permission(
        required_permission=CarePermission.ERRANDS,
        user_role=CareRole(current_user.role) if current_user.role in CareRole.__members__ else CareRole.FAMILY,
        granted_permissions=["CHECK_INS", "MEDICATION", "APPOINTMENTS", "TRANSPORTATION", "ERRANDS"],
        is_primary_contact=current_user.role == "PRIMARY_GUARDIAN",
    )

    return [
        {
            "id": "req-401",
            "parent_id": parent_id,
            "parent_name": "Susan Woodson",
            "category": "TRANSPORTATION",
            "title": "Ride to Cardiology Appointment",
            "description": "Mom needs a ride to St. Jude Medical Center for her 10:30 AM appointment with Dr. Robert Chen.",
            "priority": "CRITICAL",
            "status": "PENDING_ASSIGNMENT",
            "requested_time": "Tomorrow at 09:45 AM",
            "created_at": "2 hours ago",
            "location_name": "St. Jude Medical Center, Suite 402",
        },
        {
            "id": "req-402",
            "parent_id": parent_id,
            "parent_name": "Susan Woodson",
            "category": "PHARMACY",
            "title": "Prescription Refill Pickup",
            "description": "Pickup Lisinopril refill from CVS Pharmacy on Oak Street.",
            "priority": "HIGH",
            "status": "ASSIGNED",
            "requested_time": "Today by 05:00 PM",
            "created_at": "3 hours ago",
            "assigned_to_name": "David Woodson",
            "assigned_to_role": "Son (Primary Guardian)",
        },
    ]

@router.post("", summary="Create New Care Request")
async def create_care_request(
    req: CareRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_req = CareRequest(
        parent_id=req.parent_id,
        category=req.category,
        title=req.title,
        description=req.description,
        priority=req.priority,
        status="PENDING_ASSIGNMENT",
        requested_time=req.requested_time,
        location_name=req.location_name,
        address=req.address,
    )
    db.add(new_req)
    await db.commit()
    await db.refresh(new_req)
    return new_req

@router.post("/{request_id}/assign", summary="Assign Care Request to Candidate")
async def assign_care_request(
    request_id: str,
    payload: CareRequestAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "success": True,
        "request_id": request_id,
        "assigned_to": payload.assignee_id,
        "status": "ASSIGNED",
    }
