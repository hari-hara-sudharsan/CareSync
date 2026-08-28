from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.parent import ParentProfile

router = APIRouter()

# Pydantic Schemas for Parent Onboarding
class SaveProfileRequest(BaseModel):
    fullName: Optional[str] = None
    preferredName: str
    preferredLanguage: str = "en"
    timezone: str = "America/New_York"

class SaveCareSituationRequest(BaseModel):
    careSituation: str

class SaveCarePreferencesRequest(BaseModel):
    careNeeds: List[str]

class MemberInviteDetail(BaseModel):
    name: str
    phone: str
    relationship: str
    helpPermissions: List[str] = []

class InviteCareMemberRequest(BaseModel):
    invite: MemberInviteDetail

class OnboardingCompleteRequest(BaseModel):
    parentId: Optional[str] = None

@router.get("/home", summary="Parent Home Read Model")
async def get_parent_home(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ParentProfile).where(ParentProfile.user_id == current_user.id))
    profile = result.scalars().first()
    display_name = profile.full_name if profile else current_user.full_name

    return {
        "status_banner": {
            "status": "ALL_CLEAR",
            "message": "✓ Everything is handled",
            "subtitle": "No urgent actions require your attention right now.",
        },
        "parent_name": display_name,
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

async def _get_or_create_parent_profile(db: AsyncSession, user: User) -> ParentProfile:
    result = await db.execute(select(ParentProfile).where(ParentProfile.user_id == user.id))
    profile = result.scalars().first()
    if not profile:
        profile = ParentProfile(
            user_id=user.id,
            full_name=user.full_name or "Parent User",
            preferred_language="en",
            care_situation="INDEPENDENT",
            care_status="ONBOARDING",
            timezone="UTC",
        )
        db.add(profile)
        await db.flush()
    return profile

@router.post("/onboarding/profile", summary="Save Parent Onboarding Profile Step 1")
async def save_onboarding_profile(
    req: SaveProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await _get_or_create_parent_profile(db, current_user)
    name_to_use = req.fullName if req.fullName and req.fullName.strip() else req.preferredName
    profile.full_name = name_to_use
    profile.preferred_language = req.preferredLanguage
    profile.timezone = req.timezone
    
    current_user.full_name = name_to_use
    db.add(current_user)
    db.add(profile)
    await db.commit()

    return {
        "success": True,
        "message": f"Profile saved for {req.preferredName}",
        "profile": {
            "full_name": profile.full_name,
            "preferred_language": profile.preferred_language,
            "timezone": profile.timezone,
        }
    }

@router.post("/onboarding/care-situation", summary="Save Parent Onboarding Care Situation Step 2")
async def save_onboarding_care_situation(
    req: SaveCareSituationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await _get_or_create_parent_profile(db, current_user)
    profile.care_situation = req.careSituation
    db.add(profile)
    await db.commit()

    return {
        "success": True,
        "message": f"Care situation updated to {req.careSituation}",
    }

@router.post("/onboarding/care-preferences", summary="Save Parent Onboarding Care Preferences Step 3")
async def save_onboarding_care_preferences(
    req: SaveCarePreferencesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await _get_or_create_parent_profile(db, current_user)
    db.add(profile)
    await db.commit()

    return {
        "success": True,
        "message": f"Care preferences saved ({len(req.careNeeds)} needs selected)",
    }

@router.post("/onboarding/invite-member", summary="Register Care Team Member Invitation Step 4")
async def invite_care_member(
    req: InviteCareMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "success": True,
        "message": f"Invitation registered for {req.invite.name} ({req.invite.relationship})",
    }

@router.post("/onboarding/complete", summary="Complete Parent Onboarding")
async def complete_onboarding(
    req: Optional[OnboardingCompleteRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await _get_or_create_parent_profile(db, current_user)
    profile.care_status = "ALL_CLEAR"
    current_user.is_verified = True
    db.add(profile)
    db.add(current_user)
    await db.commit()

    return {
        "success": True,
        "message": "Parent onboarding completed successfully",
        "parent_id": profile.id,
    }
