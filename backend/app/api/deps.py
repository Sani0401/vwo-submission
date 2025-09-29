"""
API Dependencies
Common dependencies used across API endpoints
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import get_current_user, get_current_admin_user
from app.models.schemas import UserResponse

# Security scheme
security = HTTPBearer()

# Common dependencies
def get_current_user_dependency() -> UserResponse:
    """Get current authenticated user"""
    return Depends(get_current_user)

def get_current_admin_user_dependency() -> UserResponse:
    """Get current authenticated admin user"""
    return Depends(get_current_admin_user)
