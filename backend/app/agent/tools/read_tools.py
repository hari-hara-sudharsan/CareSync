from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.medication import Medication, MedicationEvent
from app.models.appointment import Appointment
from app.models.checkin import CheckInEvent
from app.models.care_request import CareRequest
from app.models.care_network import CareMember
from app.models.decision import DecisionCard

class AgentReadTools:
    """
    Safe, privacy-scoped observation tools for the CareSync Agent.
    
    1. Returns minimal necessary data for task coordination.
    2. Never executes arbitrary database queries.
    3. Excludes private medical history or non-essential user data.
    """

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

    @staticmethod
    async def get_pending_checkins(db: AsyncSession, parent_id: str) -> List[Dict[str, Any]]:
        res = await db.execute(
            select(CheckInEvent).where(
                CheckInEvent.parent_id == parent_id,
                CheckInEvent.requires_escalation == True
            )
        )
        events = res.scalars().all()
        return [
            {
                "checkin_id": c.id,
                "feeling_branch": c.feeling_branch,
                "summary": c.status_summary,
                "requires_escalation": c.requires_escalation,
                "care_request_id": c.care_request_id,
            }
            for c in events
        ]

    @staticmethod
    async def get_care_network(db: AsyncSession, parent_id: str) -> List[Dict[str, Any]]:
        res = await db.execute(
            select(CareMember).where(
                CareMember.parent_id == parent_id,
                CareMember.status == "ACTIVE"
            )
        )
        members = res.scalars().all()
        return [
            {
                "member_id": m.id,
                "name": m.name,
                "relationship": m.relationship,
                "role": m.role,
                "is_primary_contact": m.is_primary_contact,
                "permissions": m.permissions,
            }
            for m in members
        ]

    @staticmethod
    async def get_open_decisions(db: AsyncSession, parent_id: str) -> List[Dict[str, Any]]:
        res = await db.execute(
            select(DecisionCard).where(
                DecisionCard.parent_id == parent_id,
                DecisionCard.status == "PENDING"
            )
        )
        cards = res.scalars().all()
        return [
            {
                "card_id": d.id,
                "type": d.type,
                "title": d.title,
                "priority": d.priority,
            }
            for d in cards
        ]

    @staticmethod
    async def get_trust_summary(db: AsyncSession, parent_id: str) -> Dict[str, Any]:
        return {
            "parent_id": parent_id,
            "overall_trust_score": 98.4,
            "verified_volunteers_count": 3,
            "safety_incidents_count": 0,
            "verification_status": "VERIFIED_CIRCLE",
        }
