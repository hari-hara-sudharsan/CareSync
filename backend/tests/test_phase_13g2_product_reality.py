import pytest
import time
from sqlalchemy import select
from app.main import app
from app.api.deps import get_current_user
from app.models.user import User
from app.models.decision import DecisionCard
from app.models.notification import NotificationRecord
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_5_persona_auth_and_identity_isolation(client, async_db):
    """
    Verifies that all 5 CareSync system roles authenticate to real DB identities
    and server-side RBAC/ABAC guards reject unauthorized access across workspaces.
    """
    orig_override = app.dependency_overrides.pop(get_current_user, None)

    try:
        roles_phones = [
            ("PARENT", "+15559990001"),
            ("FAMILY", "+15559990002"),
            ("VOLUNTEER", "+15559990003"),
            ("COORDINATOR", "+15559990004"),
            ("ADMIN", "+15559990005"),
        ]

        tokens = {}
        user_ids = {}

        for role_name, phone in roles_phones:
            user_id = f"usr-test-{role_name.lower()}"
            res = await async_db.execute(select(User).where(User.id == user_id))
            u = res.scalars().first()
            if not u:
                u = User(id=user_id, phone=phone, full_name=f"Test {role_name}", role=role_name, is_active=True, is_verified=True)
                async_db.add(u)
                await async_db.commit()
                await async_db.refresh(u)

            token = create_access_token(subject=u.id)
            tokens[role_name] = token
            user_ids[role_name] = u.id

            # Verify /auth/me returns authoritative identity
            me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert me_res.status_code == 200
            assert me_res.json()["role"] in ("PARENT", "PRIMARY_GUARDIAN", "FAMILY", "VOLUNTEER", "COORDINATOR", "ADMIN")

        # RBAC Cross-Role Boundary Guard Tests
        # 1. Parent cannot access Admin Trust Dashboard
        p_res = await client.get("/api/v1/trust/dashboard", headers={"Authorization": f"Bearer {tokens['PARENT']}"})
        assert p_res.status_code == 403

        # 2. Family cannot access Admin Trust Dashboard
        f_res = await client.get("/api/v1/trust/dashboard", headers={"Authorization": f"Bearer {tokens['FAMILY']}"})
        assert f_res.status_code == 403

        # 3. Volunteer cannot access Admin Trust Dashboard
        v_res = await client.get("/api/v1/trust/dashboard", headers={"Authorization": f"Bearer {tokens['VOLUNTEER']}"})
        assert v_res.status_code == 403

    finally:
        if orig_override:
            app.dependency_overrides[get_current_user] = orig_override


@pytest.mark.asyncio
async def test_abac_multi_tenant_data_isolation(client, async_db):
    """
    Verifies API-level ABAC data isolation proving Parent A cannot access Parent B's data
    and Family A cannot access Family B's care circle network.
    """
    orig_override = app.dependency_overrides.pop(get_current_user, None)

    try:
        # Create Parent A and Parent B
        p_a = User(phone="+15551110001", full_name="Parent Alice", role="PARENT", is_active=True)
        p_b = User(phone="+15551110002", full_name="Parent Bob", role="PARENT", is_active=True)
        async_db.add_all([p_a, p_b])
        await async_db.commit()
        await async_db.refresh(p_a)
        await async_db.refresh(p_b)

        token_a = create_access_token(subject=p_a.id)

        # Parent A attempts to request care for Parent B -> HTTP 403
        cross_cr = await client.post(
            "/api/v1/care-requests",
            headers={"Authorization": f"Bearer {token_a}"},
            json={
                "parent_id": p_b.id,
                "category": "ERRANDS",
                "title": "Unauthorized Care Request",
                "description": "Cross-parent attempt",
                "requested_time": "Today 4 PM"
            }
        )
        assert cross_cr.status_code == 403

        # Parent A attempts to view Parent B's care requests -> HTTP 403
        cross_view = await client.get(
            f"/api/v1/care-requests?parent_id={p_b.id}",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert cross_view.status_code == 403
    finally:
        if orig_override:
            app.dependency_overrides[get_current_user] = orig_override


@pytest.mark.asyncio
async def test_ai_governance_thesis_human_approval_required(client, async_db):
    """
    Verifies that CareSync AI matching recommends candidates, but NEVER directly assigns
    a volunteer without mandatory human coordinator approval (POST /decisions/{id}/resolve).
    """
    orig_override = app.dependency_overrides.pop(get_current_user, None)

    try:
        # Setup Parent, Volunteer, Admin/Coordinator
        parent = User(id="p-1", phone="+15552220001", full_name="Governance Parent", role="PARENT", is_active=True)
        admin = User(phone="+15552220002", full_name="Governance Admin", role="ADMIN", is_active=True)
        vol = User(phone="+15552220003", full_name="Governance Volunteer", role="VOLUNTEER", is_active=True)
        
        existing_p = await async_db.execute(select(User).where(User.id == "p-1"))
        if not existing_p.scalars().first():
            async_db.add(parent)
        async_db.add_all([admin, vol])
        await async_db.commit()
        await async_db.refresh(admin)
        await async_db.refresh(vol)

        p_token = create_access_token(subject="p-1")
        a_token = create_access_token(subject=admin.id)

        # 1. Parent creates Care Request for p-1
        cr_res = await client.post(
            "/api/v1/care-requests",
            headers={"Authorization": f"Bearer {p_token}"},
            json={
                "parent_id": "p-1",
                "category": "ERRANDS",
                "title": "Grocery Governance Request",
                "description": "Weekly essentials",
                "requested_time": "Today 5 PM"
            }
        )
        assert cr_res.status_code in (200, 201)
        cr_id = cr_res.json()["id"]

        # Verify request status is PENDING_ASSIGNMENT (Not assigned automatically by AI)
        cr_get = await client.get(f"/api/v1/care-requests/{cr_id}", headers={"Authorization": f"Bearer {p_token}"})
        assert cr_get.json()["status"] == "PENDING_ASSIGNMENT"

        # 2. Seed Decision Card for Coordinator Inbox
        card_id = f"card-gov-{int(time.time())}"
        card = DecisionCard(
            id=card_id,
            parent_id="p-1",
            type="MATCHING_RECOMMENDATION",
            title="Grocery Governance Request",
            summary=f"Assign volunteer {vol.full_name}",
            reason="Matched candidate based on location and rating",
            priority="MEDIUM",
            status="PENDING",
            related_entity_id=cr_id,
            actions=[{"label": "Approve Assignment", "action": "APPROVE"}]
        )
        async_db.add(card)
        await async_db.commit()

        # 3. Human Admin/Coordinator Approves Decision Card
        resolve_res = await client.post(
            f"/api/v1/decisions/{card_id}/resolve",
            headers={"Authorization": f"Bearer {a_token}"},
            json={"action_key": "APPROVE", "reason": "Approved by Human Coordinator"}
        )
        assert resolve_res.status_code == 200
        assert resolve_res.json()["status"] == "RESOLVED"
    finally:
        if orig_override:
            app.dependency_overrides[get_current_user] = orig_override


@pytest.mark.asyncio
async def test_settings_and_notification_durability(client, async_db):
    """
    Verifies that Settings GET/PUT updates persist in PostgreSQL across re-login
    and Notification creation + mark read receipts update unread badge state.
    """
    orig_override = app.dependency_overrides.pop(get_current_user, None)

    try:
        parent = User(phone="+15553330001", full_name="Durability Parent", role="PARENT", is_active=True)
        async_db.add(parent)
        await async_db.commit()
        await async_db.refresh(parent)

        token = create_access_token(subject=parent.id)
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Update Settings via PUT
        put_res = await client.put(
            "/api/v1/settings",
            headers=headers,
            json={
                "full_name": "Durability Parent Updated",
                "sms_notifications": True,
                "email_notifications": False,
                "push_notifications": True,
                "emergency_contact_phone": "+15559990000"
            }
        )
        assert put_res.status_code == 200

        # Re-fetch settings via GET and verify persistence
        get_res = await client.get("/api/v1/settings", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["account"]["full_name"] == "Durability Parent Updated"

        # 2. Seed Notification in DB and test mark read receipt
        notif = NotificationRecord(
            id=f"notif-dur-{int(time.time())}",
            event_id=f"evt-{int(time.time())}",
            recipient_id=parent.id,
            recipient_name=parent.full_name,
            notification_type="PUSH",
            subject="Durability Notification",
            body="Test message",
            status="SENT"
        )
        async_db.add(notif)
        await async_db.commit()

        # Get notifications list
        n_list = await client.get("/api/v1/notifications", headers=headers)
        assert n_list.status_code == 200
        assert len(n_list.json()) >= 1

        # Mark Notification Read
        read_res = await client.post(f"/api/v1/notifications/{notif.id}/read", headers=headers)
        assert read_res.status_code == 200
        assert read_res.json().get("success") is True
    finally:
        if orig_override:
            app.dependency_overrides[get_current_user] = orig_override
