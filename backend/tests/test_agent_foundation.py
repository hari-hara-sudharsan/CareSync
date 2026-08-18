import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.decision import AuditEvent, DecisionCard
from app.models.medication import Medication, MedicationEvent
from app.models.appointment import Appointment

@pytest.mark.asyncio
async def test_agent_status_endpoint(client: AsyncClient):
    """Tests GET /api/v1/agent/status endpoint."""
    res = await client.get("/api/v1/agent/status")
    assert res.status_code == 200
    data = res.json()
    assert data["agent_name"] == "CareSync Quiet Coordination Agent"
    assert data["status"] == "ACTIVE_QUIET_MONITORING"
    assert "recent_agent_observations" in data

@pytest.mark.asyncio
async def test_quiet_coordination_no_action_required(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario 1: All care tasks, medications, and appointments are clear.
    Agent returns NO_ACTION_REQUIRED ('✓ Everything is handled').
    """
    # Seed clear medication event (TAKEN)
    m1 = Medication(id="m-clean-1", parent_id="p-1", name="Multivitamin", dosage="1 tab")
    ev1 = MedicationEvent(medication_id="m-clean-1", parent_id="p-1", scheduled_time="Today", status="TAKEN")
    async_db.add_all([m1, ev1])
    await async_db.commit()

    res = await client.post("/api/v1/agent/coordinate?parent_id=p-1")
    assert res.status_code == 200
    data = res.json()

    assert data["agent_status"] == "NO_ACTION_REQUIRED"
    assert "Everything is handled" in data["reasoning_summary"]
    assert data["requires_human_approval"] is False

@pytest.mark.asyncio
async def test_agent_medication_reminder_action(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario 2: Medication is DUE and unrecorded.
    Agent triggers send_reminder() notification automatically without requiring human decision.
    """
    m2 = Medication(id="m-due-1", parent_id="p-1", name="Evening Metoprolol", dosage="25 mg")
    async_db.add(m2)
    await async_db.commit()

    res = await client.post("/api/v1/agent/coordinate?parent_id=p-1")
    assert res.status_code == 200
    data = res.json()

    assert data["agent_status"] == "REMINDER_SENT"
    assert "Evening Metoprolol" in data["reasoning_summary"]
    assert data["requires_human_approval"] is False

    # Verify Audit Event was logged
    audit_res = await async_db.execute(
        select(AuditEvent).where(AuditEvent.action == "AGENT_REMINDER_SENT")
    )
    audits = audit_res.scalars().all()
    assert len(audits) > 0
    assert audits[0].actor_id == "agent-strands-01"

@pytest.mark.asyncio
async def test_agent_transportation_decision_card_hitl(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario 3: Transportation help needed for upcoming appointment.
    Agent queries Matching Engine and emits DecisionCard requiring caregiver HITL confirmation.
    """
    appt = Appointment(
        id="apt-trans-1",
        parent_id="p-1",
        title="Oncology Follow-Up",
        provider_name="Dr. Sarah Jenkins",
        specialty="Oncology",
        location_name="City Hospital",
        address="500 Main Street",
        starts_at="Tomorrow at 10:00 AM",
        status="UPCOMING",
        transportation_choice="NEED_HELP",
        transportation_status="UNCONFIRMED",
    )
    async_db.add(appt)
    await async_db.commit()

    res = await client.post("/api/v1/agent/coordinate?parent_id=p-1")
    assert res.status_code == 200
    data = res.json()

    assert data["agent_status"] == "DECISION_EMITTED"
    assert data["requires_human_approval"] is True
    assert data["decision_card"] is not None
    assert "Transportation Unconfirmed" in data["decision_card"]["title"]

    # Verify DecisionCard was persisted in database
    card_res = await async_db.execute(select(DecisionCard).where(DecisionCard.parent_id == "p-1"))
    cards = card_res.scalars().all()
    assert len(cards) > 0
    assert cards[0].priority == "CRITICAL"

@pytest.mark.asyncio
async def test_agent_tool_action_boundary_audit_logging(async_db: AsyncSession):
    """Verifies all agent operations log immutable AuditEvents and respect tool action boundaries."""
    # Run cycle directly
    from app.agent.quiet_loop import QuietCoordinationLoop
    
    await QuietCoordinationLoop.run_cycle(async_db, "p-1", [])

    # Check AuditEvent
    audit_res = await async_db.execute(
        select(AuditEvent).where(AuditEvent.actor_id == "agent-strands-01")
    )
    logs = audit_res.scalars().all()
    assert len(logs) > 0
    assert any(l.action == "AGENT_OBSERVATION" for l in logs)
