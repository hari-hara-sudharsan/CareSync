import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.outbox import OutboxEvent, ProcessedEvent
from app.agent.strands_agent import CareCoordinatorAgent

logger = logging.getLogger(__name__)

class AgentEventConsumer:
    """
    Care Coordinator Agent Event Consumer.
    Listens to OutboxEvents (from Redis Pub/Sub or OutboxDispatcher), enforces consumer idempotency,
    and passes event facts to CareCoordinatorAgent observe-reason-act loop.
    """
    consumer_name: str = "CareCoordinatorAgent"

    def __init__(self, agent: Optional[CareCoordinatorAgent] = None):
        self.agent = agent or CareCoordinatorAgent()

    async def handle_event(self, event: OutboxEvent, db: AsyncSession) -> bool:
        # Idempotency check: verify if already processed by CareCoordinatorAgent
        res = await db.execute(
            select(ProcessedEvent).where(
                ProcessedEvent.event_id == event.id,
                ProcessedEvent.consumer_name == self.consumer_name,
            )
        )
        if res.scalars().first():
            logger.info(f"[{self.consumer_name}] Event '{event.id}' already processed by Agent. Safely ignoring.")
            return True

        logger.info(f"[{self.consumer_name}] Agent processing outbox event '{event.id}' ({event.event_type})")

        try:
            result = await self.agent.process_event(db, event)
            logger.info(f"[{self.consumer_name}] Agent result for event '{event.id}': {result.get('status')}")
        except Exception as exc:
            logger.error(f"[{self.consumer_name}] Agent exception processing event '{event.id}': {exc}. Continuing outbox dispatch.")

        # Record idempotent completion regardless of internal agent reasoning
        proc = ProcessedEvent(
            event_id=event.id,
            consumer_name=self.consumer_name,
            processed_at=datetime.now(timezone.utc),
        )
        db.add(proc)
        return True
