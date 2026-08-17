from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class DecisionResponseRequest(BaseModel):
    action_key: str

class DecisionCardRead(BaseModel):
    id: str
    parent_id: str
    parent_name: str
    type: str
    priority: str
    status: str
    title: str
    summary: str
    reason: Optional[str] = None
    related_entity_id: Optional[str] = None
    actions: List[Dict[str, Any]] = []
    expires_at: Optional[str] = None

    class Config:
        from_attributes = True
