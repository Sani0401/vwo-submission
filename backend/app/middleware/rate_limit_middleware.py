"""
Rate Limiting Middleware
Implements rate limiting for API endpoints
"""

import time
import logging
from typing import Callable
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.utils.redis_client import get_redis_client

logger = logging.getLogger(__name__)


class RateLimitExceeded(HTTPException):
    """Exception raised when rate limit is exceeded"""
    
    def __init__(self, rate_status: dict):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Rate limit exceeded",
                "message": rate_status.get("message", "Too many requests"),
                "retry_after": rate_status.get("retry_after", 60),
                "limit": rate_status.get("limit", 100),
                "remaining": rate_status.get("remaining", 0)
            }
        )


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting API requests"""
    
    def __init__(self, app, *args, **kwargs):
        super().__init__(app, *args, **kwargs)
        self.settings = get_settings()
        self.redis_client = get_redis_client()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Check rate limit before processing request"""
        
        # Skip rate limiting for certain paths
        if self._should_skip_rate_limit(request):
            return call_next(request)
        
        # Get client identifier
        client_id = self._get_client_id(request)
        
        # Check rate limit
        if not self._check_rate_limit(client_id, request):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": str(self.settings.RATE_LIMIT_WINDOW)}
            )
        
        return call_next(request)
    
    def _should_skip_rate_limit(self, request: Request) -> bool:
        """Check if rate limiting should be skipped for this request"""
        skip_paths = [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico"
        ]
        
        return any(request.url.path.startswith(path) for path in skip_paths)
    
    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier"""
        # Use IP address as primary identifier
        client_ip = request.client.host if request.client else "unknown"
        
        # Add user ID if authenticated
        if hasattr(request.state, 'user') and request.state.user:
            return f"user:{request.state.user.id}"
        
        return f"ip:{client_ip}"
    
    async def _check_rate_limit(self, client_id: str, request: Request) -> bool:
        """Check if client has exceeded rate limit"""
        try:
            current_time = int(time.time())
            window_start = current_time - self.settings.RATE_LIMIT_WINDOW
            
            # Use Redis for rate limiting
            key = f"rate_limit:{client_id}"
            
            # Get current request count
            current_count = self.redis_client.get(key) or 0
            current_count = int(current_count)
            
            # Check if limit exceeded
            if current_count >= self.settings.RATE_LIMIT_REQUESTS:
                return False
            
            # Increment counter
            pipe = self.redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, self.settings.RATE_LIMIT_WINDOW)
            pipe.execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            # Allow request if rate limiting fails
            return True
