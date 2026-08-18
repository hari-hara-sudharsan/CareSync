from enum import Enum
from typing import Set, Dict
from fastapi import HTTPException, status

class CareRequestStatus(str, Enum):
    CREATED = "CREATED"
    CLASSIFIED = "CLASSIFIED"
    PENDING_ASSIGNMENT = "PENDING_ASSIGNMENT"
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    PARENT_CONFIRMED = "PARENT_CONFIRMED"
    CLOSED = "CLOSED"
    ESCALATED = "ESCALATED"
    FAILED = "FAILED"
    TIMEOUT = "TIMEOUT"
    CANCELLED = "CANCELLED"

# Explicit Valid State Transition Mapping
VALID_TRANSITIONS: Dict[CareRequestStatus, Set[CareRequestStatus]] = {
    CareRequestStatus.CREATED: {CareRequestStatus.CLASSIFIED, CareRequestStatus.PENDING_ASSIGNMENT, CareRequestStatus.CANCELLED, CareRequestStatus.CLOSED},
    CareRequestStatus.CLASSIFIED: {CareRequestStatus.PENDING_ASSIGNMENT, CareRequestStatus.CANCELLED, CareRequestStatus.CLOSED},
    CareRequestStatus.PENDING_ASSIGNMENT: {CareRequestStatus.ASSIGNED, CareRequestStatus.ESCALATED, CareRequestStatus.CANCELLED, CareRequestStatus.CLOSED},
    CareRequestStatus.ASSIGNED: {CareRequestStatus.ACCEPTED, CareRequestStatus.DECLINED, CareRequestStatus.TIMEOUT, CareRequestStatus.ESCALATED, CareRequestStatus.CANCELLED, CareRequestStatus.CLOSED},
    CareRequestStatus.ACCEPTED: {CareRequestStatus.IN_PROGRESS, CareRequestStatus.DECLINED, CareRequestStatus.TIMEOUT, CareRequestStatus.ESCALATED, CareRequestStatus.CANCELLED, CareRequestStatus.CLOSED},
    CareRequestStatus.DECLINED: {CareRequestStatus.PENDING_ASSIGNMENT, CareRequestStatus.ESCALATED, CareRequestStatus.CANCELLED, CareRequestStatus.CLOSED},
    CareRequestStatus.IN_PROGRESS: {CareRequestStatus.COMPLETED, CareRequestStatus.FAILED, CareRequestStatus.ESCALATED, CareRequestStatus.CANCELLED, CareRequestStatus.CLOSED},
    CareRequestStatus.COMPLETED: {CareRequestStatus.PARENT_CONFIRMED, CareRequestStatus.CLOSED},
    CareRequestStatus.PARENT_CONFIRMED: {CareRequestStatus.CLOSED},
    CareRequestStatus.CLOSED: set(), # Terminal state
    CareRequestStatus.CANCELLED: set(), # Terminal state
    CareRequestStatus.ESCALATED: {CareRequestStatus.PENDING_ASSIGNMENT, CareRequestStatus.ASSIGNED, CareRequestStatus.CANCELLED, CareRequestStatus.CLOSED},
    CareRequestStatus.FAILED: {CareRequestStatus.PENDING_ASSIGNMENT, CareRequestStatus.ESCALATED, CareRequestStatus.CANCELLED, CareRequestStatus.CLOSED},
    CareRequestStatus.TIMEOUT: {CareRequestStatus.PENDING_ASSIGNMENT, CareRequestStatus.ESCALATED, CareRequestStatus.CANCELLED, CareRequestStatus.CLOSED},
}

class CareRequestStateMachine:
    """
    CareSync Domain State Machine for Care Requests.
    Enforces strict transition validation and prevents illegal state mutations.
    """

    @staticmethod
    def validate_transition(current_status: str, target_status: str) -> None:
        try:
            curr_enum = CareRequestStatus(current_status)
            target_enum = CareRequestStatus(target_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status value. Current: '{current_status}', Target: '{target_status}'"
            )

        if target_enum not in VALID_TRANSITIONS.get(curr_enum, set()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Illegal CareRequest status transition from '{current_status}' to '{target_status}'."
            )
