from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class ParentProfile(BaseModel):
    __tablename__ = "parent_profiles"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(32), default="en")
    emergency_contact_phone: Mapped[str] = mapped_column(String(32), nullable=True)
    care_situation: Mapped[str] = mapped_column(String(128), default="INDEPENDENT")
    home_address: Mapped[str] = mapped_column(String(255), nullable=True)
    care_status: Mapped[str] = mapped_column(String(32), default="ALL_CLEAR")
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", nullable=False)
