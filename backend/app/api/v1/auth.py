from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import generate_otp, create_access_token
from app.schemas.user import OTPRequest, OTPVerify, Token
from app.models.user import User

router = APIRouter()

@router.post("/request-otp", summary="Request OTP Verification Code")
async def request_otp(req: OTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Generates and registers OTP for phone authentication.
    In development mode, returns OTP 123456 directly for testing.
    """
    otp = "123456" # Fixed dev OTP for testing without external SMS gateway
    
    result = await db.execute(select(User).where(User.phone == req.phone))
    user = result.scalars().first()
    if not user:
        user = User(
            phone=req.phone,
            full_name="New CareSync User",
            role="FAMILY",
            is_active=True,
        )
        db.add(user)
        await db.commit()

    return {
        "success": True,
        "message": f"Verification code sent to {req.phone}",
        "dev_otp": otp,
    }

@router.post("/verify-otp", response_model=Token, summary="Verify OTP and Return JWT Access Token")
async def verify_otp(req: OTPVerify, db: AsyncSession = Depends(get_db)):
    if req.otp_code != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code."
        )

    result = await db.execute(select(User).where(User.phone == req.phone))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not registered."
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
