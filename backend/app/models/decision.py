from sqlalchemy import String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class DecisionCard(BaseModel):
    __tablename__ = "decision_cards"

    parent_id: Mapped[str] = mapped_column(String(36), ForeignKey("parent_profiles.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    priority: Mapped[str] = mapped_column(String(32), default="MEDIUM", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=True)
    related_entity_id: Mapped[str] = mapped_column(String(36), nullable=True)
    actions: Mapped[dict] = mapped_column(JSON, default=list, nullable=False)
    expires_at: Mapped[str] = mapped_column(String(128), nullable=True)

class AuditEvent(BaseModel):
    __tablename__ = "audit_events"

    actor_id: Mapped[str] = mapped_column(String(36), nullable=True)
    actor_name: Mapped[str] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(36), nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
