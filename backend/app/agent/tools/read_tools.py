from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.medication import Medication, MedicationEvent
from app.models.appointment import Appointment
from app.models.checkin import CheckInEvent
from app.models.care_request import CareRequest
from app.models.care_network import CareMember

class AgentReadTools:
    """Safe, read-only observation tools for the CareSync Agent."""

    @staticmethod
    async def get_due_medications(db: AsyncSession, parent_id: str) -> List[Dict[str, Any]]:
        res_meds = await db.execute(select(Medication).where(Medication.parent_id == parent_id))
        meds = res_meds.scalars().all()

        res_events = await db.execute(select(MedicationEvent).where(MedicationEvent.parent_id == parent_id))
        events = {e.medication_id: e for e in res_events.scalars().all()}

        due_list = []
        for m in meds:
            ev = events.get(m.id)
            if not ev or ev.status in ["DUE", "SCHEDULED", "MISSED"]:
                due_list.append({
                    "medication_id": m.id,
                    "name": m.name,
                    "dosage": m.dosage,
                    "instructions": m.instructions,
                    "status": ev.status if ev else "DUE",
                })
        return due_list

    @staticmethod
    async def get_upcoming_appointments(db: AsyncSession, parent_id: str) -> List[Dict[str, Any]]:
        res = await db.execute(select(Appointment).where(Appointment.parent_id == parent_id, Appointment.status == "UPCOMING"))
        appts = res.scalars().all()
        return [
            {
                "appointment_id": a.id,
                "title": a.title,
                "provider_name": a.provider_name,
                "starts_at": a.starts_at,
                "transportation_choice": a.transportation_choice,
                "transportation_status": a.transportation_status,
            }
            for a in appts
        ]

    @staticmethod
    async def get_open_care_requests(db: AsyncSession, parent_id: str) -> List[Dict[str, Any]]:
        res = await db.execute(
            select(CareRequest).where(
                CareRequest.parent_id == parent_id,
                CareRequest.status.in_(["PENDING_ASSIGNMENT", "ASSIGNED", "DECLINED"])
            )
        )
        reqs = res.scalars().all()
        return [
            {
                "request_id": r.id,
                "category": r.category,
                "title": r.title,
                "priority": r.priority,
                "status": r.status,
                "assigned_to": r.assigned_to_name,
            }
            for r in reqs
        ]
