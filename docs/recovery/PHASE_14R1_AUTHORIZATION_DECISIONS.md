# CareSync — Phase 14R.1: Authorization Decisions & Policy Matrix

This document defines the formal Attribute-Based Access Control (ABAC) decisions, policy evaluation algorithms, and security boundaries implemented in Phase 14R.1.

---

## 1. Core Authorization Principles

1. **Role $\neq$ Relationship $\neq$ Resource Ownership $\neq$ Task Scope**:
   * **Role** (`User.role`): Global persona identity (`PARENT`, `FAMILY`, `VOLUNTEER`, `COORDINATOR`, `ADMIN`).
   * **Relationship** (`CareMember.relationship`): Parent-specific bond (e.g., `Mother`, `Son`, `PRIMARY_GUARDIAN`, `Neighbor`).
   * **Resource Ownership**: Direct ownership of a parent care domain (`ParentProfile.user_id == current_user.id`).
   * **Task Scope**: Ephemeral access granted to an assigned volunteer for a specific `CareRequest` during task execution.
2. **Backend is the Authoritative Security Boundary**:
   * The client never dictates role, permissions, or access.
   * Session identity is validated exclusively via cryptographically signed JWT bearer tokens resolved against active PostgreSQL/SQLite records.
3. **No Role Impersonation / Persona Bypassing**:
   * Admins inspect via dedicated `/api/v1/trust/*` and `/api/v1/admin/*` endpoints, never by impersonating parent, family, or volunteer views.
   * Workspaces are 1:1 bound to authoritative roles.
4. **Volunteer Least-Privilege Data Minimization**:
   * "Volunteer gets task, not medical history."
   * Access to a `CareRequest` is granted to a volunteer **only** when `req.assigned_to_id == current_user.id`.

---

## 2. Explicit ABAC Policy Decision Matrix

| Actor Role | Target Resource | Action | Authorization Condition | Outcome | Failure Code |
|---|---|---|---|:---:|:---:|
| `PARENT` | `ParentProfile` (Self) | `READ` / `UPDATE` | `ParentProfile.user_id == actor.id` | **ALLOW** | 403 |
| `PARENT` | `ParentProfile` (Other) | `READ` / `UPDATE` | `ParentProfile.user_id != actor.id` | **DENY** | 403 |
| `PARENT` | `CareRequest` (Own) | `CREATE` / `READ` / `CONFIRM` | `CareRequest.parent_id == actor_parent.id` | **ALLOW** | 403 |
| `PARENT` | `CareRequest` (Other) | `READ` / `UPDATE` | `CareRequest.parent_id != actor_parent.id` | **DENY** | 403 |
| `PARENT` | Medical / Appointment (Own) | `READ` / `UPDATE` | `Resource.parent_id == actor_parent.id` | **ALLOW** | 403 |
| `PARENT` | Volunteer / Admin Endpoint | `EXECUTE` | Role is not `VOLUNTEER` or `ADMIN` | **DENY** | 403 |
| `FAMILY` | `ParentProfile` (Connected) | `READ` | Active `CareMember(parent_id, user_id)` exists | **ALLOW** | 403 |
| `FAMILY` | `ParentProfile` (Unconnected) | `READ` | No active `CareMember` record | **DENY** | 403 |
| `FAMILY` | `CareRequest` (Connected) | `CREATE` / `READ` | Active `CareMember` exists | **ALLOW** | 403 |
| `FAMILY` | Task Execution (`/accept`, `/start`) | `EXECUTE` | Role is not assigned `VOLUNTEER` | **DENY** | 403 |
| `VOLUNTEER` | `CareRequest` (Assigned to self) | `READ` / `ACCEPT` / `START` / `COMPLETE` | `CareRequest.assigned_to_id == actor.id` (Sanitized Task Scope) | **ALLOW** | 403 |
| `VOLUNTEER` | `CareRequest` (Assigned to other) | `READ` / `EXECUTE` | `CareRequest.assigned_to_id != actor.id` | **DENY** | 403 |
| `VOLUNTEER` | Medical / Prescription Record | `READ` / `UPDATE` | Strict clinical privacy barrier | **DENY** | 403 |
| `VOLUNTEER` | Admin / Coordinator Endpoint | `EXECUTE` | Role is not `ADMIN` or `COORDINATOR` | **DENY** | 403 |
| `COORDINATOR` | `CareRequest` (Unassigned) | `READ` / `MATCH` / `ASSIGN` | Coordinator operational authority | **ALLOW** | 403 |
| `COORDINATOR` | `DecisionCard` | `RESOLVE` / `APPROVE` | Consequential human approval authority | **ALLOW** | 403 |
| `COORDINATOR` | Admin-Only Governance | `EXECUTE` | Requires global `ADMIN` role | **DENY** | 403 |
| `ADMIN` | Trust & Safety Dashboard | `READ` | Global `ADMIN` role | **ALLOW** | 403 |
| `ADMIN` | User Verification / Sanctions | `UPDATE` | Global `ADMIN` role | **ALLOW** | 403 |
| `ADMIN` | Audit Trail Explorer | `READ` | Global `ADMIN` role (Immutable) | **ALLOW** | 403 |
| `ANY` | Any Protected Endpoint | `ANY` | Missing or invalid Bearer JWT | **DENY** | 401 |

---

## 3. Server-Side ABAC Implementation Algorithm

```python
async def verify_parent_authorization(
    parent_id: str,
    required_permission: Optional[CarePermission] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CareMember:
    # 1. Platform Governance Authority
    if current_user.role == "ADMIN":
        return CareMember(...) # Explicit admin audit context

    # 2. Direct Parent Self-Access (Database-backed)
    if current_user.role == "PARENT":
        profile = await db.scalar(
            select(ParentProfile).where(
                ParentProfile.user_id == current_user.id,
                ParentProfile.id == parent_id
            )
        )
        if profile:
            return CareMember(parent_id=parent_id, user_id=current_user.id, ...)
        log_security_denial(current_user, "PARENT_PROFILE", parent_id, "CROSS_PARENT_ATTEMPT")
        raise HTTPException(status_code=403, detail="Access Denied: Unlinked Parent profile.")

    # 3. Family / Guardian Care Circle Membership (Database-backed)
    member = await db.scalar(
        select(CareMember).where(
            CareMember.parent_id == parent_id,
            CareMember.user_id == current_user.id,
            CareMember.status == "ACTIVE"
        )
    )
    if not member:
        log_security_denial(current_user, "CARE_CIRCLE", parent_id, "NOT_ACTIVE_MEMBER")
        raise HTTPException(status_code=403, detail="Access Denied: You are not an active member of this Care Circle.")

    # 4. Task-Scoped Permission Check
    if required_permission:
        granted = member.permissions or []
        if required_permission.value not in granted and "ALL" not in granted:
            log_security_denial(current_user, "CARE_PERMISSION", required_permission.value, "MISSING_PERMISSION")
            raise HTTPException(status_code=403, detail=f"Access Denied: Missing permission '{required_permission.value}'.")

    return member
```

---

## 4. Structured Security Application Logging

When an authorization check fails, the backend issues structured security logs without leaking PII:

```json
{
  "event": "security_authorization_denied",
  "actor_id": "usr-anon-1",
  "actor_role": "FAMILY",
  "target_resource": "CARE_REQUEST",
  "resource_id": "req-999",
  "action": "READ",
  "denial_reason": "NO_CARE_MEMBER_RELATIONSHIP",
  "timestamp": "2026-08-29T10:10:00Z"
}
```
*(Zero logging of passwords, full phone numbers, OTP challenges, or patient clinical notes).*
