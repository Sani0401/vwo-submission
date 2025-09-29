"""
Statistics Repository
Handles statistics data operations with MongoDB
"""

import logging
from app.models.schemas import UserStats, DocumentStats, AnalysisStats
from app.repositories.connection import get_sync_database

logger = logging.getLogger(__name__)


class StatsRepository:
    """Repository for statistics data operations"""
    
    def __init__(self):
        self.db = get_sync_database()
        self.users_collection = self.db['users']
        self.documents_collection = self.db['documents']
        self.analysis_collection = self.db['analysis_results']
    
    def get_user_stats(self) -> UserStats:
        """Get user statistics"""
        try:
            total_users = self.users_collection.count_documents({})
            active_users = self.users_collection.count_documents({"account.status": "active"})
            admin_users = self.users_collection.count_documents({"role": "Admin"})
            viewer_users = self.users_collection.count_documents({"role": "Viewer"})
            
            return UserStats(
                total_users=total_users,
                active_users=active_users,
                admin_users=admin_users,
                viewer_users=viewer_users
            )
            
        except Exception as e:
            logger.error(f"Error getting user stats: {e}")
            return UserStats(total_users=0, active_users=0, admin_users=0, viewer_users=0)
    
    def get_document_stats(self) -> DocumentStats:
        """Get document statistics"""
        try:
            total_documents = self.documents_collection.count_documents({})
            
            # Documents by status
            status_pipeline = [
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]
            status_results = list(self.documents_collection.aggregate(status_pipeline))
            documents_by_status = {result["_id"]: result["count"] for result in status_results}
            
            # Documents by format
            format_pipeline = [
                {"$group": {"_id": "$file_format", "count": {"$sum": 1}}}
            ]
            format_results = list(self.documents_collection.aggregate(format_pipeline))
            documents_by_format = {result["_id"]: result["count"] for result in format_results}
            
            # Total storage
            storage_pipeline = [
                {"$group": {"_id": None, "total_storage": {"$sum": "$file_size_mb"}}}
            ]
            storage_result = list(self.documents_collection.aggregate(storage_pipeline))
            total_storage_mb = storage_result[0]["total_storage"] if storage_result else 0.0
            
            return DocumentStats(
                total_documents=total_documents,
                documents_by_status=documents_by_status,
                documents_by_format=documents_by_format,
                total_storage_mb=total_storage_mb
            )
            
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
            total_analyses = self.analysis_collection.count_documents({})
            
            # Analyses by type
            type_pipeline = [
                {"$group": {"_id": "$analysis_type", "count": {"$sum": 1}}}
            ]
            type_results = list(self.analysis_collection.aggregate(type_pipeline))
            analyses_by_type = {result["_id"]: result["count"] for result in type_results}
            
            # Average confidence score
            confidence_pipeline = [
                {"$group": {"_id": None, "avg_confidence": {"$avg": "$confidence_score"}}}
            ]
            confidence_result = list(self.analysis_collection.aggregate(confidence_pipeline))
            average_confidence_score = confidence_result[0]["avg_confidence"] if confidence_result else 0.0
            
            # Average processing time
            time_pipeline = [
                {"$group": {"_id": None, "avg_time": {"$avg": "$processing_time_sec"}}}
            ]
            time_result = list(self.analysis_collection.aggregate(time_pipeline))
            average_processing_time = time_result[0]["avg_time"] if time_result else 0.0
            
            return AnalysisStats(
                total_analyses=total_analyses,
                analyses_by_type=analyses_by_type,
                average_confidence_score=average_confidence_score,
                average_processing_time=average_processing_time
            )
            
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
            from bson import ObjectId
            
            # Count user documents
            total_documents = self.documents_collection.count_documents({"user_id": ObjectId(user_id)})
            
            # Count user analyses
            total_analyses = self.analysis_collection.count_documents({"user_id": ObjectId(user_id)})
            
            # Count analyses by status (based on document status)
            completed_analyses = 0
            processing_analyses = 0
            failed_analyses = 0
            
            # Get document statuses for this user
            user_documents = list(self.documents_collection.find(
                {"user_id": ObjectId(user_id)},
                {"status": 1, "analysis_ids": 1}
            ))
            
            for doc in user_documents:
                analysis_count = len(doc.get("analysis_ids", []))
                if doc["status"] == "completed":
                    completed_analyses += analysis_count
                elif doc["status"] == "processing":
                    processing_analyses += analysis_count
                elif doc["status"] == "failed":
                    failed_analyses += analysis_count
            
            # Calculate total storage for user
            storage_pipeline = [
                {"$match": {"user_id": ObjectId(user_id)}},
                {"$group": {"_id": None, "total_storage": {"$sum": "$file_size_mb"}}}
            ]
            storage_result = list(self.documents_collection.aggregate(storage_pipeline))
            total_storage_mb = storage_result[0]["total_storage"] if storage_result else 0.0
            
            # Calculate average confidence score for user analyses
            confidence_pipeline = [
                {"$match": {"user_id": ObjectId(user_id)}},
                {"$group": {"_id": None, "avg_confidence": {"$avg": "$confidence_score"}}}
            ]
            confidence_result = list(self.analysis_collection.aggregate(confidence_pipeline))
            average_confidence_score = confidence_result[0]["avg_confidence"] if confidence_result else 0.0
            
            # Calculate average processing time for user analyses
            time_pipeline = [
                {"$match": {"user_id": ObjectId(user_id)}},
                {"$group": {"_id": None, "avg_time": {"$avg": "$processing_time_sec"}}}
            ]
            time_result = list(self.analysis_collection.aggregate(time_pipeline))
            average_processing_time = time_result[0]["avg_time"] if time_result else 0.0
            
            return {
                "total_documents": total_documents,
                "total_analyses": total_analyses,
                "completed_analyses": completed_analyses,
                "processing_analyses": processing_analyses,
                "failed_analyses": failed_analyses,
                "total_storage_mb": round(total_storage_mb, 2),
                "average_confidence_score": round(average_confidence_score, 2),
                "average_processing_time": round(average_processing_time, 2)
            }
            
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