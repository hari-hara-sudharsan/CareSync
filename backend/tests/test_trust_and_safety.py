import pytest
from httpx import AsyncClient
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.care_request import CareRequest
from app.services.matching_engine.filters import HardConstraintFilter
from app.services.matching_engine.matching_service import MatchingEngineService
from app.trust.verification import VerificationService
from app.trust.reliability import TaskReliabilityService
from app.trust.complaints import ComplaintService
from app.trust.safety_policy import SafetyPolicyEngine
from app.agent.tools.classification import ToolClassifier

@pytest.fixture
def sample_request():
    return CareRequest(
        id="req-trust-1",
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Transport Ride",
        description="Ride to hospital",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
    )

def test_hard_filter_rejects_unverified_and_suspended_candidates(sample_request):
    """Verifies that HardConstraintFilter rejects unverified, suspended, or revoked candidates."""
    # 1. Unverified volunteer -> Rejected
    cand1 = {"id": "v-1", "type": "VOLUNTEER", "verification_status": "UNVERIFIED", "is_active": True, "is_available": True, "permissions": ["TRANSPORTATION"]}
    assert HardConstraintFilter.is_eligible(cand1, sample_request, "p-1") is False

    # 2. Suspended candidate -> Rejected
    cand2 = {"id": "v-2", "type": "VOLUNTEER", "verification_status": "SUSPENDED", "is_active": True, "is_available": True, "permissions": ["TRANSPORTATION"]}
    assert HardConstraintFilter.is_eligible(cand2, sample_request, "p-1") is False

    # 3. Revoked candidate -> Rejected
    cand3 = {"id": "v-3", "type": "VOLUNTEER", "verification_status": "REVOKED", "is_active": True, "is_available": True, "permissions": ["TRANSPORTATION"]}
    assert HardConstraintFilter.is_eligible(cand3, sample_request, "p-1") is False

    # 4. Verified candidate -> Eligible
    cand4 = {"id": "v-4", "type": "VOLUNTEER", "verification_status": "VERIFIED", "is_verified": True, "is_active": True, "is_available": True, "permissions": ["TRANSPORTATION"]}
    assert HardConstraintFilter.is_eligible(cand4, sample_request, "p-1") is True

@pytest.mark.asyncio
async def test_task_scoped_reliability_event_updates(async_db: AsyncSession):
    """Verifies category-specific reliability rating calculation and penalty deltas."""
    # Initial score
    score1 = await TaskReliabilityService.get_task_reliability(async_db, "user-rel-1", "TRANSPORTATION")
    assert score1 == 100.0

    # Record TASK_COMPLETED
    score2 = await TaskReliabilityService.record_trust_event(async_db, "user-rel-1", "TASK_COMPLETED", "TRANSPORTATION", "CareRequest", "req-1")
    assert score2 == 100.0

    # Record TASK_CANCELLED (-10)
    score3 = await TaskReliabilityService.record_trust_event(async_db, "user-rel-1", "TASK_CANCELLED", "TRANSPORTATION", "CareRequest", "req-2")
    assert score3 == 90.0

    # Record TASK_NO_SHOW (-25)
    score4 = await TaskReliabilityService.record_trust_event(async_db, "user-rel-1", "TASK_NO_SHOW", "TRANSPORTATION", "CareRequest", "req-3")
    assert score4 == 65.0

@pytest.mark.asyncio
async def test_complaint_filing_and_automatic_suspension(async_db: AsyncSession):
    """Verifies that filing a HIGH or EMERGENCY complaint automatically suspends the target candidate."""
    # Seed candidate as verified
    await VerificationService.update_verification_status(async_db, "user-comp-1", "VERIFIED")
    assert await VerificationService.is_candidate_eligible(async_db, "user-comp-1") is True

    # File HIGH severity complaint
    res = await ComplaintService.file_complaint(
        db=async_db,
        parent_id="p-1",
        complainant_id="c-1",
        target_user_id="user-comp-1",
        category="SAFETY_CONCERN",
        safety_severity="HIGH",
        description="Helper showed unsafe driving behavior.",
    )

    assert res["success"] is True
    assert res["auto_suspended"] is True
    assert res["decision_card_id"] is not None

    # Candidate eligibility must now be FALSE (suspended)
    assert await VerificationService.is_candidate_eligible(async_db, "user-comp-1") is False

def test_safety_severity_vs_priority_routing():
    """Verifies separation of operational priority (HIGH) from safety severity (EMERGENCY)."""
    # Transportation request (High priority, None safety) -> Standard matching allowed
    eval1 = SafetyPolicyEngine.evaluate_routing("HIGH", "NONE")
    assert eval1["standard_matching_allowed"] is True
    assert eval1["requires_emergency_pathway"] is False

    # Emergency safety concern -> Requires emergency pathway
    eval2 = SafetyPolicyEngine.evaluate_routing("URGENT", "EMERGENCY")
    assert eval2["standard_matching_allowed"] is False
    assert eval2["requires_emergency_pathway"] is True

def test_agent_forbidden_from_resolving_complaints_or_overriding_verification():
    """Ensures Agent is strictly forbidden from executing complaint resolutions or verification overrides."""
    with pytest.raises(HTTPException) as exc1:
        ToolClassifier.validate_action_execution("resolve_complaint")
    assert exc1.value.status_code == 403

    with pytest.raises(HTTPException) as exc2:
        ToolClassifier.validate_action_execution("dismiss_complaint")
    assert exc2.value.status_code == 403

    with pytest.raises(HTTPException) as exc3:
        ToolClassifier.validate_action_execution("override_verification")
    assert exc3.value.status_code == 403

    with pytest.raises(HTTPException) as exc4:
        ToolClassifier.validate_action_execution("unsuspend_user")
    assert exc4.value.status_code == 403

@pytest.mark.asyncio
async def test_trust_api_endpoints(client: AsyncClient):
    """Tests Trust & Safety API endpoints."""
    from app.core.rate_limiter import rate_limiter
    rate_limiter._window_records.clear()

    # 1. Get verification status
    res_v = await client.get("/api/v1/trust/verification/usr-demo-1")
    assert res_v.status_code == 200

    # 2. Get task reliability
    res_r = await client.get("/api/v1/trust/reliability/usr-demo-1?category=TRANSPORTATION")
    assert res_r.status_code == 200
    assert res_r.json()["reliability_score"] >= 0.0

    # 3. File complaint
    complaint_payload = {
        "parent_id": "p-1",
        "target_user_id": "c-3",
        "category": "LATE_ARRIVAL",
        "safety_severity": "CONCERN",
        "description": "Volunteer arrived 30 minutes late for ride.",
    }
    res_c = await client.post("/api/v1/trust/complaints", json=complaint_payload)
    assert res_c.status_code in [200, 429]
