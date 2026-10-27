import logging
import json
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional, List, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.authorization import CarePermission, CareRole, verify_care_permission
from app.models.user import User
from app.models.parent import ParentProfile
from app.models.care_network import CareMember
from app.trust.verification import VerificationService

logger = logging.getLogger("caresync.security")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/verify-otp", auto_error=False)

def log_security_denial(
    actor_id: str,
    actor_role: str,
    target_resource: str,
    resource_id: str,
    action: str,
    reason: str,
) -> None:
    """Emits structured security application log for authorization denials without leaking sensitive PII."""
    payload = {
        "event": "security_authorization_denied",
        "actor_id": actor_id,
        "actor_role": actor_role,
        "target_resource": target_resource,
        "resource_id": resource_id,
        "action": action,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    logger.warning(json.dumps(payload))

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> User:
    """
    Resolves authenticated user from JWT Bearer Token.
    Fails with HTTP 401 Unauthorized if token is missing, invalid, or user is inactive.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate authentication credentials. Bearer token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate authentication credentials. Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_roles(allowed_roles: List[str]) -> Callable:
    """
    Role-Based Access Control (RBAC) Security Boundary.
    Enforces that current_user.role is contained within allowed_roles or is ADMIN.
    Rejects unauthorized access attempts with HTTP 403 Forbidden.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == "ADMIN" or current_user.role in allowed_roles:
            return current_user
        log_security_denial(
            actor_id=current_user.id,
            actor_role=current_user.role,
            target_resource="ROLE_ENDPOINT",
            resource_id=",".join(allowed_roles),
            action="EXECUTE",
            reason=f"Role '{current_user.role}' not in allowed roles {allowed_roles}",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Role '{current_user.role}' is not authorized to access this resource."
        )
    return role_checker

# Strict role dependency guards
require_parent_role = require_roles(["PARENT", "ADMIN"])
require_family_role = require_roles(["FAMILY", "ADMIN"])
require_volunteer_role = require_roles(["VOLUNTEER", "ADMIN"])
require_coordinator_role = require_roles(["COORDINATOR", "ADMIN"])
require_admin_role = require_roles(["ADMIN"])

async def require_verified_volunteer(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_volunteer_role),
) -> User:
    """
    Volunteer task access requires an administrator-approved VerificationRecord.
    Selecting the Volunteer role at signup only creates a PENDING application.
    """
    if current_user.role == "ADMIN":
        return current_user
    if await VerificationService.is_candidate_eligible(db, current_user.id, "VOLUNTEER"):
        return current_user
    log_security_denial(
        actor_id=current_user.id,
        actor_role=current_user.role,
        target_resource="VOLUNTEER_TASKS",
        resource_id=current_user.id,
        action="ACCESS",
        reason="Volunteer verification is not approved",
    )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access Denied: Your volunteer verification has not been approved yet.",
    )

async def verify_parent_authorization(
    parent_id: str,
    required_permission: Optional[CarePermission] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CareMember:
    """
    Authoritative Attribute-Based Access Control (ABAC) Security Boundary:
    Evaluates: Authenticated User -> CareMember Relationship -> Active Parent Context -> CarePermission.
    Strictly queries database records with ZERO hardcoded identity bypasses.
    Denies unauthorized cross-parent or unlinked caregiver access with HTTP 403 Forbidden.
    """
    # 1. Global Platform Administration Governance (Audit Context)
    if current_user.role == "ADMIN":
        return CareMember(
            parent_id=parent_id,
            user_id=current_user.id,
            name=current_user.full_name,
            phone=current_user.phone,
            relationship="Admin",
            role="ADMIN",
            status="ACTIVE",
            permissions=["ALL"],
        )

    # 2. Direct Parent Self-Access (Database-backed relationship check)
    if current_user.role == "PARENT":
        res_profile = await db.execute(
            select(ParentProfile).where(
                ParentProfile.user_id == current_user.id,
                ParentProfile.id == parent_id,
            )
        )
        profile = res_profile.scalars().first()
        if profile:
            return CareMember(
                parent_id=profile.id,
                user_id=current_user.id,
                name=profile.full_name,
                phone=current_user.phone,
                relationship="Self",
                role="PARENT",
                status="ACTIVE",
                permissions=["ALL"],
            )
        log_security_denial(
            actor_id=current_user.id,
            actor_role="PARENT",
            target_resource="PARENT_CONTEXT",
            resource_id=parent_id,
            action="READ_WRITE",
            reason="Unlinked parent profile access attempt",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: You are not authorized to access Parent '{parent_id}'."
        )

    # 3. Family / Guardian Care Network Relationship (Database-backed check)
    result = await db.execute(
        select(CareMember).where(
            CareMember.parent_id == parent_id,
            CareMember.user_id == current_user.id,
            CareMember.status == "ACTIVE",
        )
    )
    member = result.scalars().first()

    if not member:
        log_security_denial(
            actor_id=current_user.id,
            actor_role=current_user.role,
            target_resource="CARE_CIRCLE",
            resource_id=parent_id,
            action="ACCESS",
            reason="No active CareMember record found for user in target parent circle",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: You are not an active member of Parent '{parent_id}' Care Circle."
        )

    # 4. Task-Scoped Permission Enforcement
    if required_permission:
        granted_permissions = member.permissions or []
        is_authorized = (
            required_permission.value in granted_permissions
            or "ALL" in granted_permissions
            or member.relationship == "PRIMARY_GUARDIAN"
            or member.role in ["PRIMARY_GUARDIAN", "ADMIN"]
        )
        if not is_authorized:
            log_security_denial(
                actor_id=current_user.id,
                actor_role=current_user.role,
                target_resource="CARE_PERMISSION",
                resource_id=parent_id,
                action=required_permission.value,
                reason=f"Missing required permission '{required_permission.value}'",
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Missing required permission '{required_permission.value}' for Parent '{parent_id}'."
            )

    return member
