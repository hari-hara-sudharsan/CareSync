from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.decision import DecisionCard
from app.schemas.decision import DecisionCardRead, DecisionResponseRequest

router = APIRouter()

@router.get("/home", summary="Family Caregiver Home Dashboard Read Model")
async def get_family_home(
    parent_id: str = "p-1",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "caregiver_id": current_user.id,
        "caregiver_name": current_user.full_name,
        "active_parent_id": parent_id,
        "active_parent_name": "Susan Woodson" if parent_id == "p-1" else "George Miller",
        "attention_needed_count": 1,
        "pending_decisions": [
            {
                "id": "dec-301",
                "parent_id": parent_id,
                "parent_name": "Susan Woodson (Mom)",
                "type": "TRANSPORTATION_CONFIRMATION",
                "priority": "CRITICAL",
                "status": "PENDING",
                "title": "Transportation Unconfirmed for Tomorrow's Appointment",
                "summary": "Mom has a Cardiology appointment tomorrow at 10:30 AM with Dr. Robert Chen. No family driver or volunteer has been assigned yet.",
                "reason": "CareSync Agent observed that Mom requested transport assistance 2 hours ago.",
                "actions": [
                    {"key": "confirm_family_driver", "label": "I Will Drive Mom (09:45 AM)", "variant": "primary"},
                    {"key": "request_volunteer_fallback", "label": "Assign Verified Volunteer Ride", "variant": "soft"},
                ],
            }
        ],
        "today_care_summary": {
            "check_in_status": "COMPLETED",
            "medication_status": "PARTIAL",
            "appointment_status": "TRANSPORT_NEEDED",
        },
    }

@router.post("/decisions/{decision_id}/respond", summary="Respond to Decision Card")
async def respond_decision(
    decision_id: str,
    req: DecisionResponseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "success": True,
        "decision_id": decision_id,
        "action_executed": req.action_key,
        "status": "ACCEPTED",
        "actor": current_user.full_name,
    }
