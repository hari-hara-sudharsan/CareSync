from fastapi import APIRouter
from app.api.v1 import health, auth, parent, family, care_requests, checkins, medications, appointments, agent

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health Checks"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(parent.router, prefix="/parents", tags=["Parent Experience"])
api_router.include_router(family.router, prefix="/family", tags=["Family Workspace"])
api_router.include_router(care_requests.router, prefix="/care-requests", tags=["Care Requests"])
api_router.include_router(checkins.router, prefix="/check-ins", tags=["Check-Ins"])
api_router.include_router(medications.router, prefix="/medications", tags=["Medications"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments & Transportation"])
api_router.include_router(agent.router, prefix="/agent", tags=["Quiet Agent Coordination"])
