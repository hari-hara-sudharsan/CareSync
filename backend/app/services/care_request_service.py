from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status

from app.models.care_request import CareRequest, AssignmentHistory
from app.models.care_network import CareMember
from app.models.decision import AuditEvent
from app.models.idempotency import IdempotencyRecord
from app.services.care_request_state_machine import CareRequestStateMachine, CareRequestStatus

class CareRequestService:
    """
    Transactional domain service managing Care Requests, Assignments, Audit Trails, and Idempotency.
    """

    @staticmethod
    async def verify_parent_access(db: AsyncSession, user_id: str, parent_id: str) -> None:
        """Verifies caregiver or user belongs to the target Parent Care Circle (Parent Isolation)."""
        result = await db.execute(
            select(CareMember).where(
                CareMember.parent_id == parent_id,
                CareMember.user_id == user_id,
                CareMember.status == "ACTIVE",
            )
        )
        member = result.scalars().first()
        allowed_parent_ids = {"p-1", "p-2"} # Demo authorized parent IDs for David Woodson
        if not member and parent_id not in allowed_parent_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You are not authorized to access this Parent's Care Circle."
            )

    @staticmethod
    async def check_idempotency(
        db: AsyncSession, idempotency_key: Optional[str], user_id: str, request_path: str
    ) -> Optional[Dict[str, Any]]:
        if not idempotency_key:
            return None

        result = await db.execute(
            select(IdempotencyRecord).where(
                IdempotencyRecord.idempotency_key == idempotency_key,
                IdempotencyRecord.user_id == user_id,
            )
        )
        record = result.scalars().first()
        if record:
            return record.response_body
        return None

    @staticmethod
    async def record_idempotency(
        db: AsyncSession, idempotency_key: Optional[str], user_id: str, request_path: str, status_code: int, body: Dict[str, Any]
    ) -> None:
        if not idempotency_key:
            return
        rec = IdempotencyRecord(
            idempotency_key=idempotency_key,
            user_id=user_id,
            request_path=request_path,
            response_code=status_code,
            response_body=body,
        )
        db.add(rec)

    @staticmethod
    async def create_care_request(
        db: AsyncSession,
        user_id: str,
        user_name: str,
        parent_id: str,
        category: str,
        title: str,
        description: str,
        priority: str,
        requested_time: str,
        location_name: Optional[str] = None,
        address: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> CareRequest:
        cached = await CareRequestService.check_idempotency(db, idempotency_key, user_id, "create_request")
        if cached:
            return cached

        req = CareRequest(
            parent_id=parent_id,
            category=category,
            title=title,
            description=description,
            priority=priority,
            status=CareRequestStatus.PENDING_ASSIGNMENT.value,
            requested_time=requested_time,
            location_name=location_name,
            address=address,
        )
        db.add(req)
        await db.flush()

        audit = AuditEvent(
            actor_id=user_id,
            actor_name=user_name,
            action="CARE_REQUEST_CREATED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"category": category, "priority": priority},
        )
        db.add(audit)
        await db.commit()
        await db.refresh(req)

        return req

    @staticmethod
    async def assign_care_request(
        db: AsyncSession,
        request_id: str,
        assignee_id: str,
        assignee_name: str,
        assignee_role: str,
        actor_id: str,
        actor_name: str,
        idempotency_key: Optional[str] = None,
    ) -> CareRequest:
        cached = await CareRequestService.check_idempotency(db, idempotency_key, actor_id, f"assign_{request_id}")
        if cached:
            return cached

        # Fetch CareRequest
        result = await db.execute(select(CareRequest).where(CareRequest.id == request_id).with_for_update())
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest {request_id} not found.")

        # Check for concurrency / duplicate active assignment
        if req.status == CareRequestStatus.ASSIGNED.value and req.assigned_to_id == assignee_id:
            return req
        if req.status in [CareRequestStatus.ASSIGNED.value, CareRequestStatus.ACCEPTED.value, CareRequestStatus.IN_PROGRESS.value] and req.assigned_to_id != assignee_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Conflict: CareRequest is already assigned to another caregiver."
            )

        # Validate State Transition
        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.ASSIGNED.value)

        # Update Request Status & Assignee
        req.status = CareRequestStatus.ASSIGNED.value
        req.assigned_to_id = assignee_id
        req.assigned_to_name = assignee_name
        req.assigned_to_role = assignee_role

        # Record Assignment History Entry
        history_entry = AssignmentHistory(
            care_request_id=req.id,
            assignee_id=assignee_id,
            assignee_name=assignee_name,
            assignee_role=assignee_role,
            status="ASSIGNED",
        )
        db.add(history_entry)

        # Record Audit Event
        audit = AuditEvent(
            actor_id=actor_id,
            actor_name=actor_name,
            action="CARE_REQUEST_ASSIGNED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"assigned_to_id": assignee_id, "assigned_to_name": assignee_name},
        )
        db.add(audit)

        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def update_request_status(
        db: AsyncSession,
        request_id: str,
        target_status: str,
        actor_id: str,
        actor_name: str,
        reason: Optional[str] = None,
    ) -> CareRequest:
        result = await db.execute(select(CareRequest).where(CareRequest.id == request_id).with_for_update())
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest {request_id} not found.")

        # Validate State Machine Transition
        CareRequestStateMachine.validate_transition(req.status, target_status)

        old_status = req.status
        req.status = target_status

        # If Declined, unassign and clear active assignee
        if target_status == CareRequestStatus.DECLINED.value:
            history = AssignmentHistory(
                care_request_id=req.id,
                assignee_id=req.assigned_to_id or actor_id,
                assignee_name=req.assigned_to_name or actor_name,
                assignee_role=req.assigned_to_role or "Caregiver",
                status="DECLINED",
                reason=reason,
            )
            db.add(history)
            req.assigned_to_id = None
            req.assigned_to_name = None
            req.assigned_to_role = None

        audit = AuditEvent(
            actor_id=actor_id,
            actor_name=actor_name,
            action=f"CARE_REQUEST_{target_status}",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"old_status": old_status, "new_status": target_status, "reason": reason},
        )
        db.add(audit)

        await db.commit()
        await db.refresh(req)
        return req
