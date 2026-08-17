from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/verify-otp", auto_error=False)

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> User:
    """
    Dependency that resolves current authenticated user from JWT token.
    Falls back to default demo user if unauthenticated during initial phase testing.
    """
    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user_id = payload["sub"]
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalars().first()
            if user:
                return user
    
    # Demo User Fallback for testing contracts
    result = await db.execute(select(User).where(User.phone == "+15552345678"))
    demo_user = result.scalars().first()
    if not demo_user:
        demo_user = User(
            id="usr-demo-1",
            phone="+15552345678",
            full_name="David Woodson",
            email="david.woodson@example.com",
            role="PRIMARY_GUARDIAN",
            is_active=True,
            is_verified=True,
        )
        db.add(demo_user)
        await db.commit()
        await db.refresh(demo_user)
    return demo_user
