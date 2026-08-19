import logging
from datetime import datetime, timezone
from typing import List, Optional, Protocol, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.outbox import OutboxEvent, ProcessedEvent

logger = logging.getLogger(__name__)

class EventConsumerInterface(Protocol):
    consumer_name: str
    async def handle_event(self, event: OutboxEvent, db: AsyncSession) -> bool:
        ...

class LoggingEventConsumer:
    """
    Default Logging & Audit Event Consumer.
    Processes OutboxEvents idempotently by recording ProcessedEvent records in the database.
    """
    consumer_name: str = "LoggingEventConsumer"

    async def handle_event(self, event: OutboxEvent, db: AsyncSession) -> bool:
        # Idempotency check: verify if already processed by this consumer
        res = await db.execute(
            select(ProcessedEvent).where(
                ProcessedEvent.event_id == event.id,
                ProcessedEvent.consumer_name == self.consumer_name,
            )
        )
        if res.scalars().first():
            logger.info(f"[{self.consumer_name}] Event '{event.id}' already processed. Safely ignoring.")
            return True

        # Process domain event (logging fact representation)
        logger.info(
            f"[{self.consumer_name}] Processed Event '{event.event_type}' "
            f"(ID: {event.id}, Aggregate: {event.aggregate_type}/{event.aggregate_id})"
        )

        # Record idempotent completion
        proc = ProcessedEvent(
            event_id=event.id,
            consumer_name=self.consumer_name,
            processed_at=datetime.now(timezone.utc),
        )
        db.add(proc)
        return True

class OutboxDispatcherService:
    """
    Outbox Event Dispatcher.
    Claims pending OutboxEvents using database-level row locking (SELECT FOR UPDATE SKIP LOCKED),
    dispatches events to registered consumers, updates dispatch status, and manages retries/failures.
    """

    @staticmethod
    async def dispatch_pending_events(
        db: AsyncSession,
        batch_size: int = 10,
        max_retries: int = 3,
        consumer: Optional[Any] = None,
    ) -> Dict[str, Any]:
        if consumer is None:
            consumer = LoggingEventConsumer()

        # Database-level claiming using SELECT FOR UPDATE with skip_locked
        stmt = (
            select(OutboxEvent)
            .where(OutboxEvent.status == "PENDING")
            .order_by(OutboxEvent.created_at)
            .limit(batch_size)
            .with_for_update(skip_locked=True)
        )

        result = await db.execute(stmt)
        pending_events: List[OutboxEvent] = result.scalars().all()

        dispatched_count = 0
        failed_count = 0

        for event in pending_events:
            try:
                success = await consumer.handle_event(event, db)
                if success:
                    event.status = "DISPATCHED"
                    event.processed_at = datetime.now(timezone.utc)
                    dispatched_count += 1
                else:
                    raise RuntimeError(f"Consumer '{consumer.consumer_name}' failed to handle event '{event.id}'")
            except Exception as exc:
                logger.error(f"Error dispatching event '{event.id}': {exc}")
                event.retry_count += 1
                event.error_message = str(exc)
                if event.retry_count >= max_retries:
                    event.status = "FAILED"
                failed_count += 1

        await db.commit()

        return {
            "claimed_count": len(pending_events),
            "dispatched_count": dispatched_count,
            "failed_count": failed_count,
        }

    @staticmethod
    async def retry_failed_events(
        db: AsyncSession,
        max_events: int = 10,
    ) -> int:
        """Manually reset FAILED events back to PENDING for investigation/retry."""
        stmt = (
            select(OutboxEvent)
            .where(OutboxEvent.status == "FAILED")
            .limit(max_events)
            .with_for_update(skip_locked=True)
        )
        result = await db.execute(stmt)
        failed_events = result.scalars().all()
        for evt in failed_events:
            evt.status = "PENDING"
            evt.retry_count = 0
            evt.error_message = None
        await db.commit()
        return len(failed_events)
