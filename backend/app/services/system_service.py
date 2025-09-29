"""
System Service
Handles system health and monitoring operations
"""

import logging
from app.repositories.connection import get_sync_database

logger = logging.getLogger(__name__)


class SystemService:
    """Service for system operations"""
    
    def health_check(self) -> dict:
        """Perform system health check"""
        try:
            # Check database connectivity
            db = get_sync_database()
            stats = db.command("dbStats")
            
            return {
                "status": "healthy",
                "database": "connected",
                "database_stats": {
                    "collections": stats.get("collections", 0),
                    "data_size": stats.get("dataSize", 0),
                    "storage_size": stats.get("storageSize", 0)
                }
            }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            }
