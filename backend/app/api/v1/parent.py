from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.parent import ParentProfile
from app.models.medication import Medication
from app.models.appointment import Appointment

router = APIRouter()

@router.get("/home", summary="Parent Home Read Model")
async def get_parent_home(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "status_banner": {
            "status": "ALL_CLEAR",
            "message": "✓ Everything is handled",
            "subtitle": "No urgent actions require your attention right now.",
        },
        "parent_name": current_user.full_name,
        "daily_checkin": {
            "status": "COMPLETED",
            "message": "Daily check-in completed at 08:30 AM",
        },
        "medication_preview": {
            "taken_count": 1,
            "total_count": 3,
            "next_medication": "Evening Metoprolol at 08:00 PM",
        },
        "appointment_preview": {
            "title": "Cardiology Routine Check-Up",
            "time": "Tomorrow at 10:30 AM",
            "transport_status": "REQUESTED",
        },
    }
