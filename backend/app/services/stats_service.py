"""
Statistics Service
Handles statistics and analytics operations
"""

import logging
from typing import Dict, Any

from app.models.schemas import UserStats, DocumentStats, AnalysisStats
from app.repositories.stats_repository import StatsRepository

logger = logging.getLogger(__name__)


class StatsService:
    """Service for statistics operations"""
    
    def __init__(self):
        self.stats_repository = StatsRepository()
    
    def get_user_stats(self) -> UserStats:
        """Get user statistics"""
        try:
            return self.stats_repository.get_user_stats()
        except Exception as e:
            logger.error(f"Error getting user stats: {e}")
            return UserStats(total_users=0, active_users=0, admin_users=0, viewer_users=0)
    
    def get_document_stats(self) -> DocumentStats:
        """Get document statistics"""
        try:
            return self.stats_repository.get_document_stats()
        except Exception as e:
            logger.error(f"Error getting document stats: {e}")
            return DocumentStats(
                total_documents=0,
                documents_by_status={},
                documents_by_format={},
                total_storage_mb=0.0
            )
    
    def get_analysis_stats(self) -> AnalysisStats:
        """Get analysis statistics"""
        try:
            return self.stats_repository.get_analysis_stats()
        except Exception as e:
            logger.error(f"Error getting analysis stats: {e}")
            return AnalysisStats(
                total_analyses=0,
                analyses_by_type={},
                average_confidence_score=0.0,
                average_processing_time=0.0
            )
    
    def get_user_specific_stats(self, user_id: str) -> dict:
        """Get user-specific statistics for dashboard"""
        try:
            return self.stats_repository.get_user_specific_stats(user_id)
        except Exception as e:
            logger.error(f"Error getting user specific stats: {e}")
            return {
                "total_documents": 0,
                "total_analyses": 0,
                "completed_analyses": 0,
                "processing_analyses": 0,
                "failed_analyses": 0,
                "total_storage_mb": 0.0,
                "average_confidence_score": 0.0,
                "average_processing_time": 0.0
            }