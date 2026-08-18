from sqlalchemy import String, Text, Boolean, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class VerificationRecord(BaseModel):
    __tablename__ = "verification_records"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="UNVERIFIED", nullable=False) # UNVERIFIED, PENDING, VERIFIED, SUSPENDED, REVOKED
    id_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    background_checked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[str] = mapped_column(String(128), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)

class TaskReliability(BaseModel):
    __tablename__ = "task_reliabilities"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    completed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cancelled_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    no_show_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    parent_confirmed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reliability_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)

class TrustEvent(BaseModel):
    __tablename__ = "trust_events"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False) # TASK_COMPLETED, TASK_CANCELLED, COMPLAINT_FILED, etc.
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(36), nullable=True)
    impact_delta: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=True)

class Complaint(BaseModel):
    __tablename__ = "complaints"

    parent_id: Mapped[str] = mapped_column(String(36), ForeignKey("parent_profiles.id"), nullable=False)
    complainant_id: Mapped[str] = mapped_column(String(36), nullable=False)
    target_user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False) # TASK_NOT_COMPLETED, LATE_ARRIVAL, NO_SHOW, SAFETY_CONCERN
    safety_severity: Mapped[str] = mapped_column(String(32), default="NONE", nullable=False) # NONE, CONCERN, HIGH, EMERGENCY
    status: Mapped[str] = mapped_column(String(32), default="OPEN", nullable=False) # OPEN, UNDER_REVIEW, UPHELD, DISMISSED
    description: Mapped[str] = mapped_column(Text, nullable=False)
    resolution_notes: Mapped[str] = mapped_column(Text, nullable=True)
