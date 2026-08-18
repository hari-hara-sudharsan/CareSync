from typing import List, Optional, Dict, Any
from app.models.care_network import CareMember
from app.models.user import User
from app.models.care_request import CareRequest

class HardConstraintFilter:
    """
    Hard Constraint Filter for CareSync Matching Engine.
    
    Candidates MUST pass 100% of hard constraints.
    Failing any constraint results in immediate candidate rejection.
    """

    @staticmethod
    def is_eligible(
        candidate: Dict[str, Any],
        request: CareRequest,
        target_parent_id: str,
    ) -> bool:
        # 1. Active Account Filter
        if not candidate.get("is_active", True):
            return False

        # 2. Verification & Status Hard Filter
        v_status = candidate.get("verification_status", "VERIFIED" if candidate.get("is_verified", True) else "UNVERIFIED")
        if v_status in ["SUSPENDED", "REVOKED", "UNVERIFIED", "PENDING"]:
            if candidate.get("type") == "VOLUNTEER" or v_status in ["SUSPENDED", "REVOKED"]:
                return False

        # 3. Parent Circle Scope Filter
        if candidate.get("type") == "FAMILY" and candidate.get("parent_id") and candidate.get("parent_id") != target_parent_id:
            return False

        # 4. Task Permission Check
        granted_permissions: List[str] = candidate.get("permissions", [])
        required_permission = request.category
        if required_permission not in granted_permissions and candidate.get("type") != "FAMILY":
            return False

        # 5. Availability Check
        if not candidate.get("is_available", True):
            return False

        return True
