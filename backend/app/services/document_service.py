"""
Document Service
Handles document operations and management
"""

import logging
import os
from typing import List, Optional
from pathlib import Path
from fastapi import HTTPException

from app.models.schemas import DocumentResponse, UserResponse
from app.repositories.document_repository import DocumentRepository

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for document operations"""
    
    def __init__(self):
        self.document_repository = DocumentRepository()
    
    def create_document(
        self,
        user_id: str,
        file_path: str,
        file_name: str,
        file_size_mb: float,
        file_format: str,
        category: Optional[str] = None,
        tags: List[str] = None
    ) -> DocumentResponse:
        """Create a new document record"""
        try:
            return self.document_repository.create_document(
                user_id=user_id,
                file_path=file_path,
                file_name=file_name,
                file_size_mb=file_size_mb,
                file_format=file_format,
                category=category,
                tags=tags or []
            )
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            raise
    
    def get_user_documents(self, user_id: str, skip: int = 0, limit: int = 50) -> List[DocumentResponse]:
        """Get documents for a specific user"""
        try:
            return self.document_repository.get_user_documents(user_id, skip, limit)
        except Exception as e:
            logger.error(f"Error getting user documents: {e}")
            return []
    
    def get_document_by_id(self, document_id: str) -> Optional[DocumentResponse]:
        """Get a document by its ID"""
        try:
            return self.document_repository.get_document_by_id(document_id)
        except Exception as e:
            logger.error(f"Error getting document by ID: {e}")
            return None
    
    def delete_document(self, document_id: str, current_user: UserResponse) -> dict:
        """Delete a document and its associated analyses"""
        try:
            # Get the document to check ownership
            document = self.get_document_by_id(document_id)
            if not document:
                raise HTTPException(
                    status_code=404,
                    detail="Document not found"
                )
            
            # Check if user has permission to delete this document
            if current_user.role != "Admin" and str(document.user_id) != current_user.id:
                raise HTTPException(
                    status_code=403,
                    detail="Not enough permissions to delete this document"
                )
            
            # Delete associated analyses first
            deleted_analyses_count = self.document_repository.delete_analyses_by_document_id(document_id)
            
            # Delete the document
            success = self.document_repository.delete_document(document_id)
            
            if not success:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to delete document"
                )
            
            # Try to delete the physical file
            file_deleted = False
            try:
                if os.path.exists(document.file_path):
                    os.remove(document.file_path)
                    file_deleted = True
                    logger.info(f"Physical file deleted: {document.file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete physical file {document.file_path}: {e}")
            
            return {
                "status": "success",
                "message": "Document deleted successfully",
                "document_id": document_id,
                "deleted_analyses_count": deleted_analyses_count,
                "file_deleted": file_deleted,
                "file_path": document.file_path
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error deleting document: {str(e)}"
            )
    
    def update_document_status(self, document_id: str, status: str, progress: int = None, processing_duration: int = None) -> bool:
        """Update document processing status"""
        try:
            return self.document_repository.update_document_status(document_id, status, progress, processing_duration)
        except Exception as e:
            logger.error(f"Error updating document status: {e}")
            return False
