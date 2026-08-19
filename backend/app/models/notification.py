from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class NotificationRecord(BaseModel):
    """
    Persistent Notification Delivery Attempt Model.
    Tracks notification intents, recipients, channels, status, and deduplication keys,
    ensuring external notification failures do not corrupt domain transactions.
    """
    __tablename__ = "notification_records"
    __table_args__ = (
        UniqueConstraint("event_id", "recipient_id", "notification_type", name="uq_notification_dedup"),
    )

    event_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    recipient_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    recipient_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notification_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True) # PUSH, SMS, EMAIL
    channel: Mapped[str] = mapped_column(String(64), default="caresync:notifications", nullable=False)
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="SENT", nullable=False, index=True) # PENDING, SENT, FAILED
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
