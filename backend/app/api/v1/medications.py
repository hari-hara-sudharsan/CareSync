from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.medication import Medication, MedicationEvent
from app.services.care_request_service import CareRequestService
from pydantic import BaseModel

router = APIRouter()

class MedicationEventCreateSchema(BaseModel):
    status: str # 'TAKEN' | 'SKIPPED' | 'MISSED' | 'LATE'
    notes: Optional[str] = None

@router.get("/today", summary="Get Today's Medication Timeline")
async def get_today_medications(
    parent_id: str = "p-1",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await CareRequestService.verify_parent_access(db, current_user.id, parent_id)

    # Fetch medications for parent
    res = await db.execute(select(Medication).where(Medication.parent_id == parent_id))
    meds = res.scalars().all()

    if not meds:
        # Seed initial demo medications for testing
        m1 = Medication(id="med-101", parent_id=parent_id, name="Lisinopril", dosage="10 mg", instructions="Take 1 tablet daily in the morning with water", prescribing_doctor="Dr. Robert Chen")
        m2 = Medication(id="med-102", parent_id=parent_id, name="Metformin", dosage="500 mg", instructions="Take 1 tablet twice daily with meals", prescribing_doctor="Dr. Sarah Jenkins")
        m3 = Medication(id="med-103", parent_id=parent_id, name="Metoprolol", dosage="25 mg", instructions="Take 1 tablet at bedtime", prescribing_doctor="Dr. Robert Chen")
        db.add_all([m1, m2, m3])
        await db.commit()
        meds = [m1, m2, m3]

    # Fetch recorded events
    events_res = await db.execute(select(MedicationEvent).where(MedicationEvent.parent_id == parent_id))
    recorded_events = events_res.scalars().all()
    event_map = {e.medication_id: e for e in recorded_events}

    timeline = []
    for m in meds:
        ev = event_map.get(m.id)
        timeline.append({
            "medication_id": m.id,
            "name": m.name,
            "dosage": m.dosage,
            "instructions": m.instructions,
            "prescribing_doctor": m.prescribing_doctor,
            "scheduled_time": "08:00 AM" if m.name == "Lisinopril" else ("01:00 PM" if m.name == "Metformin" else "08:00 PM"),
            "status": ev.status if ev else ("TAKEN" if m.name == "Lisinopril" else "DUE"),
            "recorded_at": ev.recorded_at if ev else None,
        })

    return {
        "parent_id": parent_id,
        "date": "Today",
        "taken_count": sum(1 for item in timeline if item["status"] == "TAKEN"),
        "total_count": len(timeline),
        "timeline": timeline,
    }

@router.post("/{medication_id}/events", summary="Record Medication Event Action (Taken / Skipped)")
async def record_medication_event(
    medication_id: str,
    payload: MedicationEventCreateSchema,
    parent_id: str = "p-1",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await CareRequestService.verify_parent_access(db, current_user.id, parent_id)

    valid_statuses = ["TAKEN", "SKIPPED", "MISSED", "LATE"]
    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid medication status '{payload.status}'. Valid statuses: {valid_statuses}"
        )

    # Fetch or create event
    res = await db.execute(
        select(MedicationEvent).where(
            MedicationEvent.medication_id == medication_id,
            MedicationEvent.parent_id == parent_id
        )
    )
    event = res.scalars().first()

    now_iso = datetime.now(timezone.utc).strftime("%I:%M %p")
    if event:
        event.status = payload.status
        event.recorded_at = now_iso
        event.recorded_by_id = current_user.id
    else:
        event = MedicationEvent(
            medication_id=medication_id,
            parent_id=parent_id,
            scheduled_time="Today",
            status=payload.status,
            recorded_at=now_iso,
            recorded_by_id=current_user.id,
        )
        db.add(event)

    await db.commit()
    await db.refresh(event)

    return {
        "success": True,
        "medication_id": medication_id,
        "status": event.status,
        "recorded_at": event.recorded_at,
    }
