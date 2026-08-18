import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_scenario_a_checkin_creates_care_request(client: AsyncClient):
    """
    Scenario A: Parent submits daily check-in with 'NEED_HELP'.
    Verifies that CheckInEvent is persisted and a CareRequest is automatically generated in PENDING_ASSIGNMENT.
    """
    payload = {
        "parent_id": "p-1",
        "feeling_branch": "NEED_HELP",
        "status_summary": "Dizzy this morning and need help getting groceries",
        "note": "Felt lightheaded after waking up",
    }

    res = await client.post("/api/v1/check-ins", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["success"] is True
    assert data["feeling_branch"] == "NEED_HELP"
    assert data["care_request_created"] is True
    assert data["care_request_id"] is not None

    care_req_id = data["care_request_id"]

    # Verify CareRequest was persisted and listed in PENDING_ASSIGNMENT
    res_list = await client.get("/api/v1/care-requests?parent_id=p-1")
    assert res_list.status_code == 200
    requests = res_list.json()

    matched_req = next((r for r in requests if r["id"] == care_req_id), None)
    assert matched_req is not None
    assert matched_req["category"] == "CHECK_IN"
    assert matched_req["status"] == "PENDING_ASSIGNMENT"
    assert matched_req["priority"] == "HIGH"

@pytest.mark.asyncio
async def test_scenario_b_appointment_creates_transportation_care_request(client: AsyncClient):
    """
    Scenario B: Parent selects 'NEED_HELP' for appointment transportation.
    Verifies that TransportationRequest + CareRequest are generated in PENDING_ASSIGNMENT.
    """
    # 1. Fetch appointments
    res_appts = await client.get("/api/v1/appointments?parent_id=p-1")
    assert res_appts.status_code == 200
    appts = res_appts.json()
    assert len(appts) > 0
    appt_id = appts[0]["id"]

    # 2. Select NEED_HELP transportation
    payload = {
        "transportation_choice": "NEED_HELP",
        "notes": "Wheelchair assistance required",
    }
    res_trans = await client.post(f"/api/v1/appointments/{appt_id}/transportation?parent_id=p-1", json=payload)
    assert res_trans.status_code == 200
    trans_data = res_trans.json()

    assert trans_data["success"] is True
    assert trans_data["transportation_choice"] == "NEED_HELP"
    assert trans_data["transportation_status"] == "REQUESTED"
    assert trans_data["care_request_created"] is True
    assert trans_data["care_request_id"] is not None

    care_req_id = trans_data["care_request_id"]

    # 3. Verify CareRequest was created in PENDING_ASSIGNMENT
    res_list = await client.get("/api/v1/care-requests?parent_id=p-1")
    requests = res_list.json()
    matched_req = next((r for r in requests if r["id"] == care_req_id), None)

    assert matched_req is not None
    assert matched_req["category"] == "TRANSPORTATION"
    assert matched_req["status"] == "PENDING_ASSIGNMENT"
    assert matched_req["priority"] == "CRITICAL"

@pytest.mark.asyncio
async def test_scenario_c_medication_event_updates_timeline(client: AsyncClient):
    """
    Scenario C: Parent records medication 'TAKEN'.
    Verifies MedicationEvent is persisted and today's timeline reflects updated taken_count.
    """
    # 1. Fetch today's timeline
    res_today = await client.get("/api/v1/medications/today?parent_id=p-1")
    assert res_today.status_code == 200
    data = res_today.json()
    med_id = data["timeline"][0]["medication_id"]

    # 2. Record TAKEN status
    res_event = await client.post(f"/api/v1/medications/{med_id}/events?parent_id=p-1", json={"status": "TAKEN"})
    assert res_event.status_code == 200
    assert res_event.json()["status"] == "TAKEN"

    # 3. Fetch updated timeline
    res_updated = await client.get("/api/v1/medications/today?parent_id=p-1")
    updated_data = res_updated.json()
    target_item = next(i for i in updated_data["timeline"] if i["medication_id"] == med_id)
    assert target_item["status"] == "TAKEN"
    assert target_item["recorded_at"] is not None
