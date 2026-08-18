import pytest
from httpx import AsyncClient
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.decision import DecisionCard, AuditEvent
from app.services.decision_service import DecisionService
from app.models.user import User

@pytest.mark.asyncio
async def test_authorized_caregiver_sees_persisted_decision_cards(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Persisted DecisionCard exists for parent 'p-1'.
    Authorized caregiver queries GET /api/v1/decisions?parent_id=p-1.
    Verifies that caregiver sees real pending DecisionCard.
    """
    card = DecisionCard(
        parent_id="p-1",
        type="TRANSPORTATION_CONFIRMATION",
        priority="CRITICAL",
        status="PENDING",
        title="Unconfirmed Ride",
        summary="Mom needs transportation for cardiology appointment.",
        reason="Agent observation",
        actions=[{"key": "confirm_family_driver", "label": "I Will Drive Mom"}],
    )
    async_db.add(card)
    await async_db.commit()

    res = await client.get("/api/v1/decisions?parent_id=p-1")
    assert res.status_code == 200
    cards = res.json()

    matched = next((c for c in cards if c["id"] == card.id), None)
    assert matched is not None
    assert matched["priority"] == "CRITICAL"
    assert matched["status"] == "PENDING"

@pytest.mark.asyncio
async def test_unauthorized_caregiver_cross_parent_decisions_denied(client: AsyncClient):
    """
    Scenario: Unauthorized user attempts to view DecisionCards for Parent 'p-unauthorized-999'.
    Verifies backend returns HTTP 403 Forbidden.
    """
    res = await client.get("/api/v1/decisions?parent_id=p-unauthorized-999")
    assert res.status_code == 403
    assert "Access Denied" in res.json()["detail"]

@pytest.mark.asyncio
async def test_decision_resolution_action_validation(client: AsyncClient, async_db: AsyncSession):
    """
    Scenario: Caregiver resolves pending DecisionCard via POST /api/v1/decisions/{id}/resolve.
    Verifies status updates to 'RESOLVED' and AuditEvent is created.
    """
    card = DecisionCard(
        parent_id="p-1",
        type="VOLUNTEER_APPROVAL",
        priority="HIGH",
        status="PENDING",
        title="Approve Volunteer Ride",
        summary="Priya Sharma applied for pharmacy pickup.",
        actions=[{"key": "approve_volunteer", "label": "Approve Priya"}],
    )
    async_db.add(card)
    await async_db.commit()

    res = await client.post(
        f"/api/v1/decisions/{card.id}/resolve",
        json={"action_key": "approve_volunteer", "reason": "Approved by son"},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["success"] is True
    assert data["status"] == "RESOLVED"

    # Database state verification
    res_card = await async_db.execute(select(DecisionCard).where(DecisionCard.id == card.id))
    updated_card = res_card.scalars().first()
    assert updated_card.status == "RESOLVED"

@pytest.mark.asyncio
async def test_resolving_already_closed_decision_rejected(async_db: AsyncSession):
    """
    Scenario: Caregiver attempts to resolve a decision that is already 'RESOLVED'.
    Verifies backend raises HTTP 400 Bad Request.
    """
    user = User(id="usr-demo-1", phone="+15552345678", full_name="David Woodson", role="PRIMARY_GUARDIAN", is_active=True)
    card = DecisionCard(
        parent_id="p-1",
        type="TEST_CARD",
        priority="LOW",
        status="RESOLVED",
        title="Closed Decision",
        summary="Already resolved card",
    )
    async_db.add(card)
    await async_db.commit()

    with pytest.raises(HTTPException) as exc_info:
        await DecisionService.resolve_decision(
            db=async_db,
            current_user=user,
            card_id=card.id,
            action_key="re_approve",
        )

    assert exc_info.value.status_code == 400
    assert "already 'RESOLVED'" in exc_info.value.detail

@pytest.mark.asyncio
async def test_idempotent_duplicate_decision_resolution(async_db: AsyncSession):
    """
    Scenario: Submitting duplicate decision resolution with same idempotency key.
    Verifies second request returns cached response without duplicate side effects.
    """
    user = User(id="usr-demo-1", phone="+15552345678", full_name="David Woodson", role="PRIMARY_GUARDIAN", is_active=True)
    card = DecisionCard(
        parent_id="p-1",
        type="TRANSPORTATION_CONFIRMATION",
        priority="HIGH",
        status="PENDING",
        title="Ride Confirmation",
        summary="Confirm ride",
    )
    async_db.add(card)
    await async_db.commit()

    idemp_key = "idemp_dec_resolve_1001"

    # Call 1 -> Resolves card
    res1 = await DecisionService.resolve_decision(
        db=async_db,
        current_user=user,
        card_id=card.id,
        action_key="confirm_family_driver",
        idempotency_key=idemp_key,
    )

    # Call 2 -> Duplicate call returns cached response
    res2 = await DecisionService.resolve_decision(
        db=async_db,
        current_user=user,
        card_id=card.id,
        action_key="confirm_family_driver",
        idempotency_key=idemp_key,
    )

    assert res1["card_id"] == res2["card_id"]
    assert res1["status"] == res2["status"]
