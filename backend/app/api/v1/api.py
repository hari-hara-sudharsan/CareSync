from fastapi import APIRouter
from app.api.v1 import health, auth, parent, family, care_requests

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health Checks"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(parent.router, prefix="/parents", tags=["Parent Experience"])
api_router.include_router(family.router, prefix="/family", tags=["Family Workspace"])
api_router.include_router(care_requests.router, prefix="/care-requests", tags=["Care Requests"])
