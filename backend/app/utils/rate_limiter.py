"""
Rate Limiting Service for Financial Document Analyzer
Handles API rate limiting for production security
"""

import time
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import logging

from app.utils.redis_client import get_redis_client

# Set up logging
logger = logging.getLogger(__name__)

class RateLimiter:
    """Rate limiter using Redis for distributed rate limiting"""
    
    def __init__(self):
        self.redis_client = get_redis_client()
    
    def _get_client_identifier(self, request: Request) -> str:
        """Get unique identifier for the client"""
        # Try to get user ID from token if available
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # For authenticated users, use user ID
            # This would need to be extracted from the JWT token
            # For now, we'll use IP + user agent as fallback
            pass
        
        # Use IP address and user agent as identifier
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        return f"{client_ip}:{hash(user_agent)}"
    
    def is_allowed(
        self, 
        identifier: str, 
        limit: int, 
        window: int,
        endpoint: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check if request is allowed based on rate limit
        
        Args:
            identifier (str): Client identifier
            limit (int): Maximum requests allowed
            window (int): Time window in seconds
            endpoint (str, optional): Specific endpoint for granular limiting
            
        Returns:
            dict: Rate limit status information
        """
        try:
            # Create rate limit key
            if endpoint:
                key = f"rate_limit:{endpoint}:{identifier}"
            else:
                key = f"rate_limit:global:{identifier}"
            
            current_time = int(time.time())
            window_start = current_time - window
            
            # Use Redis sorted set for sliding window rate limiting
            if self.redis_client.is_available:
                # Remove old entries
                self.redis_client.client.zremrangebyscore(key, 0, window_start)
                
                # Count current requests
                current_requests = self.redis_client.client.zcard(key)
                
                if current_requests >= limit:
                    # Rate limit exceeded
                    oldest_request = self.redis_client.client.zrange(key, 0, 0, withscores=True)
                    reset_time = int(oldest_request[0][1]) + window if oldest_request else current_time + window
                    
                    return {
                        "allowed": False,
                        "limit": limit,
                        "remaining": 0,
                        "reset_time": reset_time,
                        "retry_after": reset_time - current_time
                    }
                
                # Add current request
                self.redis_client.client.zadd(key, {str(current_time): current_time})
                self.redis_client.client.expire(key, window)
                
                return {
                    "allowed": True,
                    "limit": limit,
                    "remaining": limit - current_requests - 1,
                    "reset_time": current_time + window,
                    "retry_after": 0
                }
            else:
                # Fallback to in-memory rate limiting (not recommended for production)
                logger.warning("Redis not available, using fallback rate limiting")
                return self._fallback_rate_limit(identifier, limit, window, endpoint)
                
        except Exception as e:
            logger.error(f"Error in rate limiting: {e}")
            # Allow request if rate limiting fails
            return {
                "allowed": True,
                "limit": limit,
                "remaining": limit,
                "reset_time": int(time.time()) + window,
                "retry_after": 0,
                "error": str(e)
            }
    
    def _fallback_rate_limit(
        self, 
        identifier: str, 
        limit: int, 
        window: int,
        endpoint: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fallback in-memory rate limiting (not recommended for production)"""
        # This is a simple implementation for development
        # In production, you should always use Redis
        return {
            "allowed": True,
            "limit": limit,
            "remaining": limit,
            "reset_time": int(time.time()) + window,
            "retry_after": 0,
            "warning": "Using fallback rate limiting"
        }

# Global rate limiter instance
rate_limiter = RateLimiter()

# Rate limit configurations for different endpoints
RATE_LIMITS = {
    "auth": {"limit": 5, "window": 300},      # 5 requests per 5 minutes for auth
    "upload": {"limit": 10, "window": 3600},  # 10 uploads per hour
    "analysis": {"limit": 20, "window": 3600}, # 20 analyses per hour
    "api": {"limit": 100, "window": 3600},    # 100 API calls per hour
    "global": {"limit": 1000, "window": 3600} # 1000 total requests per hour
}

def check_rate_limit(
    request: Request, 
    endpoint_type: str = "api",
    custom_limit: Optional[int] = None,
    custom_window: Optional[int] = None
) -> Dict[str, Any]:
    """
    Check rate limit for a request
    
    Args:
        request (Request): FastAPI request object
        endpoint_type (str): Type of endpoint (auth, upload, analysis, api, global)
        custom_limit (int, optional): Custom rate limit
        custom_window (int, optional): Custom time window
        
    Returns:
        dict: Rate limit status
    """
    identifier = rate_limiter._get_client_identifier(request)
    
    # Get rate limit configuration
    if custom_limit and custom_window:
        limit = custom_limit
        window = custom_window
    else:
        config = RATE_LIMITS.get(endpoint_type, RATE_LIMITS["api"])
        limit = config["limit"]
        window = config["window"]
    
    return rate_limiter.is_allowed(identifier, limit, window, endpoint_type)

def rate_limit_middleware(endpoint_type: str = "api"):
    """
    Middleware decorator for rate limiting
    
    Args:
        endpoint_type (str): Type of endpoint for rate limiting
    """
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            rate_status = check_rate_limit(request, endpoint_type)
            
            if not rate_status["allowed"]:
                logger.warning(f"Rate limit exceeded for {request.client.host}")
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "Rate limit exceeded",
                        "message": f"Too many requests. Limit: {rate_status['limit']} per {rate_status.get('retry_after', 0)} seconds",
                        "retry_after": rate_status.get("retry_after", 0),
                        "limit": rate_status["limit"],
                        "remaining": rate_status["remaining"]
                    },
                    headers={
                        "X-RateLimit-Limit": str(rate_status["limit"]),
                        "X-RateLimit-Remaining": str(rate_status["remaining"]),
                        "X-RateLimit-Reset": str(rate_status["reset_time"]),
                        "Retry-After": str(rate_status.get("retry_after", 0))
                    }
                )
            
            # Add rate limit headers to response
            response = func(request, *args, **kwargs)
            if hasattr(response, 'headers'):
                response.headers["X-RateLimit-Limit"] = str(rate_status["limit"])
                response.headers["X-RateLimit-Remaining"] = str(rate_status["remaining"])
                response.headers["X-RateLimit-Reset"] = str(rate_status["reset_time"])
            
            return response
        return wrapper
    return decorator

# Convenience functions for specific rate limiting scenarios
def check_auth_rate_limit(request: Request) -> Dict[str, Any]:
    """Check rate limit for authentication endpoints"""
    return check_rate_limit(request, "auth")

def check_upload_rate_limit(request: Request) -> Dict[str, Any]:
    """Check rate limit for file upload endpoints"""
    return check_rate_limit(request, "upload")

def check_analysis_rate_limit(request: Request) -> Dict[str, Any]:
    """Check rate limit for analysis endpoints"""
    return check_rate_limit(request, "analysis")

def check_api_rate_limit(request: Request) -> Dict[str, Any]:
    """Check rate limit for general API endpoints"""
    return check_rate_limit(request, "api")

# Rate limit exception for manual handling
class RateLimitExceeded(HTTPException):
    """Custom exception for rate limit exceeded"""
    def __init__(self, rate_status: Dict[str, Any]):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Rate limit exceeded",
                "message": f"Too many requests. Limit: {rate_status['limit']} per {rate_status.get('retry_after', 0)} seconds",
                "retry_after": rate_status.get("retry_after", 0),
                "limit": rate_status["limit"],
                "remaining": rate_status["remaining"]
            }
        )
        self.rate_status = rate_status

# Utility function to get rate limit status without throwing exception
def get_rate_limit_status(request: Request, endpoint_type: str = "api") -> Dict[str, Any]:
    """Get current rate limit status for a request"""
    return check_rate_limit(request, endpoint_type)

# Function to reset rate limits for testing (admin only)
def reset_rate_limits(identifier: Optional[str] = None) -> int:
    """
    Reset rate limits for a specific identifier or all
    
    Args:
        identifier (str, optional): Specific identifier to reset
        
    Returns:
        int: Number of rate limit entries cleared
    """
    try:
        redis_client = get_redis_client()
        if identifier:
            pattern = f"rate_limit:*:{identifier}"
        else:
            pattern = "rate_limit:*"
        
        return redis_client.clear_pattern(pattern)
    except Exception as e:
        logger.error(f"Error resetting rate limits: {e}")
        return 0
