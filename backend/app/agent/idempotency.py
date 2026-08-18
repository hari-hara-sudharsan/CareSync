import hashlib
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.idempotency import IdempotencyRecord

class AgentActionIdempotency:
    """
    Idempotency Service for Agent Actions.
    
    Prevents duplicate notification spams or duplicate decision cards
    if the coordination loop restarts, retries, or runs concurrently.
    """

    @staticmethod
    def generate_key(
        agent_id: str, parent_id: str, action_type: str, target_id: str, date_slot: Optional[str] = None
    ) -> str:
        if not date_slot:
            date_slot = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")
        raw = f"{agent_id}:{parent_id}:{action_type}:{target_id}:{date_slot}"
        return f"agent_idx_{hashlib.sha256(raw.encode()).hexdigest()[:16]}"

    @staticmethod
    async def is_already_executed(db: AsyncSession, key: str) -> bool:
        result = await db.execute(select(IdempotencyRecord).where(IdempotencyRecord.idempotency_key == key))
        record = result.scalars().first()
        return record is not None

    @staticmethod
    async def record_execution(db: AsyncSession, key: str, agent_id: str, action_type: str, details: dict) -> None:
        rec = IdempotencyRecord(
            idempotency_key=key,
            user_id=agent_id,
            request_path=action_type,
            response_code=200,
            response_body=details,
        )
        db.add(rec)
        await db.commit()
