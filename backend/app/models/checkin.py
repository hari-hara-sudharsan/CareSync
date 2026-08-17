from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class CheckInEvent(BaseModel):
    __tablename__ = "checkin_events"

    parent_id: Mapped[str] = mapped_column(String(36), ForeignKey("parent_profiles.id"), nullable=False)
    feeling_branch: Mapped[str] = mapped_column(String(64), nullable=False)
    status_summary: Mapped[str] = mapped_column(String(255), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=True)
    requires_escalation: Mapped[bool] = mapped_column(default=False)
    is_emergency: Mapped[bool] = mapped_column(default=False)
    care_request_id: Mapped[str] = mapped_column(String(36), nullable=True)
