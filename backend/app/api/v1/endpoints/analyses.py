"""
Analyses Router
Handles analysis endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, Request
from typing import List
import uuid
import time
import logging
from pathlib import Path
import os

from app.models.schemas import AnalysisResultResponse, UserResponse
from app.services.auth_service import AuthService
from app.services.analysis_service import AnalysisService
from app.services.document_service import DocumentService
from app.services.user import UserService

router = APIRouter()


@router.post("/analyze")
def analyze_document(
    file: UploadFile = File(...),
    query: str = Form(default="Analyze this financial document for investment insights"),
    current_user: UserResponse = Depends(AuthService.get_current_user),
    request: Request = None
):
    """Analyze financial document and provide comprehensive investment recommendations"""
    logger = logging.getLogger(__name__)
    
    try:
        # Validate and save uploaded file
        file_path = _save_uploaded_file(file)
        
        # Create document record in database
        document = _create_document_record(file, file_path, current_user.id)
        
        # Process analysis using existing task and agent
        analysis_result = _process_analysis(document.id, current_user.id, file_path, query)
        
        return analysis_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing document analysis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}"
        )


def _save_uploaded_file(file: UploadFile) -> str:
    """Save uploaded file to data directory with unique filename"""
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Create safe filename with timestamp
    original_filename = file.filename
    timestamp = int(time.time())
    name, ext = os.path.splitext(original_filename)
    safe_filename = f"{name}_{timestamp}{ext}"
    
    # Determine save path - go up to backend root and create data folder there
    data_dir = Path(__file__).resolve().parent.parent.parent.parent.parent / "data"
    print(f"DEBUG: Current file: {__file__}")
    print(f"DEBUG: Resolved file path: {Path(__file__).resolve()}")
    print(f"DEBUG: Data directory: {data_dir}")
    data_dir.mkdir(exist_ok=True)
    file_path = data_dir / safe_filename
    print(f"DEBUG: Final file path: {file_path}")
    
    # Save file
    try:
        with open(file_path, "wb") as f:
            content = file.file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Validate saved file
    if file_path.stat().st_size == 0:
        file_path.unlink()  # Remove empty file
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    
    return str(file_path)


def _create_document_record(file: UploadFile, file_path: str, user_id: str):
    """Create document record in database"""
    try:
        document_service = DocumentService()
        file_size_mb = Path(file_path).stat().st_size / (1024 * 1024)
        file_extension = Path(file.filename).suffix[1:] if file.filename else 'pdf'
        
        document = document_service.create_document(
            user_id=user_id,
            file_path=file_path,
            file_name=file.filename,
            file_size_mb=file_size_mb,
            file_format=file_extension,
            category="Financial Document",
            tags=["financial", "analysis"]
        )
        
        return document
        
    except Exception as e:
        # Clean up saved file if database operation fails
        try:
            Path(file_path).unlink()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to create document record: {str(e)}")


def _process_analysis(document_id: str, user_id: str, file_path: str, query: str) -> dict:
    """Process document analysis using existing task and agent"""
    try:
        analysis_service = AnalysisService()
        return analysis_service.analyze_document(
            document_id=document_id,
            user_id=user_id,
            file_path=file_path,
            query=query
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/{user_id}/analyses", response_model=List[AnalysisResultResponse])
def get_user_analyses(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Get analyses for a specific user"""
    try:
        if current_user.role != "Admin" and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        analysis_service = AnalysisService()
        analyses = analysis_service.get_user_analyses(user_id, skip, limit)
        return analyses
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user analyses: {str(e)}"
        )


@router.get("/{analysis_id}/structured")
def get_structured_analysis_by_id(
    analysis_id: str,
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Get structured analysis data by ID for frontend consumption"""
    try:
        analysis_service = AnalysisService()
        result = analysis_service.get_structured_analysis(analysis_id, current_user)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving structured analysis: {str(e)}"
        )


@router.get("/documents/{document_id}/analyses", response_model=List[AnalysisResultResponse])
def get_analyses_by_document_id(
    document_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Get all analyses for a specific document"""
    try:
        analysis_service = AnalysisService()
        analyses = analysis_service.get_analyses_by_document_id(document_id, current_user, skip, limit)
        return analyses
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving analyses: {str(e)}"
        )


@router.get("/history", response_model=List[AnalysisResultResponse])
def get_analysis_history(
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Get analysis history for the current user (legacy endpoint)"""
    try:
        user_service = UserService()
        analyses = user_service.get_user_analyses(current_user.id, skip, limit)
        return analyses
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving analysis history: {str(e)}"
        )
