"""
Logging Middleware
Handles request/response logging with structured data
"""

import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.core.logging import get_logging_service
from app.models.schemas import LogLevel, LogCategory, LogAction

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging HTTP requests and responses"""
    
    def __init__(self, app, *args, **kwargs):
        super().__init__(app, *args, **kwargs)
        self.settings = get_settings()
        self.logging_service = get_logging_service()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log details"""
        start_time = time.time()
        
        # Extract request information
        request_info = {
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "content_type": request.headers.get("content-type"),
            "content_length": request.headers.get("content-length"),
        }
        
        # Process request
        try:
            response = call_next(request)
            processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Log successful request
            self._log_request(
                request=request,
                response=response,
                processing_time=processing_time,
                request_info=request_info,
                success=True
            )
            
            return response
            
        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            
            # Log failed request
            self._log_request(
                request=request,
                response=None,
                processing_time=processing_time,
                request_info=request_info,
                success=False,
                error=str(e)
            )
            
            raise
    
    async def _log_request(
        self,
        request: Request,
        response: Response = None,
        processing_time: float = 0,
        request_info: dict = None,
        success: bool = True,
        error: str = None
    ):
        """Log request details"""
        try:
            # Determine log level
            if success:
                if response and response.status_code >= 400:
                    level = LogLevel.WARNING
                else:
                    level = LogLevel.INFO
            else:
                level = LogLevel.ERROR
            
            # Create log entry
            log_data = {
                "level": level,
                "category": LogCategory.API,
                "action": LogAction.API_REQUEST,
                "message": f"API request: {request.method} {request.url.path}",
                "request_method": request.method,
                "request_path": request.url.path,
                "response_status": response.status_code if response else None,
                "processing_time_ms": processing_time,
                "details": {
                    "request_info": request_info,
                    "success": success,
                    "error": error
                }
            }
            
            # Add user information if available
            if hasattr(request.state, 'user') and request.state.user:
                log_data["user_id"] = request.state.user.id
            
            # Log the entry
            self.logging_service.log_activity(**log_data)
            
        except Exception as e:
            logger.error(f"Error logging request: {e}")
