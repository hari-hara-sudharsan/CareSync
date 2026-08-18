from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class AgentActionLog(BaseModel):
    tool_name: str
    action_status: str # 'SUCCESS' | 'REJECTED' | 'FAILED'
    details: Dict[str, Any]

class AgentDecisionOutput(BaseModel):
    parent_id: str
    agent_status: str # 'NO_ACTION_REQUIRED' | 'REMINDER_SENT' | 'DECISION_EMITTED' | 'ESCALATED'
    reasoning_summary: str
    requires_human_approval: bool = False
    decision_card: Optional[Dict[str, Any]] = None
    actions_taken: List[AgentActionLog] = []
