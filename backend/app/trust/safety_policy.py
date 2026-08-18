from typing import Dict, Any

class SafetyPolicyEngine:
    """
    Safety Severity vs Operational Priority Routing Engine.
    
    Separates operational urgency (Priority) from medical/safety risk (SafetySeverity).
    - HIGH Priority + NONE Safety -> Standard Matching Pathway
    - URGENT Priority + EMERGENCY Safety -> Emergency Escalation Pathway
    """

    @staticmethod
    def evaluate_routing(priority: str, safety_severity: str) -> Dict[str, Any]:
        requires_emergency_pathway = safety_severity == "EMERGENCY"
        requires_safety_review = safety_severity in ["CONCERN", "HIGH", "EMERGENCY"]
        standard_matching = not requires_emergency_pathway

        return {
            "priority": priority,
            "safety_severity": safety_severity,
            "requires_emergency_pathway": requires_emergency_pathway,
            "requires_safety_review": requires_safety_review,
            "standard_matching_allowed": standard_matching,
        }
