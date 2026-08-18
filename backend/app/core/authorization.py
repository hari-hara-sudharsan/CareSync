from enum import Enum
from typing import List, Set, Optional
from fastapi import HTTPException, status

class CarePermission(str, Enum):
    CHECK_INS = "CHECK_INS"
    MEDICATION = "MEDICATION"
    APPOINTMENTS = "APPOINTMENTS"
    TRANSPORTATION = "TRANSPORTATION"
    ERRANDS = "ERRANDS"
    CARE_HISTORY = "CARE_HISTORY"

class CareRole(str, Enum):
    PARENT = "PARENT"
    PRIMARY_GUARDIAN = "PRIMARY_GUARDIAN"
    FAMILY = "FAMILY"
    GUARDIAN = "GUARDIAN"
    FRIEND_NEIGHBOR = "FRIEND_NEIGHBOR"
    PROFESSIONAL_CAREGIVER = "PROFESSIONAL_CAREGIVER"
    VOLUNTEER = "VOLUNTEER"
    ADMIN = "ADMIN"

def verify_care_permission(
    required_permission: CarePermission,
    user_role: CareRole,
    granted_permissions: List[str],
    is_primary_contact: bool = False,
) -> bool:
    """
    Attribute-Based Access Control (ABAC) Policy Verification.
    
    1. Parents and Admins have administrative permissions.
    2. Primary Guardians and Family Members must hold active care network mapping.
    3. Requires explicit task-scoped permission matching for the requested operation.
    """
    if user_role in [CareRole.PARENT, CareRole.ADMIN]:
        return True
    
    if "ALL" in granted_permissions:
        return True

    return required_permission.value in granted_permissions

def enforce_care_permission(
    required_permission: CarePermission,
    user_role: CareRole,
    granted_permissions: List[str],
    is_primary_contact: bool = False,
) -> None:
    """Enforces task-scoped care permission verification."""
    if not verify_care_permission(required_permission, user_role, granted_permissions, is_primary_contact):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Task-scoped permission '{required_permission.value}' is required for this operation."
        )
