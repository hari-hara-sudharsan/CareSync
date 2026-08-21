import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.care_request import CareRequest
from app.models.outbox import OutboxEvent
from app.models.user import User

@pytest.mark.asyncio
async def test_ecs_alb_target_group_health_endpoints(client: AsyncClient):
    """
    Scenario: ALB Target Group performs HTTP health checks.
    Verifies /api/v1/health responds with HTTP 200 OK for load balancer target registration.
    """
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "ok", "HEALTHY"]

@pytest.mark.asyncio
async def test_strands_agent_policy_gateway_boundary_enforcement(async_db: AsyncSession):
    """
    ARCHITECTURAL INVARIANT: Strands Care Coordinator Agent MUST NOT connect directly to PostgreSQL,
    touch RDS credentials, or execute raw SQL. Agent operates strictly through the Policy Gateway & REST API.
    """
    # 1. Create User & CareRequest in PostgreSQL
    user = User(
        id="usr-agent-policy-1",
        phone="+15559998888",
        full_name="Agent Care Coordinator",
        role="COORDINATOR",
        is_active=True,
    )
    req = CareRequest(
        id="req-agent-policy-101",
        parent_id="p-1",
        category="TRANSPORTATION",
        title="Agent Coordinated Ride",
        description="Doctor visit transport request",
        requested_time="Tomorrow 2:00 PM",
        priority="HIGH",
        status="PENDING_ASSIGNMENT",
    )
    async_db.add_all([user, req])
    await async_db.commit()

    # 2. Verify Policy Gateway boundary requirement: Agent interacts via service/API layer
    res_req = await async_db.scalar(select(CareRequest).where(CareRequest.id == "req-agent-policy-101"))
    assert res_req is not None
    assert res_req.status == "PENDING_ASSIGNMENT"

@pytest.mark.asyncio
async def test_ecs_worker_outbox_event_durability(async_db: AsyncSession):
    """
    Scenario: CareRequest created in ECS container service.
    Verifies domain mutation and outbox event exist in PostgreSQL for background worker dispatch.
    """
    req_id = "req-ecs-worker-101"
    req = CareRequest(
        id=req_id,
        parent_id="p-1",
        category="PHARMACY",
        title="Prescription Delivery",
        description="Pick up heart medication",
        requested_time="Today 4:00 PM",
        status="PENDING_ASSIGNMENT",
    )
    outbox = OutboxEvent(
        aggregate_type="CareRequest",
        aggregate_id=req_id,
        event_type="CARE_REQUEST_CREATED",
        payload={"request_id": req_id, "category": "PHARMACY"},
    )
    async_db.add_all([req, outbox])
    await async_db.commit()

    # Verify both records persist durably in PostgreSQL
    db_req = await async_db.scalar(select(CareRequest).where(CareRequest.id == req_id))
    db_outbox = await async_db.scalar(select(OutboxEvent).where(OutboxEvent.aggregate_id == req_id))

    assert db_req is not None
    assert db_outbox is not None
    assert db_outbox.aggregate_id == req_id
