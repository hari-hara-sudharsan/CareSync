import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.parent import ParentProfile
from app.models.care_network import CareMember
from app.models.care_request import CareRequest
from app.models.medication import Medication
from app.models.appointment import Appointment
from app.models.decision import DecisionCard, AuditEvent
from app.models.checkin import CheckInEvent

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/reset", status_code=status.HTTP_200_OK)
async def reset_demo_environment(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Resets the CareSync presentation database to a clean, deterministic seed state.
    Provides a repeatable baseline for the 5-minute hackathon live demonstration.
    Enforces DEMO_RESET_ENABLED flag to prevent execution in production environments.
    """
    if not settings.DEMO_RESET_ENABLED:
        logger.warning("Attempted execution of POST /api/v1/demo/reset when DEMO_RESET_ENABLED is False.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo reset endpoint is disabled in production environments.",
        )

    logger.info("Executing demo database reset to baseline presentation dataset...")

    # 1. Clean existing presentation entities
    await db.execute(delete(DecisionCard).where(DecisionCard.parent_id == "p-1"))
    await db.execute(delete(CareRequest).where(CareRequest.parent_id == "p-1"))
    await db.execute(delete(Medication).where(Medication.parent_id == "p-1"))
    await db.execute(delete(Appointment).where(Appointment.parent_id == "p-1"))
    await db.execute(delete(CheckInEvent).where(CheckInEvent.parent_id == "p-1"))
    await db.execute(delete(CareMember).where(CareMember.parent_id == "p-1"))

    # 2. Seed Users & Parent Profile
    parent_user = await db.scalar(select(User).where(User.id == "usr-pj-1"))
    if not parent_user:
        parent_user = User(
            id="usr-pj-1",
            phone="+15551234567",
            full_name="Susan Woodson",
            role="PARENT",
            is_active=True,
        )
        db.add(parent_user)

    family_user_1 = await db.scalar(select(User).where(User.id == "u-family-1"))
    if not family_user_1:
        family_user_1 = User(
            id="u-family-1",
            phone="+15559876543",
            full_name="David Woodson",
            role="FAMILY",
            is_active=True,
        )
        db.add(family_user_1)

    family_user_2 = await db.scalar(select(User).where(User.id == "u-family-2"))
    if not family_user_2:
        family_user_2 = User(
            id="u-family-2",
            phone="+15558765432",
            full_name="Sarah Woodson",
            role="FAMILY",
            is_active=True,
        )
        db.add(family_user_2)

    vol_user = await db.scalar(select(User).where(User.id == "u-vol-1"))
    if not vol_user:
        vol_user = User(
            id="u-vol-1",
            phone="+15557654321",
            full_name="David Miller",
            role="VOLUNTEER",
            is_active=True,
        )
        db.add(vol_user)

    await db.flush()

    parent_profile = await db.scalar(select(ParentProfile).where(ParentProfile.id == "p-1"))
    if not parent_profile:
        parent_profile = ParentProfile(
            id="p-1",
            user_id="usr-pj-1",
            full_name="Susan Woodson",
            age=78,
            preferred_language="en",
            emergency_contact_phone="+15559876543",
            care_situation="INDEPENDENT_WITH_ASSIST",
            home_address="742 Evergreen Terrace, Springfield",
            care_status="ALL_CLEAR",
            timezone="UTC",
        )
        db.add(parent_profile)

    # 3. Seed Care Network Members
    m1 = CareMember(
        id="m-1",
        parent_id="p-1",
        user_id="u-family-1",
        name="David Woodson",
        relationship="Son",
        role="PRIMARY",
        phone="+15559876543",
        status="ACTIVE",
        permissions=["DECISIONS", "READ", "EDIT"],
        is_primary_contact=True,
        location_label="Springfield, 5 mi away",
    )
    m2 = CareMember(
        id="m-2",
        parent_id="p-1",
        user_id="u-family-2",
        name="Sarah Woodson",
        relationship="Daughter",
        role="SECONDARY",
        phone="+15558765432",
        status="ACTIVE",
        permissions=["READ"],
        is_primary_contact=False,
        location_label="Chicago, Remote",
    )
    m3 = CareMember(
        id="m-3",
        parent_id="p-1",
        user_id="u-vol-1",
        name="David Miller",
        relationship="Volunteer Caregiver",
        role="VOLUNTEER",
        phone="+15557654321",
        status="ACTIVE",
        permissions=["EXECUTE_ASSIGNED"],
        is_primary_contact=False,
        location_label="Springfield, 2 mi away",
    )
    db.add_all([m1, m2, m3])

    # 4. Seed Medication & Appointment
    med = Medication(
        id="med-demo-1",
        parent_id="p-1",
        name="Lisinopril",
        dosage="10mg",
        instructions="Take 1 tablet every morning with water",
        refill_status="SUFFICIENT",
    )
    appt = Appointment(
        id="appt-demo-1",
        parent_id="p-1",
        title="Cardiology Follow-Up",
        provider_name="Dr. Chen (Cardiology)",
        location_name="Springfield Medical Center",
        address="Suite 400, Springfield",
        starts_at="Tomorrow 10:30 AM",
        transportation_status="UNASSIGNED",
    )
    db.add_all([med, appt])

    # 5. Seed Initial Care Request & Decision Card Recommendation
    req = CareRequest(
        id="req-demo-101",
        parent_id="p-1",
        category="GROCERIES",
        title="Weekly Grocery Pickup from Safeway",
        description="Need milk, fresh produce, and soup delivered before noon tomorrow.",
        priority="NORMAL",
        status="PENDING_ASSIGNMENT",
        requested_time="Tomorrow 11:00 AM",
    )
    db.add(req)

    card = DecisionCard(
        id="card-demo-101",
        parent_id="p-1",
        type="MATCHING_REVIEW",
        priority="NORMAL",
        title="Approve Grocery Helper Recommendation",
        summary="CareSync found a suitable verified volunteer (David Miller, Background Checked, 100% Reliability) and prepared a recommendation for the family.",
        reason="Agent evaluated candidate availability and verified credentials via deterministic matching engine.",
        actions=[
            {"key": "assign_candidate", "label": "Approve Candidate"},
            {"key": "decline_candidate", "label": "Request Alternative"},
        ],
        status="PENDING",
    )
    db.add(card)

    audit = AuditEvent(
        actor_id="demo-system-admin",
        actor_name="Demo Environment Control",
        action="DEMO_ENVIRONMENT_RESET",
        resource_type="System",
        details={"status": "RESET_SUCCESSFUL", "parent_id": "p-1"},
    )
    db.add(audit)

    await db.commit()

    logger.info("Demo environment reset complete. Deterministic baseline ready.")
    return {
        "status": "RESET_SUCCESSFUL",
        "message": "CareSync demo dataset restored to clean presentation state.",
        "seed_parent": "Susan Woodson (p-1)",
        "seed_primary_caregiver": "David Woodson (u-family-1)",
        "seed_volunteer": "David Miller (u-vol-1)",
        "active_request": "Grocery Pickup from Safeway (req-demo-101)",
        "pending_decision": "Approve Grocery Helper Recommendation (card-demo-101)",
    }
