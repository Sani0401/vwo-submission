"""
Statistics Router
Handles statistics endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.schemas import UserStats, DocumentStats, AnalysisStats, UserResponse
from app.services.auth_service import AuthService
from app.services.stats_service import StatsService

router = APIRouter()


@router.get("/users", response_model=UserStats)
def get_user_stats(current_user: UserResponse = Depends(AuthService.get_current_admin_user)):
    """Get user statistics (Admin only)"""
    try:
        stats_service = StatsService()
        stats = stats_service.get_user_stats()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user stats: {str(e)}"
        )


@router.get("/documents", response_model=DocumentStats)
def get_document_stats(current_user: UserResponse = Depends(AuthService.get_current_admin_user)):
    """Get document statistics (Admin only)"""
    try:
        stats_service = StatsService()
        stats = stats_service.get_document_stats()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving document stats: {str(e)}"
        )


@router.get("/analyses", response_model=AnalysisStats)
def get_analysis_stats(current_user: UserResponse = Depends(AuthService.get_current_admin_user)):
    """Get analysis statistics (Admin only)"""
    try:
        stats_service = StatsService()
        stats = stats_service.get_analysis_stats()
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving analysis stats: {str(e)}"
        )


@router.get("/user/{user_id}")
def get_user_specific_stats(
    user_id: str,
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Get user-specific statistics for dashboard"""
    try:
        # Check if user has permission to view these stats
        if current_user.role != "Admin" and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        stats_service = StatsService()
        user_stats = stats_service.get_user_specific_stats(user_id)
        return user_stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user stats: {str(e)}"
        )
