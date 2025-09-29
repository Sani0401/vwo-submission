"""
Analysis Service
Handles analysis operations and document processing
"""

import logging
import time
from typing import List, Optional

from app.models.schemas import AnalysisResultResponse, UserResponse
from app.repositories.analysis_repository import AnalysisRepository
from app.services.document_service import DocumentService
from app.services.user import UserService

logger = logging.getLogger(__name__)


class AnalysisService:
    """Service for analysis operations"""
    
    def __init__(self):
        self.analysis_repository = AnalysisRepository()
        self.document_service = DocumentService()
        self.user_service = UserService()
    
    def analyze_document(
        self,
        document_id: str,
        user_id: str,
        file_path: str,
        query: str
    ) -> dict:
        """Analyze a document and return results"""
        try:
            logger.info(f"Starting analysis for document {document_id}")
            
            # Update document status to processing
            self.document_service.update_document_status(document_id, "processing", 50)
            
            # Run analysis
            from main import run_financial_analysis
            start_time = time.time()
            response = run_financial_analysis(query=query.strip(), file_path=file_path)
            processing_time = int(time.time() - start_time)
            
            # Update document status to completed
            self.document_service.update_document_status(document_id, "completed", 100, processing_time)
            
            # Create analysis result
            analysis_result = self.analysis_repository.create_analysis_result(
                document_id=document_id,
                user_id=user_id,
                analysis_type="Financial Document Analysis",
                query=query,
                summary_text=str(response),
                confidence_score=0.85,
                data_quality_score=0.90,
                processing_time_sec=processing_time
            )
            
            # Prepare structured response data for frontend
            response_data = {
                "status": "success",
                "query": query,
                "file_processed": file_path.split('/')[-1],
                "file_path": file_path,
                "document_id": document_id,
                "analysis_id": analysis_result.id,
                "processing_time_sec": processing_time,
                "user_id": user_id,
                "analysis": {
                    "summary": analysis_result.output.summary,
                    "metrics": analysis_result.output.metrics,
                    "insights": analysis_result.output.insights,
                    "key_findings": analysis_result.output.key_findings,
                    "financial_highlights": analysis_result.output.financial_highlights,
                    "risks": analysis_result.output.risks,
                    "opportunities": analysis_result.output.opportunities,
                    "extraction_quality_score": analysis_result.output.extraction_quality_score,
                    "confidence_score": analysis_result.confidence_score,
                    "data_quality_score": analysis_result.data_quality_score
                },
                "dashboard_refresh_required": True,  # Flag to indicate dashboard should refresh
                "updated_counts": {
                    "total_analyses": self._get_user_analysis_count(user_id),
                    "completed_analyses": self._get_user_completed_analysis_count(user_id)
                }
            }
            
            logger.info(f"Analysis completed successfully for user {user_id}")
            return response_data
            
        except Exception as e:
            logger.error(f"Error analyzing document: {e}")
            # Update document status to failed
            self.document_service.update_document_status(document_id, "failed", 0)
            raise
    
    def get_user_analyses(self, user_id: str, skip: int = 0, limit: int = 50) -> List[AnalysisResultResponse]:
        """Get all analyses for a specific user"""
        try:
            return self.analysis_repository.get_user_analyses(user_id, skip, limit)
        except Exception as e:
            logger.error(f"Error getting user analyses: {e}")
            return []
    
    def get_structured_analysis(self, analysis_id: str, current_user: UserResponse) -> dict:
        """Get structured analysis data by ID for frontend consumption"""
        try:
            return self.analysis_repository.get_structured_analysis(analysis_id, current_user)
        except Exception as e:
            logger.error(f"Error getting structured analysis: {e}")
            raise
    
    def get_analyses_by_document_id(
        self,
        document_id: str,
        current_user: UserResponse,
        skip: int = 0,
        limit: int = 50
    ) -> List[AnalysisResultResponse]:
        """Get all analyses for a specific document"""
        try:
            return self.analysis_repository.get_analyses_by_document_id(document_id, current_user, skip, limit)
        except Exception as e:
            logger.error(f"Error getting analyses by document ID: {e}")
            return []
    
    def _get_user_analysis_count(self, user_id: str) -> int:
        """Get total analysis count for a user"""
        try:
            return self.analysis_repository.get_user_analysis_count(user_id)
        except Exception as e:
            logger.error(f"Error getting user analysis count: {e}")
            return 0
    
    def _get_user_completed_analysis_count(self, user_id: str) -> int:
        """Get completed analysis count for a user"""
        try:
            return self.analysis_repository.get_user_completed_analysis_count(user_id)
        except Exception as e:
            logger.error(f"Error getting user completed analysis count: {e}")
            return 0
