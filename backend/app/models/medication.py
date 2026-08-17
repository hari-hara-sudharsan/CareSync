from sqlalchemy import String, Text, ForeignKey, Time
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class Medication(BaseModel):
    __tablename__ = "medications"

    parent_id: Mapped[str] = mapped_column(String(36), ForeignKey("parent_profiles.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[str] = mapped_column(String(128), nullable=False)
    instructions: Mapped[str] = mapped_column(Text, nullable=True)
    prescribing_doctor: Mapped[str] = mapped_column(String(255), nullable=True)
    refill_status: Mapped[str] = mapped_column(String(64), default="SUFFICIENT")

class MedicationEvent(BaseModel):
    __tablename__ = "medication_events"

    medication_id: Mapped[str] = mapped_column(String(36), ForeignKey("medications.id"), nullable=False)
    parent_id: Mapped[str] = mapped_column(String(36), ForeignKey("parent_profiles.id"), nullable=False)
    scheduled_time: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="SCHEDULED", nullable=False)
    recorded_at: Mapped[str] = mapped_column(String(128), nullable=True)
    recorded_by_id: Mapped[str] = mapped_column(String(36), nullable=True)
