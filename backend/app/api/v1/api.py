"""
API v1 Router
Combines all API endpoints
"""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, documents, analyses, stats, system

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(analyses.router, prefix="/analyses", tags=["analyses"])
api_router.include_router(analyses.router, prefix="/analysis", tags=["analysis-legacy"])  # Legacy endpoints
api_router.include_router(stats.router, prefix="/stats", tags=["statistics"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
