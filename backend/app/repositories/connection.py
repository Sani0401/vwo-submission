"""
Database Connection Management
Handles MongoDB connection and initialization
"""

import logging
from pymongo import MongoClient
from app.config import get_settings

logger = logging.getLogger(__name__)

# Global database client
_client: MongoClient = None


def init_database():
    """Initialize database connection"""
    global _client
    
    try:
        settings = get_settings()
        
        # Sync client with SSL configuration
        _client = MongoClient(
            settings.MONGODB_URL,
            tls=True,
            tlsAllowInvalidCertificates=True,
            tlsAllowInvalidHostnames=True
        )
        
        # Test connection
        _client.admin.command('ping')
        logger.info("Connected to MongoDB successfully")
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


def close_database():
    """Close database connection"""
    global _client
    
    try:
        if _client:
            _client.close()
        logger.info("Disconnected from MongoDB")
    except Exception as e:
        logger.error(f"Error closing database connection: {e}")


def get_database():
    """Get database instance"""
    if _client is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    
    settings = get_settings()
    return _client[settings.MONGODB_DATABASE]


def get_sync_database():
    """Get synchronous database instance (same as get_database for sync version)"""
    return get_database()


def get_client():
    """Get MongoDB client"""
    if _client is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    
    return _client


def get_sync_client():
    """Get synchronous MongoDB client (same as get_client for sync version)"""
    return get_client()
