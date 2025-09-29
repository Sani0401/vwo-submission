"""
Documents Router
Handles document management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.schemas import DocumentResponse, UserResponse, AnalysisResultResponse
from app.services.auth_service import AuthService
from app.services.document_service import DocumentService
from app.services.user import UserService

router = APIRouter()


@router.get("/{user_id}/documents", response_model=List[DocumentResponse])
def get_user_documents(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Get documents for a specific user"""
    try:
        if current_user.role != "Admin" and current_user.id != user_id:
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


@router.get("/{document_id}/analyses", response_model=List[AnalysisResultResponse])
def get_document_analyses(
    document_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Get analyses for a specific document"""
    try:
        user_service = UserService()
        analyses = user_service.get_analyses_by_document_id(document_id, skip, limit)
        return analyses
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving document analyses: {str(e)}"
        )


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Delete a document and its associated analyses"""
    try:
        document_service = DocumentService()
        result = document_service.delete_document(document_id, current_user)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting document: {str(e)}"
        )
