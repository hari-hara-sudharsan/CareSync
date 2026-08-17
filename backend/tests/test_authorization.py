import pytest
from fastapi import HTTPException
from app.core.authorization import (
    verify_care_permission,
    enforce_care_permission,
    CarePermission,
    CareRole,
)

def test_parent_has_full_permission():
    assert verify_care_permission(CarePermission.MEDICATION, CareRole.PARENT, []) is True
    assert verify_care_permission(CarePermission.TRANSPORTATION, CareRole.PARENT, []) is True

def test_primary_contact_has_full_permission():
    assert verify_care_permission(CarePermission.APPOINTMENTS, CareRole.FAMILY, [], is_primary_contact=True) is True

def test_task_scoped_permissions():
    granted = ["TRANSPORTATION", "ERRANDS"]
    
    # Authorized
    assert verify_care_permission(CarePermission.TRANSPORTATION, CareRole.VOLUNTEER, granted) is True
    assert verify_care_permission(CarePermission.ERRANDS, CareRole.FRIEND_NEIGHBOR, granted) is True
    
    # Unauthorized
    assert verify_care_permission(CarePermission.MEDICATION, CareRole.VOLUNTEER, granted) is False
    assert verify_care_permission(CarePermission.CARE_HISTORY, CareRole.FRIEND_NEIGHBOR, granted) is False

def test_enforce_permission_raises_forbidden():
    granted = ["CHECK_INS"]
    with pytest.raises(HTTPException) as exc_info:
        enforce_care_permission(CarePermission.MEDICATION, CareRole.FAMILY, granted)
    
    assert exc_info.value.status_code == 403
    assert "Task-scoped permission 'MEDICATION' is required" in exc_info.value.detail
