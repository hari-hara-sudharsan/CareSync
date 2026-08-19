from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Integer, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class OutboxEvent(BaseModel):
    """
    Transactional Outbox Pattern Event Model.
    Guarantees durable, atomic domain event dispatching for CareSync domain events
    (e.g., CARE_REQUEST_COMPLETED, CHECK_IN_ESCALATED, DECISION_CREATED).
    """
    __tablename__ = "outbox_events"

    aggregate_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    aggregate_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False, index=True) # PENDING, DISPATCHED, FAILED
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
