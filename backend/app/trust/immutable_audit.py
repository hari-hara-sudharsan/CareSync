from fastapi import HTTPException, status

class ImmutableAuditGuard:
    """
    Append-Only Audit & Trust Log Immutability Guard.
    
    Prevents updates or deletions of AuditEvent and TrustEvent records.
    Enforces strict append-only immutability.
    """

    @staticmethod
    def enforce_immutability(operation_type: str, resource_name: str) -> None:
        if operation_type in ["UPDATE", "DELETE", "PUT", "PATCH"]:
            raise HTTPException(
                status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
                detail=f"Security Policy Violation: '{resource_name}' is an append-only immutable audit log. {operation_type} operations are strictly forbidden."
            )
