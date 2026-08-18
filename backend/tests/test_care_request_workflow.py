import pytest
from httpx import AsyncClient
from app.services.care_request_state_machine import CareRequestStateMachine, CareRequestStatus
from fastapi import HTTPException

@pytest.mark.asyncio
async def test_valid_care_request_state_transitions():
    """Tests the complete valid lifecycle of a CareRequest."""
    CareRequestStateMachine.validate_transition("CREATED", "PENDING_ASSIGNMENT")
    CareRequestStateMachine.validate_transition("PENDING_ASSIGNMENT", "ASSIGNED")
    CareRequestStateMachine.validate_transition("ASSIGNED", "ACCEPTED")
    CareRequestStateMachine.validate_transition("ACCEPTED", "IN_PROGRESS")
    CareRequestStateMachine.validate_transition("IN_PROGRESS", "COMPLETED")
    CareRequestStateMachine.validate_transition("COMPLETED", "PARENT_CONFIRMED")
    CareRequestStateMachine.validate_transition("PARENT_CONFIRMED", "CLOSED")

@pytest.mark.asyncio
async def test_invalid_care_request_state_transitions_raise_exception():
    """Tests rejection of illegal state machine transitions."""
    # Terminal state CLOSED cannot transition
    with pytest.raises(HTTPException) as exc1:
        CareRequestStateMachine.validate_transition("CLOSED", "IN_PROGRESS")
    assert exc1.value.status_code == 400

    # Skipping lifecycle states is forbidden
    with pytest.raises(HTTPException) as exc2:
        CareRequestStateMachine.validate_transition("CREATED", "COMPLETED")
    assert exc2.value.status_code == 400

    # Mutating completed to assigned is forbidden
    with pytest.raises(HTTPException) as exc3:
        CareRequestStateMachine.validate_transition("COMPLETED", "ASSIGNED")
    assert exc3.value.status_code == 400

@pytest.mark.asyncio
async def test_care_request_creation_and_retrieval(client: AsyncClient):
    """Tests API creation of a real CareRequest and retrieval via DB."""
    # 1. Create CareRequest
    create_payload = {
        "parent_id": "p-1",
        "category": "TRANSPORTATION",
        "title": "Ride to Ophthalmology Appointment",
        "description": "Mom needs transport to Vision Care Center.",
        "priority": "HIGH",
        "requested_time": "Aug 22 at 02:00 PM",
        "location_name": "Vision Care Center",
        "address": "820 Oak Street",
    }

    res_create = await client.post("/api/v1/care-requests", json=create_payload)
    assert res_create.status_code == 200
    req_data = res_create.json()
    assert req_data["title"] == "Ride to Ophthalmology Appointment"
    assert req_data["status"] == "PENDING_ASSIGNMENT"
    req_id = req_data["id"]

    # 2. Get Care Requests list
    res_list = await client.get("/api/v1/care-requests?parent_id=p-1")
    assert res_list.status_code == 200
    items = res_list.json()
    assert any(i["id"] == req_id for i in items)

@pytest.mark.asyncio
async def test_care_request_assignment_and_concurrency_conflict(client: AsyncClient):
    """Tests assigning a CareRequest and verifying conflict on duplicate assignment to another user."""
    # 1. Create CareRequest
    create_payload = {
        "parent_id": "p-1",
        "category": "PHARMACY",
        "title": "Pickup Medication Refill",
        "description": "Lisinopril refill at CVS.",
        "priority": "MEDIUM",
        "requested_time": "Today at 05:00 PM",
    }
    res_create = await client.post("/api/v1/care-requests", json=create_payload)
    req_id = res_create.json()["id"]

    # 2. Assign to David (Success)
    assign_payload = {"assignee_id": "c-1"}
    res_assign1 = await client.post(f"/api/v1/care-requests/{req_id}/assign", json=assign_payload)
    assert res_assign1.status_code == 200
    assert res_assign1.json()["assigned_to_id"] == "c-1"

    # 3. Attempt assignment to Sarah (Conflict 409)
    assign_payload2 = {"assignee_id": "c-2"}
    res_assign2 = await client.post(f"/api/v1/care-requests/{req_id}/assign", json=assign_payload2)
    assert res_assign2.status_code == 409
    assert "already assigned to another caregiver" in res_assign2.json()["detail"]

@pytest.mark.asyncio
async def test_care_request_decline_and_reassignment_flow(client: AsyncClient):
    """Tests assignment -> decline -> status returns to DECLINED & unassigned -> reassign."""
    # 1. Create CareRequest
    create_payload = {
        "parent_id": "p-1",
        "category": "GROCERIES",
        "title": "Grocery Shopping",
        "description": "Fresh milk and bread.",
        "priority": "LOW",
        "requested_time": "Tomorrow morning",
    }
    res_create = await client.post("/api/v1/care-requests", json=create_payload)
    req_id = res_create.json()["id"]

    # 2. Assign to Sarah
    await client.post(f"/api/v1/care-requests/{req_id}/assign", json={"assignee_id": "c-2"})

    # 3. Transition to DECLINED
    res_decline = await client.post(f"/api/v1/care-requests/{req_id}/transition/DECLINED?reason=Schedule%20conflict")
    assert res_decline.status_code == 200
    declined_data = res_decline.json()
    assert declined_data["status"] == "DECLINED"
    assert declined_data["assigned_to_id"] is None

    # 4. Transition back to PENDING_ASSIGNMENT & Reassign to David
    await client.post(f"/api/v1/care-requests/{req_id}/transition/PENDING_ASSIGNMENT")
    res_reassign = await client.post(f"/api/v1/care-requests/{req_id}/assign", json={"assignee_id": "c-1"})
    assert res_reassign.status_code == 200
    assert res_reassign.json()["assigned_to_id"] == "c-1"

@pytest.mark.asyncio
async def test_parent_care_circle_isolation_protection(client: AsyncClient):
    """Tests that unauthorized users from another parent circle are denied access (403 Forbidden)."""
    # Attempt to access Parent p-999 where current_user has no CareMember mapping
    res = await client.get("/api/v1/care-requests?parent_id=p-999")
    assert res.status_code == 403
    assert "Access Denied" in res.json()["detail"]
