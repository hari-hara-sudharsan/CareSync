import heapq
from typing import List, Dict, Any, Optional
from app.models.care_request import CareRequest
from app.services.matching_engine.filters import HardConstraintFilter
from app.services.matching_engine.scoring import FamilyFirstScoringStrategy, VolunteerScoringStrategy
from app.services.matching_engine.explainability import MatchExplainer

class MatchingEngineService:
    """
    Deterministic Coordination & Matching Engine for CareSync.
    
    1. Filters candidate pool with HardConstraintFilter.
    2. Enforces Family-First Policy (family members evaluated first).
    3. Scores candidates using pluggable ScoringStrategy.
    4. Bounded selection using Top-K Heap.
    5. Attaches audit/explainability reason strings.
    6. Returns NO_SUITABLE_CANDIDATE status when no candidate passes.
    """

    @staticmethod
    def match_candidates(
        request: CareRequest,
        candidate_pool: List[Dict[str, Any]],
        top_k: int = 5,
    ) -> Dict[str, Any]:
        parent_id = request.parent_id

        # Step 1: Separate Family and Volunteer Pools
        family_pool = [c for c in candidate_pool if c.get("type") == "FAMILY"]
        volunteer_pool = [c for c in candidate_pool if c.get("type") == "VOLUNTEER"]

        # Step 2: Evaluate Family-First Policy
        eligible_family = [
            c for c in family_pool
            if HardConstraintFilter.is_eligible(c, request, parent_id)
        ]

        strategy_name = "FAMILY_FIRST"
        selected_pool = eligible_family
        scorer = FamilyFirstScoringStrategy()

        # Step 3: Fallback to Volunteers if no Family member is eligible
        if not eligible_family:
            eligible_volunteers = [
                c for c in volunteer_pool
                if HardConstraintFilter.is_eligible(c, request, parent_id)
            ]
            strategy_name = "VOLUNTEER_FALLBACK"
            selected_pool = eligible_volunteers
            scorer = VolunteerScoringStrategy()

        # Step 4: No Candidate Handling
        if not selected_pool:
            return {
                "request_id": request.id,
                "status": "NO_SUITABLE_CANDIDATE",
                "strategy": strategy_name,
                "message": "No eligible candidate passed safety and availability constraints.",
                "candidates": [],
            }

        # Step 5: Score Candidates & Extract Top-K using Heap
        scored_candidates = []
        for candidate in selected_pool:
            score = scorer.calculate_score(candidate, request.category)
            reasons = MatchExplainer.generate_explanations(candidate, score)
            
            cand_dto = {
                "candidate_id": candidate.get("id"),
                "name": candidate.get("name"),
                "relationship": candidate.get("relationship"),
                "candidate_type": candidate.get("type"),
                "score": score,
                "phone": candidate.get("phone"),
                "reasons": reasons,
            }
            scored_candidates.append(cand_dto)

        # Top-K Sort by Score Descending
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)
        top_candidates = scored_candidates[:top_k]

        return {
            "request_id": request.id,
            "status": "CANDIDATES_FOUND",
            "strategy": strategy_name,
            "candidates_count": len(top_candidates),
            "candidates": top_candidates,
        }
