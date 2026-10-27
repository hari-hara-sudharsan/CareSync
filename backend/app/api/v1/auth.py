from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import create_access_token
from app.core.config import settings
from app.api.deps import get_current_user
from app.schemas.user import OTPRequest, OTPVerify, Token, UserRead
from app.models.user import User
from app.models.decision import AuditEvent
from app.trust.models import VerificationRecord
from app.services.otp_service import otp_service

router = APIRouter()

async def _register_user(db: AsyncSession, phone: str, role: str) -> User:
    """
    Public signup policy: PARENT and FAMILY accounts are created directly (family members gain
    parent access only through Care Circle invitations); VOLUNTEER accounts start PENDING
    verification and receive no task access until an administrator approves them.
    """
    user = User(
        phone=phone,
        full_name="New CareSync User",
        role=role,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    if role == "VOLUNTEER":
        db.add(VerificationRecord(user_id=user.id, status="PENDING"))

    db.add(AuditEvent(
        actor_id=user.id,
        actor_name=user.full_name,
        action="USER_REGISTERED",
        resource_type="User",
        resource_id=user.id,
        details={"role": role},
    ))
    return user

@router.post("/request-otp", summary="Request OTP Verification Code")
async def request_otp(req: OTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Generates and registers a secure 6-digit OTP for phone authentication.
    Enforces resend cooldowns and rate limits.
    """
    success, message, error_code = await otp_service.request_otp(req.phone)
    if not success:
        if error_code == "RESEND_COOLDOWN":
            status_code = status.HTTP_429_TOO_MANY_REQUESTS
        elif error_code == "SMS_DELIVERY_FAILED":
            status_code = status.HTTP_502_BAD_GATEWAY
        else:
            status_code = status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=message)

    # Accounts are created only after the phone number is proven in /verify-otp.
    return {
        "success": True,
        "message": message,
    }

@router.post("/verify-otp", response_model=Token, summary="Verify OTP and Return JWT Access Token")
async def verify_otp(req: OTPVerify, db: AsyncSession = Depends(get_db)):
    """
    Verifies 6-digit OTP code against active challenge and returns JWT token.
    """
    success, message, error_code = await otp_service.verify_otp(req.phone, req.otp_code)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    result = await db.execute(select(User).where(User.phone == req.phone))
    user = result.scalars().first()
    if not user:
        user = await _register_user(db, req.phone, req.requested_role or "FAMILY")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive."
        )

    user.is_verified = True
    await db.commit()

    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        role=user.role,
    )

@router.get("/me", response_model=UserRead, summary="Get Current Authenticated User Identity")
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the authoritative identity and role of the currently authenticated user.
    """
    return current_user

# Headers added by reverse proxies and tunnels (cloudflared, ngrok, load balancers).
_PROXY_HEADERS = ("x-forwarded-for", "x-real-ip", "forwarded", "cf-connecting-ip", "x-forwarded-host")

@router.get("/dev-otp-sink", summary="Development/Testing OTP Sink (Non-Production Only)")
async def get_dev_otp_sink(phone: str, request: Request):
    """
    Development/Testing sink endpoint to inspect generated OTPs during testing.
    Disabled in production.
    """
    # Only callable directly on the developer's machine: never through a tunnel or proxy, so a
    # temporarily exposed local backend cannot leak sign-in codes.
    proxied = any(h in request.headers for h in _PROXY_HEADERS)
    if not settings.is_local_environment or proxied:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Endpoint not found.")
    
    otp = await otp_service.get_dev_otp(phone)
    if not otp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active dev OTP found for phone.")
    
    return {"phone": phone, "dev_otp": otp}
