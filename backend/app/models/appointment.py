from sqlalchemy import String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class Appointment(BaseModel):
    __tablename__ = "appointments"

    parent_id: Mapped[str] = mapped_column(String(36), ForeignKey("parent_profiles.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialty: Mapped[str] = mapped_column(String(128), nullable=True)
    location_name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    starts_at: Mapped[str] = mapped_column(String(128), nullable=False)
    ends_at: Mapped[str] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="UPCOMING", nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    transportation_choice: Mapped[str] = mapped_column(String(64), default="NOT_DECIDED", nullable=False)
    transportation_status: Mapped[str] = mapped_column(String(64), default="NOT_DECIDED", nullable=False)

class TransportationRequest(BaseModel):
    __tablename__ = "transportation_requests"

    appointment_id: Mapped[str] = mapped_column(String(36), ForeignKey("appointments.id"), nullable=False)
    parent_id: Mapped[str] = mapped_column(String(36), ForeignKey("parent_profiles.id"), nullable=False)
    pickup_address: Mapped[str] = mapped_column(String(255), nullable=False)
    destination_address: Mapped[str] = mapped_column(String(255), nullable=False)
    pickup_time: Mapped[str] = mapped_column(String(128), nullable=False)
    mobility_requirements: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="REQUESTED", nullable=False)
    assigned_driver_id: Mapped[str] = mapped_column(String(36), nullable=True)
