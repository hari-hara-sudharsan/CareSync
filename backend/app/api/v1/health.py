from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

from app.core.database import get_db
from app.core.redis import check_redis_health
from app.core.metrics import metrics_registry

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health/live", summary="Liveness Probe", status_code=status.HTTP_200_OK)
async def liveness_probe():
    """Liveness probe: verifies the process is running."""
    return {
        "status": "ALIVE",
        "service": "CareSync Backend API",
        "version": "1.0.0",
    }

@router.get("/health/ready", summary="Readiness Probe with Dependency Health")
async def readiness_probe(response: Response, db: AsyncSession = Depends(get_db)):
    """
    Readiness probe: checks PostgreSQL and Redis health.
    If Redis is down, returns READY_DEGRADED with 200 OK because Redis is replaceable infrastructure.
    If PostgreSQL is down, returns NOT_READY with 503 Service Unavailable.
    """
    postgres_connected = False
    try:
        res = await db.execute(text("SELECT 1"))
        if res.scalar() == 1:
            postgres_connected = True
    except Exception as exc:
        logger.error(f"PostgreSQL Readiness Check Failed: {exc}")

    if not postgres_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "database": "error",
            "postgres": "DOWN",
            "redis": "UNKNOWN",
            "detail": "PostgreSQL database primary source of truth unavailable",
        }

    redis_connected = await check_redis_health()

    if redis_connected:
        return {
            "status": "ready",
            "database": "connected",
            "postgres": "CONNECTED",
            "redis": "CONNECTED",
            "service": "CareSync Backend API",
        }
    else:
        # Graceful degradation: Redis is down, but core domain state remains fully operational!
        metrics_registry.increment_counter("redis_connection_failures")
        return {
            "status": "READY_DEGRADED",
            "database": "connected",
            "postgres": "CONNECTED",
            "redis": "OFFLINE",
            "service": "CareSync Backend API",
            "degraded_reason": "Redis transport offline. Outbox events remain durably stored in PostgreSQL for background dispatch.",
        }

@router.get("/health/metrics", summary="Operational Metrics Snapshot")
async def operational_metrics():
    """Returns in-memory operational metrics snapshot (outbox events, agent actions, redis failures)."""
    return {
        "service": "CareSync Backend API",
        "metrics": metrics_registry.get_metrics_snapshot(),
    }

# Legacy routes backward compatibility
@router.get("/health", include_in_schema=False)
async def legacy_health():
    return {"status": "healthy", "service": "CareSync Backend API"}

@router.get("/ready", include_in_schema=False)
async def legacy_ready(response: Response, db: AsyncSession = Depends(get_db)):
    return await readiness_probe(response=response, db=db)
