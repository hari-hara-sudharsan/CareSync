from sqlalchemy import String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class CareRequest(BaseModel):
    __tablename__ = "care_requests"

    parent_id: Mapped[str] = mapped_column(String(36), ForeignKey("parent_profiles.id"), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(32), default="MEDIUM", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING_ASSIGNMENT", nullable=False)
    requested_time: Mapped[str] = mapped_column(String(128), nullable=False)
    location_name: Mapped[str] = mapped_column(String(255), nullable=True)
    address: Mapped[str] = mapped_column(String(255), nullable=True)
    assigned_to_id: Mapped[str] = mapped_column(String(36), nullable=True)
    assigned_to_name: Mapped[str] = mapped_column(String(255), nullable=True)
    assigned_to_role: Mapped[str] = mapped_column(String(128), nullable=True)

class AssignmentHistory(BaseModel):
    __tablename__ = "assignment_history"

    care_request_id: Mapped[str] = mapped_column(String(36), ForeignKey("care_requests.id"), nullable=False)
    assignee_id: Mapped[str] = mapped_column(String(36), nullable=False)
    assignee_name: Mapped[str] = mapped_column(String(255), nullable=False)
    assignee_role: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=True)
