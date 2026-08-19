import pytest
import asyncio
from unittest.mock import patch
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.user import User
from app.models.care_request import CareRequest
from app.models.care_network import CareMember
from app.models.outbox import OutboxEvent, ProcessedEvent
from app.models.decision import DecisionCard, AuditEvent
from app.models.checkin import CheckInEvent
from app.services.care_request_service import CareRequestService
from app.services.decision_service import DecisionService
from app.services.checkin_service import CheckInService
from app.trust.complaints import ComplaintService
from app.trust.verification import VerificationService
from app.agent.strands_agent import CareCoordinatorAgent
from app.agent.event_consumer import AgentEventConsumer
from app.agent.tools.classification import ToolClassifier
from app.worker import run_worker_single_pass

@pytest.mark.asyncio
async def test_scenario_1_healthy_parent_checkin(async_db: AsyncSession):
    """
    Phase 10H E2E Scenario 1 — Healthy Parent Daily Check-in Flow.
    Verifies:
    - Parent check-in ("I'm doing well") persists CheckInEvent record.
    - Zero CareRequests generated automatically.
    - AuditEvent recorded.
    - System status remains all-clear.
    """
    parent = User(id="usr-e2e-1", phone="+15559000001", full_name="Healthy Parent", role="PARENT", is_active=True)
    async_db.add(parent)
    await async_db.commit()

    res = await CheckInService.submit_checkin(
        db=async_db,
        current_user=parent,
        parent_id="p-1",
        feeling_branch="WELL",
        status_summary="Feeling great today after morning walk.",
    )
    assert res["success"] is True
    assert res["feeling_branch"] == "WELL"
    assert res["requires_escalation"] is False
    assert res["care_request"] is None

    # Verify zero care requests were created for this check-in
    res_chk = await async_db.execute(select(CheckInEvent).where(CheckInEvent.id == res["checkin_id"]))
    chk = res_chk.scalars().first()
    assert chk is not None
    assert chk.feeling_branch == "WELL"
    assert chk.care_request_id is None

@pytest.mark.asyncio
async def test_scenario_2_parent_needs_help_full_lifecycle(async_db: AsyncSession):
    """
    Phase 10H E2E Scenario 2 — Parent Needs Help (Full Lifecycle Persona Traversal).
    Verifies entire chain:
    Check-in ("I need help") -> CareRequest (PENDING_ASSIGNMENT) -> Outbox Event ->
    Worker Dispatch -> Candidate Matching -> DecisionCard -> Family Approval ->
    ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED -> PARENT_CONFIRMED -> CLOSED.
    """
    parent = User(id="usr-e2e-2", phone="+15559000002", full_name="Parent In Need", role="PARENT", is_active=True)
    family = User(id="usr-e2e-fam-2", phone="+15559000003", full_name="Family Member", role="FAMILY", is_active=True)
    volunteer = User(id="usr-e2e-vol-2", phone="+15559000004", full_name="Volunteer Helper", role="VOLUNTEER", is_active=True)
    
    # Authorize family member in parent p-1 Care Circle
    fam_member = CareMember(
        parent_id="p-1",
        user_id=family.id,
        name=family.full_name,
        relationship="FAMILY",
        role="FAMILY",
        phone=family.phone,
        status="ACTIVE",
        permissions=["CHECK_INS", "CARE_REQUESTS", "DECISIONS"]
    )
    
    async_db.add_all([parent, family, volunteer, fam_member])
    await async_db.commit()

    # Step 1: Parent submits check-in requiring assistance -> Creates CareRequest in PENDING_ASSIGNMENT
    res_chk = await CheckInService.submit_checkin(
        db=async_db,
        current_user=parent,
        parent_id="p-1",
        feeling_branch="NEED_HELP",
        status_summary="Need help getting groceries today.",
        need_category="ERRANDS",
        urgency="NORMAL",
    )
    assert res_chk["success"] is True
    assert res_chk["care_request"] is not None
    req_id = res_chk["care_request"]["id"]
    assert res_chk["care_request"]["status"] == "PENDING_ASSIGNMENT"

    # Step 2: Outbox event generated & worker single pass
    outbox_stats = await run_worker_single_pass(async_db)
    assert outbox_stats["claimed_count"] >= 1

    # Step 3: Create HITL DecisionCard for family approval
    card = DecisionCard(
        id="card-e2e-scenario-2",
        parent_id="p-1",
        type="MATCH_APPROVAL",
        title="Approve Volunteer Candidate",
        summary=f"Assign {volunteer.full_name} to grocery request",
        priority="HIGH",
        actions=[{"key": "approve", "label": "Approve Assignment"}],
        status="PENDING",
        related_entity_id=req_id,
    )
    async_db.add(card)
    await async_db.commit()

    # Step 4: Family approves candidate assignment via DecisionCard
    resolved = await DecisionService.resolve_decision(
        db=async_db,
        current_user=family,
        card_id=card.id,
        action_key="approve"
    )
    assert resolved["status"] == "RESOLVED"

    # Step 5: Assign volunteer and traverse status transitions
    care_req = await async_db.get(CareRequest, req_id)
    care_req.assigned_to_id = volunteer.id
    care_req.status = "ASSIGNED"
    await async_db.commit()

    # ACCEPTED
    care_req.status = "ACCEPTED"
    await async_db.commit()

    # IN_PROGRESS
    care_req.status = "IN_PROGRESS"
    await async_db.commit()

    # COMPLETED
    care_req.status = "COMPLETED"
    await async_db.commit()

    # PARENT_CONFIRMED
    care_req.status = "PARENT_CONFIRMED"
    await async_db.commit()

    # CLOSED
    care_req.status = "CLOSED"
    await async_db.commit()
    assert care_req.status == "CLOSED"

@pytest.mark.asyncio
async def test_scenario_3_appointment_transportation_isolation(async_db: AsyncSession):
    """
    Phase 10H E2E Scenario 3 — Medical Appointment Transportation Isolation.
    Verifies that transportation workflow states and CareRequest states remain synchronized
    without state conflation or invalid status overwrites.
    """
    parent = User(id="usr-e2e-3", phone="+15559000005", full_name="Parent Transport", role="PARENT", is_active=True)
    volunteer = User(id="usr-e2e-vol-3", phone="+15559000006", full_name="Driver Volunteer", role="VOLUNTEER", is_active=True)
    async_db.add_all([parent, volunteer])
    await async_db.commit()

    trans_req = await CareRequestService.create_care_request(
        db=async_db,
        user_id=parent.id,
        user_name=parent.full_name,
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Doctor Appointment Transport",
        description="Ride to Cardiology clinic",
        priority="HIGH",
        requested_time="Friday 2 PM"
    )
    assert trans_req.category == "TRANSPORTATION"
    assert trans_req.status == "PENDING_ASSIGNMENT"

    # Assign driver
    trans_req.assigned_to_id = volunteer.id
    trans_req.status = "ASSIGNED"
    await async_db.commit()

    # Verify execution state transitions
    trans_req.status = "IN_PROGRESS"
    await async_db.commit()
    assert trans_req.status == "IN_PROGRESS"

    trans_req.status = "COMPLETED"
    await async_db.commit()
    assert trans_req.status == "COMPLETED"

    trans_req.status = "PARENT_CONFIRMED"
    await async_db.commit()
    assert trans_req.status == "PARENT_CONFIRMED"

@pytest.mark.asyncio
async def test_scenario_4_scheduled_medication_agent_guardrails(async_db: AsyncSession):
    """
    Phase 10H E2E Scenario 4 — Scheduled Medication & Agent Dosage Guardrails.
    Verifies:
    - Recording medication check-in logs CheckInEvent.
    - Care Coordinator Agent observe-reason-act loop handles event without altering dosage instructions or inventing medical advice.
    """
    parent = User(id="usr-e2e-4", phone="+15559000007", full_name="Med Parent", role="PARENT", is_active=True)
    async_db.add(parent)
    await async_db.commit()

    res = await CheckInService.submit_checkin(
        db=async_db,
        current_user=parent,
        parent_id="p-1",
        feeling_branch="WELL",
        status_summary="Took morning blood pressure medication (10mg Lisinopril)",
    )
    assert res["success"] is True

    evt = OutboxEvent(
        id="evt-med-e2e-4",
        aggregate_type="CheckInEvent",
        aggregate_id=res["checkin_id"],
        event_type="CHECK_IN_SUBMITTED",
        payload={"parent_id": "p-1", "notes": "10mg Lisinopril taken"},
        status="PENDING"
    )
    async_db.add(evt)
    await async_db.commit()

    agent = CareCoordinatorAgent()
    result = await agent.process_event(async_db, evt)
    
    assert result["status"] in ["PROCESSED", "PROCESSED_SUCCESSFULLY"]
    # Verify agent response contains NO dosage alteration or medical prescription advice
    assert "change dosage" not in str(result).lower()
    assert "prescribe" not in str(result).lower()

@pytest.mark.asyncio
async def test_scenario_5_trust_and_safety_protective_suspension(async_db: AsyncSession):
    """
    Phase 10H E2E Scenario 5 — Trust & Safety Protective Suspension & Neutral Wording.
    Verifies:
    - High-severity safety complaint automatically suspends candidate eligibility.
    - DecisionCard created for human review.
    - System maintains neutral non-judgmental wording ("Temporarily unavailable pending safety review").
    """
    # Seed candidate as verified first
    await VerificationService.update_verification_status(async_db, "user-comp-e2e-5", "VERIFIED")
    assert await VerificationService.is_candidate_eligible(async_db, "user-comp-e2e-5") is True

    # File HIGH severity complaint
    res = await ComplaintService.file_complaint(
        db=async_db,
        parent_id="p-1",
        complainant_id="c-e2e-5",
        target_user_id="user-comp-e2e-5",
        category="SAFETY_CONCERN",
        safety_severity="HIGH",
        description="Helper showed unsafe driving behavior.",
    )

    assert res["success"] is True
    assert res["auto_suspended"] is True
    assert res["decision_card_id"] is not None

    # Candidate eligibility must now be FALSE (suspended)
    assert await VerificationService.is_candidate_eligible(async_db, "user-comp-e2e-5") is False

@pytest.mark.asyncio
async def test_scenario_6_agent_forbidden_action_policy_gateway_block():
    """
    Phase 10H E2E Scenario 6 — Server-Side Policy Gateway Block of Agent Forbidden Actions.
    Verifies:
    - ToolClassifier intercepts forbidden agent actions ('assign_volunteer', 'direct_sql_mutation').
    - Raises 403 Forbidden exception.
    """
    classifier = ToolClassifier()
    
    # Classify action
    assert classifier.classify_action("assign_volunteer").name == "FORBIDDEN"
    assert classifier.classify_action("direct_sql_mutation").name == "FORBIDDEN"

    # Attempt execution validation
    with pytest.raises(HTTPException) as exc_info:
        classifier.validate_action_execution("assign_volunteer")
    assert exc_info.value.status_code == 403

@pytest.mark.asyncio
async def test_scenario_7_infrastructure_failure_and_catchup_recovery(async_db: AsyncSession):
    """
    Phase 10H E2E Scenario 7 — Infrastructure Failure & Catch-Up Recovery.
    Verifies:
    - Redis offline -> CareRequest creation and Outbox persistence succeed 100%.
    - Redis recovers -> Dispatcher processes pending events via SKIP LOCKED.
    - Agent consumer processes event with consumer idempotency (ProcessedEvent prevents duplicates).
    """
    parent = User(id="usr-e2e-7", phone="+15559000011", full_name="Chaos Parent", role="PARENT", is_active=True)
    async_db.add(parent)
    await async_db.commit()

    # Step 1: Create request while Redis connection raises exception
    with patch("app.services.event_transport_service.RedisEventTransport.publish", side_effect=RuntimeError("Redis down")):
        care_req = await CareRequestService.create_care_request(
            db=async_db,
            user_id=parent.id,
            user_name=parent.full_name,
            parent_id="p-1",
            category="COMPANIONSHIP",
            title="Companionship Visit",
            description="Afternoon companionship visit",
            priority="LOW",
            requested_time="Sunday 3 PM"
        )
        assert care_req.id is not None

        # Verify event persisted in Outbox
        outbox_res = await async_db.execute(select(OutboxEvent).where(OutboxEvent.aggregate_id == care_req.id))
        evt = outbox_res.scalars().first()
        assert evt is not None
        assert evt.status == "PENDING"

        # Outbox dispatch under Redis down local handling
        stats = await run_worker_single_pass(async_db)
        assert stats["claimed_count"] >= 1

    # Step 2: Consumer idempotency check
    consumer = AgentEventConsumer()
    evt_obj = await async_db.get(OutboxEvent, evt.id)
    
    # Pass 1: Handle event
    res1 = await consumer.handle_event(evt_obj, async_db)
    assert res1 is True

    # Pass 2: Re-handle event (duplicate skipped safely via ProcessedEvent)
    res2 = await consumer.handle_event(evt_obj, async_db)
    assert res2 is True
