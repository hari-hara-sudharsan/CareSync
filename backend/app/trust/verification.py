from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.trust.models import VerificationRecord

class VerificationService:
    """
    Candidate Verification Service for CareSync Trust Layer.
    
    Validates candidate status (UNVERIFIED, PENDING, VERIFIED, SUSPENDED, REVOKED).
    Serves as an authoritative hard filter before candidate scoring in Matching Engine.
    """

    @staticmethod
    async def is_candidate_eligible(
        db: AsyncSession, user_id: str, candidate_type: str = "VOLUNTEER"
    ) -> bool:
        # Family members within parent circle default to verified status
        if candidate_type == "FAMILY":
            return True

        res = await db.execute(select(VerificationRecord).where(VerificationRecord.user_id == user_id))
        record = res.scalars().first()

        if not record:
            return False # Default unverified candidates are hard-rejected for volunteer pool

        if record.status in ["SUSPENDED", "REVOKED", "UNVERIFIED", "PENDING"]:
            return False

        return record.status == "VERIFIED" and record.id_verified and record.background_checked

    @staticmethod
    async def update_verification_status(
        db: AsyncSession, user_id: str, new_status: str, notes: Optional[str] = None
    ) -> VerificationRecord:
        res = await db.execute(select(VerificationRecord).where(VerificationRecord.user_id == user_id))
        rec = res.scalars().first()

        if not rec:
            rec = VerificationRecord(
                user_id=user_id,
                status=new_status,
                id_verified=new_status == "VERIFIED",
                background_checked=new_status == "VERIFIED",
                notes=notes,
            )
            db.add(rec)
        else:
            rec.status = new_status
            if notes:
                rec.notes = notes

        await db.commit()
        await db.refresh(rec)
        return rec
