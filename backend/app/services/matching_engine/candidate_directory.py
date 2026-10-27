from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.care_network import CareMember
from app.trust.models import VerificationRecord

class CandidateDirectory:
    """
    Builds matching/assignment candidates from authoritative database records.

    Candidate eligibility inputs (circle membership, permissions, verification status) are
    never taken from client payloads, so a caller cannot forge an eligible candidate.
    Availability is not yet modelled and defaults to available.
    """

    @staticmethod
    def _family_dto(member: CareMember, user: User) -> Dict[str, Any]:
        return {
            "id": user.id,
            "name": member.name,
            "relationship": member.relationship,
            "type": "FAMILY",
            "is_active": user.is_active,
            "is_available": True,
            "is_primary_contact": member.is_primary_contact,
            "parent_id": member.parent_id,
            "permissions": member.permissions or [],
            "location_label": member.location_label,
        }

    @staticmethod
    def _volunteer_dto(user: User, record: Optional[VerificationRecord]) -> Dict[str, Any]:
        is_verified = bool(record and record.status == "VERIFIED" and record.id_verified and record.background_checked)
        return {
            "id": user.id,
            "name": user.full_name,
            "relationship": "Verified Volunteer" if is_verified else "Volunteer",
            "type": "VOLUNTEER",
            "is_active": user.is_active,
            "is_verified": is_verified,
            "verification_status": (record.status if record else "UNVERIFIED") if not is_verified else "VERIFIED",
            "is_available": True,
            "permissions": [],
        }

    @staticmethod
    async def get_candidate_pool(db: AsyncSession, parent_id: str, volunteer_limit: int = 50) -> List[Dict[str, Any]]:
        res_family = await db.execute(
            select(CareMember, User)
            .join(User, User.id == CareMember.user_id)
            .where(CareMember.parent_id == parent_id, CareMember.status == "ACTIVE")
        )
        pool = [CandidateDirectory._family_dto(member, user) for member, user in res_family.all()]

        res_vol = await db.execute(
            select(User, VerificationRecord)
            .join(VerificationRecord, VerificationRecord.user_id == User.id)
            .where(
                User.role == "VOLUNTEER",
                User.is_active == True,
                VerificationRecord.status == "VERIFIED",
                VerificationRecord.id_verified == True,
                VerificationRecord.background_checked == True,
            )
            .limit(volunteer_limit)
        )
        pool.extend(CandidateDirectory._volunteer_dto(user, record) for user, record in res_vol.all())
        return pool

    @staticmethod
    async def get_candidate(db: AsyncSession, user_id: str, parent_id: str) -> Optional[Dict[str, Any]]:
        """Resolves a single assignee: an active circle member of this parent, or a registered volunteer."""
        res_family = await db.execute(
            select(CareMember, User)
            .join(User, User.id == CareMember.user_id)
            .where(
                CareMember.parent_id == parent_id,
                CareMember.user_id == user_id,
                CareMember.status == "ACTIVE",
            )
        )
        row = res_family.first()
        if row:
            return CandidateDirectory._family_dto(row[0], row[1])

        res_user = await db.execute(select(User).where(User.id == user_id, User.role == "VOLUNTEER"))
        user = res_user.scalars().first()
        if not user:
            return None
        res_rec = await db.execute(select(VerificationRecord).where(VerificationRecord.user_id == user_id))
        return CandidateDirectory._volunteer_dto(user, res_rec.scalars().first())
