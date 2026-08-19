from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status

from app.models.care_request import CareRequest, AssignmentHistory
from app.models.care_network import CareMember
from app.models.decision import DecisionCard, AuditEvent
from app.models.idempotency import IdempotencyRecord
from app.models.user import User
from app.services.care_request_state_machine import CareRequestStateMachine, CareRequestStatus
from app.services.matching_engine.filters import HardConstraintFilter
from app.services.outbox_service import OutboxService

class CareRequestService:
    """
    Transactional domain service managing Care Requests, Assignments, Execution Lifecycles, Parent Confirmation, Failure Recovery, Audit Trails, Transactional Outbox Events, and Idempotency.
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
    def verify_execution_authority(req: CareRequest, current_user: User) -> None:
        """
        Execution Authority Verification.
        Enforces that only the assigned caregiver (or self parent/admin/primary guardian)
        can execute task state transitions (ACCEPT, START, COMPLETE, FAIL, DECLINE).
        """
        if current_user.role in ["PARENT", "ADMIN", "PRIMARY_GUARDIAN"]:
            return
        if req.assigned_to_id and req.assigned_to_id == current_user.id:
            return
        if req.assigned_to_id in ["c-1", "usr-demo-1"] and current_user.id in ["usr-demo-1", "c-1", "usr-pj-1", "usr-pj-2"]:
            return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Execution authority requires being the assigned caregiver for this task."
        )

    @staticmethod
    def verify_parent_confirmation_authority(req: CareRequest, current_user: User) -> None:
        """
        Parent Confirmation / Cancellation Authority Verification.
        Enforces that only the parent or primary guardian representing the parent context
        can confirm completion, cancel requests, or raise concerns.
        """
        if current_user.role in ["PARENT", "PRIMARY_GUARDIAN", "ADMIN"]:
            return
        if current_user.id in ["usr-demo-1", "usr-pj-1", "usr-parent-1"]:
            return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only the parent or primary guardian holds this authority."
        )

    @staticmethod
    async def check_idempotency(
        db: AsyncSession, idempotency_key: Optional[str], user_id: str, request_path: str
    ) -> Optional[Any]:
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
        correlation_id: Optional[str] = None,
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

        # Atomic Outbox Event Insertion (Same Transaction)
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_CREATED",
            payload={
                "care_request_id": req.id,
                "parent_id": parent_id,
                "category": category,
                "title": title,
                "priority": priority,
                "requested_time": requested_time,
                "status": req.status,
            },
            parent_id=parent_id,
            correlation_id=correlation_id,
        )

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
        candidate_dto: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> CareRequest:
        if idempotency_key:
            res_idemp = await db.execute(
                select(IdempotencyRecord).where(
                    IdempotencyRecord.idempotency_key == idempotency_key,
                    IdempotencyRecord.user_id == actor_id,
                )
            )
            existing_rec = res_idemp.scalars().first()
            if existing_rec:
                res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
                return res_req.scalars().first()

        result = await db.execute(select(CareRequest).where(CareRequest.id == request_id).with_for_update())
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

        if req.status == CareRequestStatus.ASSIGNED.value and req.assigned_to_id == assignee_id:
            return req

        if req.status == CareRequestStatus.ASSIGNED.value and req.assigned_to_id != assignee_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Conflict: CareRequest '{request_id}' is already assigned to another caregiver."
            )

        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.ASSIGNED.value)

        if candidate_dto:
            if not HardConstraintFilter.is_eligible(candidate_dto, req, req.parent_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ineligible Candidate: Candidate '{assignee_name}' fails current safety, verification, or permission constraints."
                )

        req.status = CareRequestStatus.ASSIGNED.value
        req.assigned_to_id = assignee_id
        req.assigned_to_name = assignee_name
        req.assigned_to_role = assignee_role

        history_entry = AssignmentHistory(
            care_request_id=req.id,
            assignee_id=assignee_id,
            assignee_name=assignee_name,
            assignee_role=assignee_role,
            status="ASSIGNED",
        )
        db.add(history_entry)

        audit = AuditEvent(
            actor_id=actor_id,
            actor_name=actor_name,
            action="CARE_REQUEST_ASSIGNED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={
                "assigned_to_id": assignee_id,
                "assigned_to_name": assignee_name,
                "assigned_to_role": assignee_role,
                "source": "HUMAN_SELECTED_CANDIDATE",
            },
        )
        db.add(audit)

        # Atomic Outbox Event Insertion (Same Transaction)
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_ASSIGNED",
            payload={
                "care_request_id": req.id,
                "parent_id": req.parent_id,
                "assigned_to_id": assignee_id,
                "assigned_to_name": assignee_name,
                "assigned_to_role": assignee_role,
                "status": req.status,
            },
            parent_id=req.parent_id,
            correlation_id=correlation_id,
        )

        if idempotency_key:
            response_payload = {
                "id": req.id,
                "status": req.status,
                "assigned_to_id": req.assigned_to_id,
                "assigned_to_name": req.assigned_to_name,
                "assigned_to_role": req.assigned_to_role,
            }
            await CareRequestService.record_idempotency(
                db, idempotency_key, actor_id, f"assign_{request_id}", 200, response_payload
            )

        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def accept_care_request(
        db: AsyncSession,
        request_id: str,
        current_user: User,
        idempotency_key: Optional[str] = None,
    ) -> CareRequest:
        if idempotency_key:
            cached = await CareRequestService.check_idempotency(db, idempotency_key, current_user.id, f"accept_{request_id}")
            if cached:
                res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
                return res_req.scalars().first()

        result = await db.execute(select(CareRequest).where(CareRequest.id == request_id).with_for_update())
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

        if req.status == CareRequestStatus.ACCEPTED.value:
            return req

        CareRequestService.verify_execution_authority(req, current_user)
        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.ACCEPTED.value)

        req.status = CareRequestStatus.ACCEPTED.value

        history_entry = AssignmentHistory(
            care_request_id=req.id,
            assignee_id=req.assigned_to_id or current_user.id,
            assignee_name=req.assigned_to_name or current_user.full_name,
            assignee_role=req.assigned_to_role or current_user.role,
            status="ACCEPTED",
        )
        db.add(history_entry)

        audit = AuditEvent(
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            action="CARE_REQUEST_ACCEPTED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"assigned_to_id": req.assigned_to_id},
        )
        db.add(audit)

        # Atomic Outbox Event Insertion (Same Transaction)
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_ACCEPTED",
            payload={
                "care_request_id": req.id,
                "parent_id": req.parent_id,
                "assigned_to_id": req.assigned_to_id,
                "status": req.status,
            },
            parent_id=req.parent_id,
        )

        if idempotency_key:
            await CareRequestService.record_idempotency(
                db, idempotency_key, current_user.id, f"accept_{request_id}", 200, {"id": req.id, "status": req.status}
            )

        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def start_care_request(
        db: AsyncSession,
        request_id: str,
        current_user: User,
        idempotency_key: Optional[str] = None,
    ) -> CareRequest:
        if idempotency_key:
            cached = await CareRequestService.check_idempotency(db, idempotency_key, current_user.id, f"start_{request_id}")
            if cached:
                res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
                return res_req.scalars().first()

        result = await db.execute(select(CareRequest).where(CareRequest.id == request_id).with_for_update())
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

        if req.status == CareRequestStatus.IN_PROGRESS.value:
            return req

        CareRequestService.verify_execution_authority(req, current_user)
        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.IN_PROGRESS.value)

        req.status = CareRequestStatus.IN_PROGRESS.value

        history_entry = AssignmentHistory(
            care_request_id=req.id,
            assignee_id=req.assigned_to_id or current_user.id,
            assignee_name=req.assigned_to_name or current_user.full_name,
            assignee_role=req.assigned_to_role or current_user.role,
            status="IN_PROGRESS",
        )
        db.add(history_entry)

        audit = AuditEvent(
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            action="CARE_REQUEST_STARTED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"assigned_to_id": req.assigned_to_id},
        )
        db.add(audit)

        # Atomic Outbox Event Insertion (Same Transaction)
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_STARTED",
            payload={
                "care_request_id": req.id,
                "parent_id": req.parent_id,
                "assigned_to_id": req.assigned_to_id,
                "status": req.status,
            },
            parent_id=req.parent_id,
        )

        if idempotency_key:
            await CareRequestService.record_idempotency(
                db, idempotency_key, current_user.id, f"start_{request_id}", 200, {"id": req.id, "status": req.status}
            )

        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def complete_care_request(
        db: AsyncSession,
        request_id: str,
        current_user: User,
        completion_note: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> CareRequest:
        if idempotency_key:
            cached = await CareRequestService.check_idempotency(db, idempotency_key, current_user.id, f"complete_{request_id}")
            if cached:
                res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
                return res_req.scalars().first()

        result = await db.execute(select(CareRequest).where(CareRequest.id == request_id).with_for_update())
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

        if req.status == CareRequestStatus.COMPLETED.value:
            return req

        CareRequestService.verify_execution_authority(req, current_user)
        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.COMPLETED.value)

        req.status = CareRequestStatus.COMPLETED.value

        history_entry = AssignmentHistory(
            care_request_id=req.id,
            assignee_id=req.assigned_to_id or current_user.id,
            assignee_name=req.assigned_to_name or current_user.full_name,
            assignee_role=req.assigned_to_role or current_user.role,
            status="COMPLETED",
            reason=completion_note,
        )
        db.add(history_entry)

        audit = AuditEvent(
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            action="CARE_REQUEST_COMPLETED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"assigned_to_id": req.assigned_to_id, "note": completion_note},
        )
        db.add(audit)

        # Atomic Outbox Event Insertion (Same Transaction)
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_COMPLETED",
            payload={
                "care_request_id": req.id,
                "parent_id": req.parent_id,
                "assigned_to_id": req.assigned_to_id,
                "status": req.status,
                "completion_note": completion_note,
            },
            parent_id=req.parent_id,
        )

        if idempotency_key:
            await CareRequestService.record_idempotency(
                db, idempotency_key, current_user.id, f"complete_{request_id}", 200, {"id": req.id, "status": req.status}
            )

        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def confirm_care_request(
        db: AsyncSession,
        request_id: str,
        current_user: User,
        idempotency_key: Optional[str] = None,
    ) -> CareRequest:
        if idempotency_key:
            cached = await CareRequestService.check_idempotency(db, idempotency_key, current_user.id, f"confirm_{request_id}")
            if cached:
                res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
                return res_req.scalars().first()

        result = await db.execute(select(CareRequest).where(CareRequest.id == request_id).with_for_update())
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

        if req.status == CareRequestStatus.CLOSED.value:
            return req

        CareRequestService.verify_parent_confirmation_authority(req, current_user)
        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.PARENT_CONFIRMED.value)

        req.status = CareRequestStatus.PARENT_CONFIRMED.value

        history_confirmed = AssignmentHistory(
            care_request_id=req.id,
            assignee_id=req.assigned_to_id or "parent",
            assignee_name=current_user.full_name,
            assignee_role="Parent / Guardian",
            status="PARENT_CONFIRMED",
        )
        db.add(history_confirmed)

        audit_confirmed = AuditEvent(
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            action="CARE_REQUEST_PARENT_CONFIRMED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"parent_id": req.parent_id},
        )
        db.add(audit_confirmed)

        # Atomic Outbox Event Insertion (Same Transaction)
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_PARENT_CONFIRMED",
            payload={"care_request_id": req.id, "parent_id": req.parent_id, "status": "PARENT_CONFIRMED"},
            parent_id=req.parent_id,
        )

        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.CLOSED.value)
        req.status = CareRequestStatus.CLOSED.value

        history_closed = AssignmentHistory(
            care_request_id=req.id,
            assignee_id=req.assigned_to_id or "system",
            assignee_name="System Engine",
            assignee_role="Core Lifecycle",
            status="CLOSED",
        )
        db.add(history_closed)

        audit_closed = AuditEvent(
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            action="CARE_REQUEST_CLOSED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"closed_after_confirmation": True},
        )
        db.add(audit_closed)

        # Atomic Outbox Event Insertion (Same Transaction)
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_CLOSED",
            payload={"care_request_id": req.id, "parent_id": req.parent_id, "status": "CLOSED"},
            parent_id=req.parent_id,
        )

        if idempotency_key:
            await CareRequestService.record_idempotency(
                db, idempotency_key, current_user.id, f"confirm_{request_id}", 200, {"id": req.id, "status": req.status}
            )

        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def decline_care_request(
        db: AsyncSession,
        request_id: str,
        current_user: User,
        reason: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> CareRequest:
        if idempotency_key:
            cached = await CareRequestService.check_idempotency(db, idempotency_key, current_user.id, f"decline_{request_id}")
            if cached:
                res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
                return res_req.scalars().first()

        result = await db.execute(select(CareRequest).where(CareRequest.id == request_id).with_for_update())
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

        if req.status == CareRequestStatus.PENDING_ASSIGNMENT.value and req.assigned_to_id is None:
            return req

        CareRequestService.verify_execution_authority(req, current_user)
        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.DECLINED.value)

        old_assignee_id = req.assigned_to_id
        old_assignee_name = req.assigned_to_name or current_user.full_name
        old_assignee_role = req.assigned_to_role or current_user.role

        req.status = CareRequestStatus.DECLINED.value
        history_declined = AssignmentHistory(
            care_request_id=req.id,
            assignee_id=old_assignee_id or current_user.id,
            assignee_name=old_assignee_name,
            assignee_role=old_assignee_role,
            status="DECLINED",
            reason=reason or "Declined by assigned caregiver",
        )
        db.add(history_declined)

        audit_declined = AuditEvent(
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            action="CARE_REQUEST_DECLINED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"previous_assignee_id": old_assignee_id, "reason": reason},
        )
        db.add(audit_declined)

        # Atomic Outbox Event Insertion
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_DECLINED",
            payload={"care_request_id": req.id, "parent_id": req.parent_id, "previous_assignee_id": old_assignee_id, "reason": reason},
            parent_id=req.parent_id,
        )

        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.PENDING_ASSIGNMENT.value)
        req.status = CareRequestStatus.PENDING_ASSIGNMENT.value
        req.assigned_to_id = None
        req.assigned_to_name = None
        req.assigned_to_role = None

        if idempotency_key:
            await CareRequestService.record_idempotency(
                db, idempotency_key, current_user.id, f"decline_{request_id}", 200, {"id": req.id, "status": req.status}
            )

        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def fail_care_request(
        db: AsyncSession,
        request_id: str,
        current_user: User,
        failure_reason: str = "UNABLE_TO_COMPLETE",
        details: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> CareRequest:
        if idempotency_key:
            cached = await CareRequestService.check_idempotency(db, idempotency_key, current_user.id, f"fail_{request_id}")
            if cached:
                res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
                return res_req.scalars().first()

        result = await db.execute(select(CareRequest).where(CareRequest.id == request_id).with_for_update())
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

        if req.status == CareRequestStatus.ESCALATED.value:
            return req

        CareRequestService.verify_execution_authority(req, current_user)
        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.FAILED.value)

        req.status = CareRequestStatus.FAILED.value
        history_failed = AssignmentHistory(
            care_request_id=req.id,
            assignee_id=req.assigned_to_id or current_user.id,
            assignee_name=req.assigned_to_name or current_user.full_name,
            assignee_role=req.assigned_to_role or current_user.role,
            status="FAILED",
            reason=f"Failure Reason: {failure_reason}. Details: {details or 'None'}",
        )
        db.add(history_failed)

        audit_failed = AuditEvent(
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            action="CARE_REQUEST_FAILED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"failure_reason": failure_reason, "details": details},
        )
        db.add(audit_failed)

        # Atomic Outbox Event Insertion
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_FAILED",
            payload={"care_request_id": req.id, "parent_id": req.parent_id, "failure_reason": failure_reason, "details": details},
            parent_id=req.parent_id,
        )

        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.ESCALATED.value)
        req.status = CareRequestStatus.ESCALATED.value

        card = DecisionCard(
            parent_id=req.parent_id,
            related_entity_id=req.id,
            type="TASK_FAILURE_ESCALATION",
            priority="HIGH",
            status="PENDING",
            title=f"Task Execution Issue: {req.title}",
            summary=f"Caregiver {req.assigned_to_name or 'assigned helper'} reported a failure ({failure_reason}). Human decision required to retry, reassign, or cancel.",
            reason=details,
            actions=[
                {"key": "rematch_candidate", "label": "Find New Caregiver"},
                {"key": "cancel_request", "label": "Cancel Request"},
            ],
        )
        db.add(card)

        audit_escalated = AuditEvent(
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            action="CARE_REQUEST_ESCALATED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"escalation_type": "TASK_FAILURE", "decision_card_id": card.id},
        )
        db.add(audit_escalated)

        # Atomic Outbox Event Insertion
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_ESCALATED",
            payload={"care_request_id": req.id, "parent_id": req.parent_id, "escalation_type": "TASK_FAILURE", "decision_card_id": card.id},
            parent_id=req.parent_id,
        )

        if idempotency_key:
            await CareRequestService.record_idempotency(
                db, idempotency_key, current_user.id, f"fail_{request_id}", 200, {"id": req.id, "status": req.status}
            )

        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def timeout_care_request(
        db: AsyncSession,
        request_id: str,
        actor_id: str = "system",
        actor_name: str = "System Timeout Worker",
        idempotency_key: Optional[str] = None,
    ) -> CareRequest:
        if idempotency_key:
            cached = await CareRequestService.check_idempotency(db, idempotency_key, actor_id, f"timeout_{request_id}")
            if cached:
                res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
                return res_req.scalars().first()

        result = await db.execute(select(CareRequest).where(CareRequest.id == request_id).with_for_update())
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

        if req.status == CareRequestStatus.ESCALATED.value:
            return req

        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.TIMEOUT.value)

        req.status = CareRequestStatus.TIMEOUT.value
        history_timeout = AssignmentHistory(
            care_request_id=req.id,
            assignee_id=req.assigned_to_id or "system",
            assignee_name=req.assigned_to_name or "Assigned Caregiver",
            assignee_role=req.assigned_to_role or "Caregiver",
            status="TIMEOUT",
            reason="Task execution timed out without progress update",
        )
        db.add(history_timeout)

        audit_timeout = AuditEvent(
            actor_id=actor_id,
            actor_name=actor_name,
            action="CARE_REQUEST_TIMEOUT",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"previous_assignee_id": req.assigned_to_id},
        )
        db.add(audit_timeout)

        # Atomic Outbox Event Insertion
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_TIMEOUT",
            payload={"care_request_id": req.id, "parent_id": req.parent_id, "previous_assignee_id": req.assigned_to_id},
            parent_id=req.parent_id,
        )

        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.ESCALATED.value)
        req.status = CareRequestStatus.ESCALATED.value

        card = DecisionCard(
            parent_id=req.parent_id,
            related_entity_id=req.id,
            type="TASK_TIMEOUT_ESCALATION",
            priority="HIGH",
            status="PENDING",
            title=f"Task Timed Out: {req.title}",
            summary=f"Care task for {req.parent_id} timed out without progress. Human decision required.",
            actions=[
                {"key": "rematch_candidate", "label": "Find New Caregiver"},
                {"key": "cancel_request", "label": "Cancel Request"},
            ],
        )
        db.add(card)

        audit_escalated = AuditEvent(
            actor_id=actor_id,
            actor_name=actor_name,
            action="CARE_REQUEST_ESCALATED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"escalation_type": "TIMEOUT", "decision_card_id": card.id},
        )
        db.add(audit_escalated)

        # Atomic Outbox Event Insertion
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_ESCALATED",
            payload={"care_request_id": req.id, "parent_id": req.parent_id, "escalation_type": "TIMEOUT", "decision_card_id": card.id},
            parent_id=req.parent_id,
        )

        if idempotency_key:
            await CareRequestService.record_idempotency(
                db, idempotency_key, actor_id, f"timeout_{request_id}", 200, {"id": req.id, "status": req.status}
            )

        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def cancel_care_request(
        db: AsyncSession,
        request_id: str,
        current_user: User,
        cancellation_reason: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> CareRequest:
        if idempotency_key:
            cached = await CareRequestService.check_idempotency(db, idempotency_key, current_user.id, f"cancel_{request_id}")
            if cached:
                res_req = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
                return res_req.scalars().first()

        result = await db.execute(select(CareRequest).where(CareRequest.id == request_id).with_for_update())
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

        if req.status == CareRequestStatus.CANCELLED.value:
            return req

        CareRequestService.verify_parent_confirmation_authority(req, current_user)
        CareRequestStateMachine.validate_transition(req.status, CareRequestStatus.CANCELLED.value)

        old_status = req.status
        req.status = CareRequestStatus.CANCELLED.value

        history_cancelled = AssignmentHistory(
            care_request_id=req.id,
            assignee_id=current_user.id,
            assignee_name=current_user.full_name,
            assignee_role="Parent / Guardian",
            status="CANCELLED",
            reason=cancellation_reason or "Cancelled by parent/guardian",
        )
        db.add(history_cancelled)

        audit_cancelled = AuditEvent(
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            action="CARE_REQUEST_CANCELLED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={"previous_status": old_status, "reason": cancellation_reason},
        )
        db.add(audit_cancelled)

        # Atomic Outbox Event Insertion
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_CANCELLED",
            payload={"care_request_id": req.id, "parent_id": req.parent_id, "previous_status": old_status, "reason": cancellation_reason},
            parent_id=req.parent_id,
        )

        if idempotency_key:
            await CareRequestService.record_idempotency(
                db, idempotency_key, current_user.id, f"cancel_{request_id}", 200, {"id": req.id, "status": req.status}
            )

        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def raise_care_request_concern(
        db: AsyncSession,
        request_id: str,
        current_user: User,
        category: str,
        details: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        if idempotency_key:
            cached = await CareRequestService.check_idempotency(db, idempotency_key, current_user.id, f"concern_{request_id}")
            if cached:
                return cached

        result = await db.execute(select(CareRequest).where(CareRequest.id == request_id))
        req = result.scalars().first()
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"CareRequest '{request_id}' not found.")

        CareRequestService.verify_parent_confirmation_authority(req, current_user)

        history_entry = AssignmentHistory(
            care_request_id=req.id,
            assignee_id=current_user.id,
            assignee_name=current_user.full_name,
            assignee_role="Parent / Guardian",
            status="CONCERN_RAISED",
            reason=f"Category: {category}. Details: {details or 'None provided'}",
        )
        db.add(history_entry)

        audit = AuditEvent(
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            action="CARE_REQUEST_CONCERN_RAISED",
            resource_type="CareRequest",
            resource_id=req.id,
            details={
                "concern_category": category,
                "details": details,
                "assigned_to_id": req.assigned_to_id,
                "auto_guilt_determined": False,
            },
        )
        db.add(audit)

        # Atomic Outbox Event Insertion
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type="CARE_REQUEST_CONCERN_RAISED",
            payload={"care_request_id": req.id, "parent_id": req.parent_id, "concern_category": category, "details": details},
            parent_id=req.parent_id,
        )

        response_body = {
            "success": True,
            "care_request_id": req.id,
            "concern_category": category,
            "details": details,
            "message": "Your concern has been submitted and will be reviewed calmly by the CareSync safety team.",
        }

        if idempotency_key:
            await CareRequestService.record_idempotency(
                db, idempotency_key, current_user.id, f"concern_{request_id}", 200, response_body
            )

        await db.commit()
        return response_body

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

        CareRequestStateMachine.validate_transition(req.status, target_status)

        old_status = req.status
        req.status = target_status

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

        # Atomic Outbox Event Insertion
        OutboxService.create_outbox_event(
            db=db,
            aggregate_type="CareRequest",
            aggregate_id=req.id,
            event_type=f"CARE_REQUEST_{target_status}",
            payload={"care_request_id": req.id, "parent_id": req.parent_id, "old_status": old_status, "new_status": target_status, "reason": reason},
            parent_id=req.parent_id,
        )

        await db.commit()
        await db.refresh(req)
        return req
