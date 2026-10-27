from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.decision import AuditEvent
from app.agent.quiet_loop import QuietCoordinationLoop
from app.agent.schema import AgentDecisionOutput
from app.services.care_request_service import CareRequestService
from app.services.matching_engine.candidate_directory import CandidateDirectory

router = APIRouter()

@router.get("/status", summary="Get CareSync Agent Status")
async def get_agent_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(AuditEvent)
        .where(AuditEvent.actor_id == "agent-strands-01")
        .order_by(desc(AuditEvent.created_at))
        .limit(10)
    )
    audit_logs = res.scalars().all()

    return {
        "agent_name": "CareSync Quiet Coordination Agent",
        "sdk_framework": "Strands Agents SDK (Local Orchestration)",
        "status": "ACTIVE_QUIET_MONITORING",
        "recent_agent_observations": [
            {
                "action": log.action,
                "resource": log.resource_type,
                "timestamp": str(log.created_at),
                "details": log.details,
            }
            for log in audit_logs
        ],
    }

@router.post("/coordinate", response_model=AgentDecisionOutput, summary="Trigger Agent Quiet Coordination Loop Cycle")
async def run_agent_coordination_cycle(
    parent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await CareRequestService.verify_parent_access(db, current_user.id, parent_id)

    candidate_pool = await CandidateDirectory.get_candidate_pool(db, parent_id)

    result = await QuietCoordinationLoop.run_cycle(db, parent_id, candidate_pool)
    return result
