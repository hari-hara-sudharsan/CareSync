from typing import Optional, List
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.decision_service import DecisionService
from pydantic import BaseModel

router = APIRouter()

class DecisionResolveSchema(BaseModel):
    action_key: str
    reason: Optional[str] = None

@router.get("", summary="Get Pending Decision Cards for Active Parent")
async def get_decisions(
    parent_id: str = "p-1",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DecisionService.get_pending_decisions(db, current_user, parent_id)

@router.post("/{card_id}/resolve", summary="Resolve Decision Card (Atomic Transaction)")
async def resolve_decision(
    card_id: str,
    payload: DecisionResolveSchema,
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await DecisionService.resolve_decision(
        db=db,
        current_user=current_user,
        card_id=card_id,
        action_key=payload.action_key,
        reason=payload.reason,
        idempotency_key=x_idempotency_key,
    )
