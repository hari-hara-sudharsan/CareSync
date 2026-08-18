from abc import ABC, abstractmethod
from typing import Dict, Any

class ScoringStrategy(ABC):
    @abstractmethod
    def calculate_score(self, candidate: Dict[str, Any], task_category: str) -> float:
        pass

class FamilyFirstScoringStrategy(ScoringStrategy):
    """
    Family-First Deterministic Scoring Strategy.
    Prioritizes family relationship familiarity and availability.
    """

    def calculate_score(self, candidate: Dict[str, Any], task_category: str) -> float:
        score = 0.0

        # Availability (30%)
        if candidate.get("is_available", True):
            score += 0.30

        # Family Relationship Weighting (30%)
        if candidate.get("type") == "FAMILY":
            score += 0.30
            if candidate.get("is_primary_contact"):
                score += 0.05

        # Reliability (20%)
        reliability = candidate.get("reliability_score", 5.0) / 5.0
        score += 0.20 * reliability

        # Proximity (15%)
        dist = candidate.get("distance_km", 5.0)
        proximity_score = max(0.0, 1.0 - (dist / 20.0))
        score += 0.15 * proximity_score

        return round(min(1.0, score), 2)

class VolunteerScoringStrategy(ScoringStrategy):
    """
    Volunteer Fallback Deterministic Scoring Strategy.
    Evaluates verified volunteers based on reliability rating, proximity, and task fit.
    """

    def calculate_score(self, candidate: Dict[str, Any], task_category: str) -> float:
        score = 0.0

        # Availability (30%)
        if candidate.get("is_available", True):
            score += 0.30

        # Reliability Rating (30%)
        reliability = candidate.get("reliability_score", 4.5) / 5.0
        score += 0.30 * reliability

        # Proximity (25%)
        dist = candidate.get("distance_km", 10.0)
        proximity_score = max(0.0, 1.0 - (dist / 20.0))
        score += 0.25 * proximity_score

        # Task Capability (15%)
        if candidate.get("has_transport_capability") and task_category == "TRANSPORTATION":
            score += 0.15

        return round(min(1.0, score), 2)
