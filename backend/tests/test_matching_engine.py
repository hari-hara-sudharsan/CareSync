import pytest
from httpx import AsyncClient
from app.models.care_request import CareRequest
from app.services.matching_engine.matching_service import MatchingEngineService
from app.services.matching_engine.filters import HardConstraintFilter

@pytest.fixture
def sample_care_request():
    return CareRequest(
        id="req-test-101",
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Cardiology Ride",
        description="Transport to clinic",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
        requested_time="Tomorrow at 10:00 AM",
    )

def test_family_first_preference(sample_care_request):
    """Verifies that eligible family candidates are recommended first before volunteer pool."""
    pool = [
        {"id": "f-1", "name": "David", "type": "FAMILY", "relationship": "Son", "parent_id": "p-1", "is_active": True, "is_available": True, "permissions": ["TRANSPORTATION"], "distance_km": 2.0},
        {"id": "v-1", "name": "Priya", "type": "VOLUNTEER", "relationship": "Volunteer", "is_active": True, "is_verified": True, "is_available": True, "permissions": ["TRANSPORTATION"], "distance_km": 0.5},
    ]

    res = MatchingEngineService.match_candidates(sample_care_request, pool)
    assert res["status"] == "CANDIDATES_FOUND"
    assert res["strategy"] == "FAMILY_FIRST"
    assert len(res["candidates"]) == 1
    assert res["candidates"][0]["candidate_id"] == "f-1"

def test_family_unavailable_fallback_to_volunteers(sample_care_request):
    """Verifies fallback to verified volunteers when family candidates are unavailable."""
    pool = [
        {"id": "f-1", "name": "David", "type": "FAMILY", "relationship": "Son", "parent_id": "p-1", "is_active": True, "is_available": False, "permissions": ["TRANSPORTATION"]},
        {"id": "v-1", "name": "Priya", "type": "VOLUNTEER", "relationship": "Volunteer", "is_active": True, "is_verified": True, "is_available": True, "permissions": ["TRANSPORTATION"], "distance_km": 1.0},
    ]

    res = MatchingEngineService.match_candidates(sample_care_request, pool)
    assert res["status"] == "CANDIDATES_FOUND"
    assert res["strategy"] == "VOLUNTEER_FALLBACK"
    assert res["candidates"][0]["candidate_id"] == "v-1"

def test_hard_constraint_filtering(sample_care_request):
    """Verifies hard constraint rejections: unverified volunteers or missing permissions are rejected."""
    # 1. Unverified volunteer -> Rejected
    c1 = {"id": "v-1", "type": "VOLUNTEER", "is_active": True, "is_verified": False, "is_available": True, "permissions": ["TRANSPORTATION"]}
    assert HardConstraintFilter.is_eligible(c1, sample_care_request, "p-1") is False

    # 2. Inactive account -> Rejected
    c2 = {"id": "f-1", "type": "FAMILY", "parent_id": "p-1", "is_active": False, "is_available": True, "permissions": ["TRANSPORTATION"]}
    assert HardConstraintFilter.is_eligible(c2, sample_care_request, "p-1") is False

    # 3. Missing task permission -> Rejected for volunteer
    c3 = {"id": "v-2", "type": "VOLUNTEER", "is_active": True, "is_verified": True, "is_available": True, "permissions": ["GROCERIES"]}
    assert HardConstraintFilter.is_eligible(c3, sample_care_request, "p-1") is False

def test_explainability_reasons(sample_care_request):
    """Verifies human-readable reason strings attached to recommended candidates."""
    pool = [
        {"id": "f-1", "name": "David Woodson", "type": "FAMILY", "relationship": "Son", "parent_id": "p-1", "is_active": True, "is_available": True, "permissions": ["TRANSPORTATION"], "distance_km": 2.5, "reliability_score": 4.9, "has_transport_capability": True},
    ]
    res = MatchingEngineService.match_candidates(sample_care_request, pool)
    cand = res["candidates"][0]

    assert "reasons" in cand
    reasons = cand["reasons"]
    assert any("Family member (Son)" in r for r in reasons)
    assert any("Available at requested time" in r for r in reasons)
    assert any("Close proximity" in r for r in reasons)

def test_no_candidate_found_fallback(sample_care_request):
    """Verifies status returns NO_SUITABLE_CANDIDATE when no candidates pass hard filters."""
    pool = [
        {"id": "v-1", "type": "VOLUNTEER", "is_active": True, "is_verified": False}, # Unverified
    ]
    res = MatchingEngineService.match_candidates(sample_care_request, pool)

    assert res["status"] == "NO_SUITABLE_CANDIDATE"
    assert len(res["candidates"]) == 0

def test_deterministic_reproducibility(sample_care_request):
    """Verifies matching engine output is 100% deterministic given identical inputs."""
    pool = [
        {"id": "f-1", "name": "David", "type": "FAMILY", "relationship": "Son", "parent_id": "p-1", "is_active": True, "is_available": True, "permissions": ["TRANSPORTATION"], "distance_km": 2.5},
        {"id": "f-2", "name": "Sarah", "type": "FAMILY", "relationship": "Daughter", "parent_id": "p-1", "is_active": True, "is_available": True, "permissions": ["TRANSPORTATION"], "distance_km": 5.0},
    ]

    res1 = MatchingEngineService.match_candidates(sample_care_request, pool)
    res2 = MatchingEngineService.match_candidates(sample_care_request, pool)

    assert res1 == res2
    assert res1["candidates"][0]["candidate_id"] == res2["candidates"][0]["candidate_id"]

@pytest.mark.asyncio
async def test_matching_recommendation_api_endpoint(client: AsyncClient):
    """Tests POST /api/v1/care-requests/{id}/match API endpoint."""
    # 1. Create CareRequest
    res_create = await client.post(
        "/api/v1/care-requests",
        json={
            "parent_id": "p-1",
            "category": "TRANSPORTATION",
            "title": "Eye Doctor Transport",
            "description": "Transport to eye exam",
            "requested_time": "Aug 22 at 02:00 PM",
        },
    )
    req_id = res_create.json()["id"]

    # 2. Call match endpoint
    res_match = await client.post(f"/api/v1/care-requests/{req_id}/match")
    assert res_match.status_code == 200
    data = res_match.json()

    assert data["status"] == "CANDIDATES_FOUND"
    assert data["strategy"] == "FAMILY_FIRST"
    assert len(data["candidates"]) > 0
    assert data["candidates"][0]["candidate_type"] == "FAMILY"
    assert len(data["candidates"][0]["reasons"]) > 0
