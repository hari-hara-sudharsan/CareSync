from pydantic import BaseModel, Field
from typing import Optional, List

class CandidateRead(BaseModel):
    id: str
    name: str
    relationship: str
    type: str
    is_available: bool
    phone: Optional[str] = None

class CareRequestCreate(BaseModel):
    parent_id: str
    category: str
    title: str
    description: str
    priority: str = "MEDIUM"
    requested_time: str
    location_name: Optional[str] = None
    address: Optional[str] = None

class CareRequestAssign(BaseModel):
    assignee_id: str

class CareRequestRead(BaseModel):
    id: str
    parent_id: str
    parent_name: str
    category: str
    title: str
    description: str
    priority: str
    status: str
    requested_time: str
    created_at: str
    location_name: Optional[str] = None
    address: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_role: Optional[str] = None

    class Config:
        from_attributes = True
