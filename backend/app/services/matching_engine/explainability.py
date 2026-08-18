from typing import List, Dict, Any

class MatchExplainer:
    """
    Explainability Engine for CareSync Matching Engine.
    
    Generates human-readable, auditable reason strings explaining
    WHY a candidate was recommended to the caregiver.
    """

    @staticmethod
    def generate_explanations(candidate: Dict[str, Any], score: float) -> List[str]:
        reasons = []

        if candidate.get("type") == "FAMILY":
            rel = candidate.get("relationship", "Family Member")
            reasons.append(f"✓ Family member ({rel})")
        else:
            reasons.append("✓ Verified Community Volunteer")

        if candidate.get("is_available"):
            reasons.append("✓ Available at requested time window")

        dist = candidate.get("distance_km")
        if dist is not None:
            reasons.append(f"✓ Close proximity to parent ({dist} km away)")

        rel_score = candidate.get("reliability_score")
        if rel_score:
            reasons.append(f"✓ High task reliability rating ({rel_score}★)")

        if candidate.get("has_transport_capability"):
            reasons.append("✓ Has verified vehicle and mobility assistance capability")

        return reasons
