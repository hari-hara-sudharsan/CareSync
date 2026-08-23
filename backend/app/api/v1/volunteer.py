from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.api.deps import get_current_user, require_volunteer_role
from app.models.user import User
from app.models.care_request import CareRequest

router = APIRouter()

@router.get("/home", summary="Volunteer Workspace Home Read Model")
async def get_volunteer_home(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_volunteer_role),
):
    """
    Volunteer Workspace Read Model Endpoint.
    Strictly guarded by VOLUNTEER or ADMIN role requirement.
    Direct API access by unauthorized roles (PARENT, FAMILY) returns HTTP 403 Forbidden.
    """
    # Fetch assigned care requests
    res_assigned = await db.execute(
        select(CareRequest)
        .where(
            CareRequest.assigned_volunteer_id == current_user.id,
            CareRequest.status.in_(["ASSIGNED", "IN_PROGRESS"])
        )
        .order_by(desc(CareRequest.created_at))
    )
    assigned_tasks = res_assigned.scalars().all()

    # Fetch available candidate tasks
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
        "verification_status": "VERIFIED" if current_user.is_verified else "PENDING",
        "reliability_score": 98.5,
        "assigned_tasks_count": len(assigned_tasks),
        "assigned_tasks": [
            {
                "id": t.id,
                "parent_id": t.parent_id,
                "category": t.category,
                "title": t.title,
                "description": t.description,
                "priority": t.priority,
                "status": t.status,
                "requested_time": t.requested_time,
            }
            for t in assigned_tasks
        ],
        "available_opportunities": [
            {
                "id": t.id,
                "parent_id": t.parent_id,
                "category": t.category,
                "title": t.title,
                "description": t.description,
                "priority": t.priority,
                "requested_time": t.requested_time,
            }
            for t in open_tasks
        ],
    }

@router.get("/tasks", summary="Get Eligible Volunteer Care Tasks")
async def get_volunteer_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_volunteer_role),
):
    """
    Returns available care request tasks eligible for volunteer acceptance.
    Guarded by VOLUNTEER role boundary.
    """
    res = await db.execute(
        select(CareRequest)
        .where(CareRequest.status.in_(["PENDING_ASSIGNMENT", "ASSIGNED"]))
        .order_by(desc(CareRequest.created_at))
    )
    tasks = res.scalars().all()
    return [
        {
            "id": t.id,
            "parent_id": t.parent_id,
            "category": t.category,
            "title": t.title,
            "description": t.description,
            "priority": t.priority,
            "status": t.status,
            "requested_time": t.requested_time,
            "assigned_volunteer_id": t.assigned_volunteer_id,
        }
        for t in tasks
    ]
