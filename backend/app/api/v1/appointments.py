from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.appointment import Appointment, TransportationRequest
from app.models.care_request import CareRequest
from app.services.care_request_service import CareRequestService
from pydantic import BaseModel

router = APIRouter()

class TransportationChoiceSchema(BaseModel):
    transportation_choice: str # 'FAMILY_MEMBER' | 'OWN_TRANSPORT' | 'PUBLIC_TRANSIT' | 'NEED_HELP' | 'NOT_DECIDED'
    notes: Optional[str] = None

@router.get("", summary="Get Upcoming Parent Appointments")
async def get_appointments(
    parent_id: str = "p-1",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await CareRequestService.verify_parent_access(db, current_user.id, parent_id)

    res = await db.execute(select(Appointment).where(Appointment.parent_id == parent_id))
    appts = res.scalars().all()

    if not appts:
        # Seed initial demo appointment
        a1 = Appointment(
            id="apt-201",
            parent_id=parent_id,
            title="Cardiology Routine Check-Up",
            provider_name="Dr. Robert Chen",
            specialty="Cardiology",
            location_name="St. Jude Medical Center, Suite 402",
            address="1400 Community Drive",
            starts_at="Tomorrow at 10:30 AM",
            ends_at="Tomorrow at 11:30 AM",
            status="UPCOMING",
            notes="Please bring recent blood pressure log and current medication bottles.",
            transportation_choice="NOT_DECIDED",
            transportation_status="UNCONFIRMED",
        )
        db.add(a1)
        await db.commit()
        appts = [a1]

    return appts

@router.post("/{appointment_id}/transportation", summary="Update Appointment Transportation Choice (Triggers CareRequest if NEED_HELP)")
async def update_appointment_transportation(
    appointment_id: str,
    payload: TransportationChoiceSchema,
    parent_id: str = "p-1",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await CareRequestService.verify_parent_access(db, current_user.id, parent_id)

    res = await db.execute(select(Appointment).where(Appointment.id == appointment_id, Appointment.parent_id == parent_id))
    appt = res.scalars().first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Appointment {appointment_id} not found.")

    appt.transportation_choice = payload.transportation_choice

    created_care_request_id = None
    created_transport_id = None

    # Cross-Domain Trigger: Selecting NEED_HELP creates a TransportationRequest + CareRequest
    if payload.transportation_choice == "NEED_HELP":
        appt.transportation_status = "REQUESTED"

        # 1. Create TransportationRequest record
        t_req = TransportationRequest(
            appointment_id=appt.id,
            parent_id=parent_id,
            pickup_address="1428 Elm Street, Apt 4B", # Default home address
            destination_address=appt.address,
            pickup_time="Tomorrow at 09:45 AM",
            mobility_requirements={"wheelchair_accessible": False, "escort_needed": True},
            status="REQUESTED",
        )
        db.add(t_req)
        await db.flush()
        created_transport_id = t_req.id

        # 2. Create CareRequest for family/volunteer assignment
        care_req = await CareRequestService.create_care_request(
            db=db,
            user_id=current_user.id,
            user_name=current_user.full_name,
            parent_id=parent_id,
            category="TRANSPORTATION",
            title=f"Ride to {appt.title}",
            description=f"Transportation requested for appointment with {appt.provider_name} at {appt.location_name}.",
            priority="CRITICAL",
            requested_time="Tomorrow at 09:45 AM",
            location_name=appt.location_name,
            address=appt.address,
        )
        created_care_request_id = care_req.id
    elif payload.transportation_choice in ["FAMILY_MEMBER", "OWN_TRANSPORT", "PUBLIC_TRANSIT"]:
        appt.transportation_status = "CONFIRMED"

    await db.commit()
    await db.refresh(appt)

    return {
        "success": True,
        "appointment_id": appt.id,
        "transportation_choice": appt.transportation_choice,
        "transportation_status": appt.transportation_status,
        "care_request_created": payload.transportation_choice == "NEED_HELP",
        "care_request_id": created_care_request_id,
    }
