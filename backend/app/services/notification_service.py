import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Protocol
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.notification import NotificationRecord
from app.models.outbox import OutboxEvent

logger = logging.getLogger(__name__)

class NotificationAdapterInterface(Protocol):
    async def send_notification(
        self,
        db: AsyncSession,
        event_id: str,
        recipient_id: str,
        recipient_name: Optional[str],
        notification_type: str,
        channel: str,
        subject: Optional[str],
        body: str,
    ) -> NotificationRecord:
        ...

class DevelopmentNotificationAdapter:
    """
    Development & Test Notification Adapter.
    Logs delivery attempts and records persistent NotificationRecord instances in the database
    with strict deduplication key (event_id, recipient_id, notification_type).
    """
    async def send_notification(
        self,
        db: AsyncSession,
        event_id: str,
        recipient_id: str,
        recipient_name: Optional[str],
        notification_type: str, # PUSH, SMS, EMAIL
        channel: str,
        subject: Optional[str],
        body: str,
    ) -> NotificationRecord:
        # Idempotency Deduplication Check
        res = await db.execute(
            select(NotificationRecord).where(
                NotificationRecord.event_id == event_id,
                NotificationRecord.recipient_id == recipient_id,
                NotificationRecord.notification_type == notification_type,
            )
        )
        existing = res.scalars().first()
        if existing:
            logger.info(
                f"[DevelopmentNotificationAdapter] Duplicate notification intent for event '{event_id}', "
                f"recipient '{recipient_id}', type '{notification_type}'. Safely ignoring."
            )
            return existing

        logger.info(
            f"[DevelopmentNotificationAdapter] [{notification_type}] Channel: '{channel}' | "
            f"Recipient: {recipient_name or 'User'} ({recipient_id}) | Subject: '{subject or 'CareSync Alert'}' | Body: '{body}'"
        )

        record = NotificationRecord(
            event_id=event_id,
            recipient_id=recipient_id,
            recipient_name=recipient_name,
            notification_type=notification_type,
            channel=channel,
            subject=subject,
            body=body,
            status="SENT",
            sent_at=datetime.now(timezone.utc),
        )
        db.add(record)
        return record

class NotificationService:
    """
    Notification Application Service.
    Converts domain outbox facts into targeted notification intents (PUSH, SMS, EMAIL)
    using registered NotificationAdapters without coupling external delivery to domain transactions.
    """
    def __init__(self, adapter: Optional[NotificationAdapterInterface] = None):
        self.adapter = adapter or DevelopmentNotificationAdapter()

    async def notify_from_outbox_event(
        self, db: AsyncSession, event: OutboxEvent
    ) -> Optional[NotificationRecord]:
        payload = event.payload.get("data", {}) if isinstance(event.payload, dict) else {}
        event_type = event.event_type
        parent_id = event.payload.get("parent_id", "p-1") if isinstance(event.payload, dict) else "p-1"

        if "ESCALATED" in event_type or "FAILED" in event_type or "TIMEOUT" in event_type:
            return await self.adapter.send_notification(
                db=db,
                event_id=event.id,
                recipient_id=parent_id,
                recipient_name="Parent Guardian",
                notification_type="PUSH",
                channel="caresync:notifications:escalations",
                subject="CareSync Needs Your Attention",
                body=f"Care task requires your human approval. Reason: {payload.get('failure_reason', 'Escalated')}",
            )
        elif "COMPLETED" in event_type:
            return await self.adapter.send_notification(
                db=db,
                event_id=event.id,
                recipient_id=parent_id,
                recipient_name="Parent Guardian",
                notification_type="PUSH",
                channel="caresync:notifications:completions",
                subject="Care Task Completed",
                body=f"Your care task '{payload.get('title', 'Task')}' was marked complete. Please confirm completion.",
            )
        elif "CHECK_IN" in event_type:
            return await self.adapter.send_notification(
                db=db,
                event_id=event.id,
                recipient_id=parent_id,
                recipient_name="Parent Guardian",
                notification_type="PUSH",
                channel="caresync:notifications:checkins",
                subject="Daily Check-In Recorded",
                body=f"Parent check-in recorded: {payload.get('status_summary', 'Check-in completed')}",
            )
        
        return None
