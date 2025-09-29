"""
System Router
Handles system health and monitoring endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.schemas import UserResponse
from app.services.auth_service import AuthService
from app.services.system_service import SystemService

router = APIRouter()


@router.get("/health")
def health_check():
    """Health check with database connectivity"""
    try:
        system_service = SystemService()
        result = system_service.health_check()
        return result
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@router.get("/")
def root():
    """API root endpoint"""
    return {"message": "Fin Doc Scanner API is running"}
