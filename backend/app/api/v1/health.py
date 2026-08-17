from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()

@router.get("/health", summary="Basic Liveness Check")
async def health_check():
    return {
        "status": "healthy",
        "service": "CareSync Backend API",
        "version": "1.0.0",
    }

@router.get("/ready", summary="Readiness Check with DB Connection")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected",
            "service": "CareSync Backend API",
        }
    except Exception as e:
        return {
            "status": "not_ready",
            "database": f"error: {str(e)}",
        }
