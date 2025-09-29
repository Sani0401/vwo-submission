"""
Logging Service for Financial Document Analyzer
Handles comprehensive logging of all operations to MongoDB logs collection
"""

import traceback
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import logging
from fastapi import Request

from bson import ObjectId
from app.models.schemas import (
    LogEntry, LogEntryCreate, LogEntryResponse, LogStats,
    LogLevel, LogCategory, LogAction
)
from app.core.database import get_mongodb_client

# Set up logging
logger = logging.getLogger(__name__)

class LoggingService:
    """Service for managing application logs"""
    
    def __init__(self):
        self.mongodb_client = get_mongodb_client()
        logger.info(f"MongoDB client initialized: {self.mongodb_client is not None}")
        logger.info(f"MongoDB database available: {self.mongodb_client.db is not None}")
        
        if self.mongodb_client.db is not None:
            self.logs_collection = self.mongodb_client.db['logs']
            logger.info(f"Logs collection created: {self.logs_collection is not None}")
            self._create_indexes()
        else:
            self.logs_collection = None
            logger.error("MongoDB database not available - logs will not be stored")
    
    def _create_indexes(self):
        """Create database indexes for better performance"""
        try:
            # Index on timestamp for time-based queries
            self.logs_collection.create_index("timestamp")
            
            # Index on user_id for user-specific queries
            self.logs_collection.create_index("user_id")
            
            # Index on category and action for filtering
            self.logs_collection.create_index([("category", 1), ("action", 1)])
            
            # Index on level for error tracking
            self.logs_collection.create_index("level")
            
            # Compound index for efficient querying
            self.logs_collection.create_index([("timestamp", -1), ("user_id", 1)])
            
            logger.info("Log database indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create log indexes: {e}")
    
    def log_activity(
        self,
        level: LogLevel,
        category: LogCategory,
        action: LogAction,
        message: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        response_status: Optional[int] = None,
        processing_time_ms: Optional[float] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
        stack_trace: Optional[str] = None
    ) -> str:
        """
        Log an activity to the database
        
        Returns:
            str: Log entry ID
        """
        try:
            if self.logs_collection is None:
                logger.warning("Logs collection not available, skipping log entry")
                return None
            
            # Create log entry
            log_data = {
                "timestamp": datetime.utcnow(),
                "level": level,
                "category": category,
                "action": action,
                "user_id": ObjectId(user_id) if user_id else None,
                "session_id": session_id or str(uuid.uuid4()),
                "ip_address": ip_address,
                "user_agent": user_agent,
                "resource_type": resource_type,
                "resource_id": ObjectId(resource_id) if resource_id else None,
                "message": message,
                "details": details or {},
                "request_method": request_method,
                "request_path": request_path,
                "response_status": response_status,
                "processing_time_ms": processing_time_ms,
                "error_code": error_code,
                "error_message": error_message,
                "stack_trace": stack_trace
            }
            
            logger.info(f"Attempting to insert log entry: {message}")
            # Insert log entry
            result = self.logs_collection.insert_one(log_data)
            log_id = str(result.inserted_id)
            logger.info(f"Log entry inserted successfully with ID: {log_id}")
            
            # Also log to console for debugging
            console_message = f"[{level.upper()}] {category.value}:{action.value} - {message}"
            if user_id:
                console_message += f" (User: {user_id})"
            if processing_time_ms:
                console_message += f" ({processing_time_ms:.2f}ms)"
            
            if level == LogLevel.ERROR:
                logger.error(console_message)
            elif level == LogLevel.WARNING:
                logger.warning(console_message)
            else:
                logger.info(console_message)
            
            return log_id
            
        except Exception as e:
            logger.error(f"Error logging activity: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(f"Exception details: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    def log_from_request(
        self,
        request: Request,
        level: LogLevel,
        category: LogCategory,
        action: LogAction,
        message: str,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        response_status: Optional[int] = None,
        processing_time_ms: Optional[float] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> str:
        """
        Log activity from a FastAPI request
        
        Returns:
            str: Log entry ID
        """
        try:
            # Extract request information
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
            request_method = request.method
            request_path = str(request.url.path)
            
            return self.log_activity(
                level=level,
                category=category,
                action=action,
                message=message,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details,
                request_method=request_method,
                request_path=request_path,
                response_status=response_status,
                processing_time_ms=processing_time_ms,
                error_code=error_code,
                error_message=error_message
            )
        except Exception as e:
            logger.error(f"Error logging from request: {e}")
            return None
    
    def log_error(
        self,
        category: LogCategory,
        action: LogAction,
        message: str,
        error: Exception,
        user_id: Optional[str] = None,
        request: Optional[Request] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Log an error with full stack trace
        
        Returns:
            str: Log entry ID
        """
        try:
            error_message = str(error)
            stack_trace = traceback.format_exc()
            
            if request:
                return self.log_from_request(
                    request=request,
                    level=LogLevel.ERROR,
                    category=category,
                    action=action,
                    message=message,
                    user_id=user_id,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    details=details,
                    error_code=type(error).__name__,
                    error_message=error_message,
                    stack_trace=stack_trace
                )
            else:
                return self.log_activity(
                    level=LogLevel.ERROR,
                    category=category,
                    action=action,
                    message=message,
                    user_id=user_id,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    details=details,
                    error_code=type(error).__name__,
                    error_message=error_message,
                    stack_trace=stack_trace
                )
        except Exception as e:
            logger.error(f"Error logging error: {e}")
            return None
    
    def get_logs(
        self,
        user_id: Optional[str] = None,
        category: Optional[LogCategory] = None,
        action: Optional[LogAction] = None,
        level: Optional[LogLevel] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[LogEntryResponse]:
        """
        Retrieve logs with filtering options
        
        Returns:
            List[LogEntryResponse]: List of log entries
        """
        try:
            if not self.logs_collection:
                return []
            
            # Build query
            query = {}
            
            if user_id:
                query["user_id"] = ObjectId(user_id)
            
            if category:
                query["category"] = category
            
            if action:
                query["action"] = action
            
            if level:
                query["level"] = level
            
            if start_date or end_date:
                query["timestamp"] = {}
                if start_date:
                    query["timestamp"]["$gte"] = start_date
                if end_date:
                    query["timestamp"]["$lte"] = end_date
            
            # Execute query
            cursor = self.logs_collection.find(query).sort("timestamp", -1).skip(skip).limit(limit)
            
            logs = []
            for doc in cursor:
                log_entry = LogEntryResponse(
                    id=str(doc["_id"]),
                    timestamp=doc["timestamp"],
                    level=doc["level"],
                    category=doc["category"],
                    action=doc["action"],
                    user_id=str(doc["user_id"]) if doc.get("user_id") else None,
                    session_id=doc.get("session_id"),
                    ip_address=doc.get("ip_address"),
                    user_agent=doc.get("user_agent"),
                    resource_type=doc.get("resource_type"),
                    resource_id=str(doc["resource_id"]) if doc.get("resource_id") else None,
                    message=doc["message"],
                    details=doc.get("details"),
                    request_method=doc.get("request_method"),
                    request_path=doc.get("request_path"),
                    response_status=doc.get("response_status"),
                    processing_time_ms=doc.get("processing_time_ms"),
                    error_code=doc.get("error_code"),
                    error_message=doc.get("error_message"),
                    stack_trace=doc.get("stack_trace")
                )
                logs.append(log_entry)
            
            return logs
            
        except Exception as e:
            logger.error(f"Error retrieving logs: {e}")
            return []
    
    def get_log_stats(self) -> LogStats:
        """
        Get logging statistics
        
        Returns:
            LogStats: Logging statistics
        """
        try:
            if not self.logs_collection:
                return LogStats(
                    total_logs=0,
                    logs_by_level={},
                    logs_by_category={},
                    logs_by_action={},
                    recent_errors=0,
                    average_processing_time=0.0
                )
            
            # Get total count
            total_logs = self.logs_collection.count_documents({})
            
            # Get logs by level
            logs_by_level = {}
            for level in LogLevel:
                count = self.logs_collection.count_documents({"level": level})
                logs_by_level[level.value] = count
            
            # Get logs by category
            logs_by_category = {}
            for category in LogCategory:
                count = self.logs_collection.count_documents({"category": category})
                logs_by_category[category.value] = count
            
            # Get logs by action
            logs_by_action = {}
            for action in LogAction:
                count = self.logs_collection.count_documents({"action": action})
                logs_by_action[action.value] = count
            
            # Get recent errors (last 24 hours)
            yesterday = datetime.utcnow() - timedelta(days=1)
            recent_errors = self.logs_collection.count_documents({
                "level": LogLevel.ERROR,
                "timestamp": {"$gte": yesterday}
            })
            
            # Get average processing time
            pipeline = [
                {"$match": {"processing_time_ms": {"$exists": True, "$ne": None}}},
                {"$group": {"_id": None, "avg_time": {"$avg": "$processing_time_ms"}}}
            ]
            result = list(self.logs_collection.aggregate(pipeline))
            average_processing_time = result[0]["avg_time"] if result else 0.0
            
            return LogStats(
                total_logs=total_logs,
                logs_by_level=logs_by_level,
                logs_by_category=logs_by_category,
                logs_by_action=logs_by_action,
                recent_errors=recent_errors,
                average_processing_time=average_processing_time
            )
            
        except Exception as e:
            logger.error(f"Error getting log stats: {e}")
            return LogStats(
                total_logs=0,
                logs_by_level={},
                logs_by_category={},
                logs_by_action={},
                recent_errors=0,
                average_processing_time=0.0
            )
    
    def cleanup_old_logs(self, days_to_keep: int = 30) -> int:
        """
        Clean up old log entries
        
        Args:
            days_to_keep (int): Number of days to keep logs
            
        Returns:
            int: Number of logs deleted
        """
        try:
            if not self.logs_collection:
                return 0
            
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            result = self.logs_collection.delete_many({"timestamp": {"$lt": cutoff_date}})
            
            deleted_count = result.deleted_count
            if deleted_count > 0:
                self.log_activity(
                    level=LogLevel.INFO,
                    category=LogCategory.SYSTEM,
                    action=LogAction.SYSTEM_STARTUP,  # Using existing action
                    message=f"Cleaned up {deleted_count} old log entries",
                    details={"days_to_keep": days_to_keep, "cutoff_date": cutoff_date.isoformat()}
                )
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old logs: {e}")
            return 0

# Global logging service instance
logging_service = None

def get_logging_service() -> LoggingService:
    """Get or create logging service instance"""
    global logging_service
    if logging_service is None:
        logging_service = LoggingService()
    return logging_service

# Convenience functions for common logging operations
def log_user_login(user_id: str, request: Request, success: bool = True) -> str:
    """Log user login attempt"""
    service = get_logging_service()
    return service.log_from_request(
        request=request,
        level=LogLevel.INFO if success else LogLevel.WARNING,
        category=LogCategory.AUTHENTICATION,
        action=LogAction.USER_LOGIN,
        message=f"User {'successfully logged in' if success else 'failed to log in'}",
        user_id=user_id,
        details={"success": success}
    )

def log_document_upload(user_id: str, document_id: str, file_name: str, file_size_mb: float, request: Request) -> str:
    """Log document upload"""
    service = get_logging_service()
    return service.log_from_request(
        request=request,
        level=LogLevel.INFO,
        category=LogCategory.DOCUMENT,
        action=LogAction.DOCUMENT_UPLOAD,
        message=f"Document uploaded: {file_name}",
        user_id=user_id,
        resource_type="document",
        resource_id=document_id,
        details={"file_name": file_name, "file_size_mb": file_size_mb}
    )

def log_analysis_complete(user_id: str, analysis_id: str, document_id: str, processing_time_sec: float, request: Request) -> str:
    """Log analysis completion"""
    service = get_logging_service()
    return service.log_from_request(
        request=request,
        level=LogLevel.INFO,
        category=LogCategory.ANALYSIS,
        action=LogAction.ANALYSIS_COMPLETE,
        message=f"Analysis completed successfully",
        user_id=user_id,
        resource_type="analysis",
        resource_id=analysis_id,
        details={"document_id": document_id, "processing_time_sec": processing_time_sec}
    )

def log_api_request(request: Request, response_status: int, processing_time_ms: float, user_id: Optional[str] = None) -> str:
    """Log API request"""
    service = get_logging_service()
    level = LogLevel.INFO if 200 <= response_status < 400 else LogLevel.WARNING if 400 <= response_status < 500 else LogLevel.ERROR
    return service.log_from_request(
        request=request,
        level=level,
        category=LogCategory.API,
        action=LogAction.API_REQUEST,
        message=f"API request: {request.method} {request.url.path}",
        user_id=user_id,
        response_status=response_status,
        processing_time_ms=processing_time_ms
    )
