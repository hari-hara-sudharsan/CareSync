import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.outbox import OutboxEvent

class OutboxService:
    """
    Transactional Outbox Domain Service.
    Writes durable domain events atomically into the database within the active domain transaction.
    Outbox events are FACTS (what happened), not commands.
    """

    @staticmethod
    def create_outbox_event(
        db: AsyncSession,
        aggregate_type: str,
        aggregate_id: str,
        event_type: str,
        payload: Dict[str, Any],
        parent_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
        causation_id: Optional[str] = None,
    ) -> OutboxEvent:
        event_id = str(uuid.uuid4())
        occurred_at = datetime.now(timezone.utc).isoformat()

        structured_payload = {
            "event_id": event_id,
            "event_type": event_type,
            "aggregate_type": aggregate_type,
            "aggregate_id": aggregate_id,
            "parent_id": parent_id,
            "occurred_at": occurred_at,
            "schema_version": "1.0",
            "correlation_id": correlation_id or event_id,
            "causation_id": causation_id or event_id,
            "data": payload,
        }

        outbox_event = OutboxEvent(
            id=event_id,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            event_type=event_type,
            payload=structured_payload,
            status="PENDING",
            retry_count=0,
        )

        db.add(outbox_event)
        return outbox_event
