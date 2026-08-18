from enum import Enum
from typing import Set
from fastapi import HTTPException, status

class ToolRiskLevel(str, Enum):
    ROUTINE = "ROUTINE"                # Auto-executable within policy
    HITL_APPROVAL = "HITL_APPROVAL"    # Requires caregiver decision card approval
    FORBIDDEN = "FORBIDDEN"            # Strictly prohibited for AI execution

FORBIDDEN_AGENT_ACTIONS: Set[str] = {
    "assign_volunteer",
    "change_medication_dosage",
    "prescribe_medication",
    "resolve_complaint",
    "override_safety_policy",
    "bypass_authorization",
    "modify_trust_score",
    "close_high_severity_case",
}

class ToolClassifier:
    """
    CareSync Tool Classification Guard.
    
    Prevents the agent from invoking high-risk or prohibited operations.
    Enforces the core rule: LLM reasoning != business authority.
    """

    @staticmethod
    def classify_action(action_name: str) -> ToolRiskLevel:
        if action_name in FORBIDDEN_AGENT_ACTIONS:
            return ToolRiskLevel.FORBIDDEN
        if action_name in ["create_decision_card", "request_matching_recommendations", "create_care_request"]:
            return ToolRiskLevel.HITL_APPROVAL
        return ToolRiskLevel.ROUTINE

    @staticmethod
    def validate_action_execution(action_name: str) -> None:
        level = ToolClassifier.classify_action(action_name)
        if level == ToolRiskLevel.FORBIDDEN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action Denied: Agent is strictly forbidden from executing '{action_name}'. Domain/Human authority required."
            )
