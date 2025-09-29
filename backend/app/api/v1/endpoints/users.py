"""
Users Router
Handles user management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.schemas import UserResponse, UserUpdate, UserRole, DocumentResponse, AnalysisResultResponse
from app.services.auth_service import AuthService
from app.services.user import UserService

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: UserResponse = Depends(AuthService.get_current_admin_user)
):
    """Get all users (Admin only)"""
    try:
        auth_service = AuthService()
        users = auth_service.get_all_users(skip, limit)
        return users
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving users: {str(e)}"
        )


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: str,
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Get user by ID (Admin can access any user, users can access their own)"""
    try:
        if current_user.role != UserRole.ADMIN and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        auth_service = AuthService()
        user = auth_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user: {str(e)}"
        )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Update user information"""
    try:
        if current_user.role != UserRole.ADMIN and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        # Convert update data to dict, excluding None values
        update_data = {k: v for k, v in user_update.dict().items() if v is not None}
        
        auth_service = AuthService()
        user = auth_service.update_user(user_id, update_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )


@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    current_user: UserResponse = Depends(AuthService.get_current_admin_user)
):
    """Delete user (Admin only)"""
    try:
        auth_service = AuthService()
        success = auth_service.delete_user(user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "status": "success",
            "message": f"User {user_id} deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )


@router.get("/{user_id}/documents", response_model=List[DocumentResponse])
def get_user_documents(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Get documents for a specific user"""
    try:
        if current_user.role != UserRole.ADMIN and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        user_service = UserService()
        documents = user_service.get_user_documents(user_id, skip, limit)
        return documents
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user documents: {str(e)}"
        )


@router.get("/{user_id}/analyses", response_model=List[AnalysisResultResponse])
def get_user_analyses(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Get analyses for a specific user"""
    try:
        if current_user.role != UserRole.ADMIN and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        user_service = UserService()
        analyses = user_service.get_user_analyses(user_id, skip, limit)
        return analyses
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user analyses: {str(e)}"
        )
