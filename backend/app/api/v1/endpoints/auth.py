"""
Authentication Router
Handles user authentication and authorization endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer

from app.models.schemas import UserCreate, UserLogin, UserResponse, UserRole
from app.services.auth_service import AuthService
from app.core.logging import get_logging_service
from app.models.schemas import LogLevel, LogCategory, LogAction
from app.middleware.rate_limit_middleware import RateLimitExceeded

router = APIRouter()
security = HTTPBearer()


@router.post("/register", response_model=dict)
def register_user(user_data: UserCreate, request: Request):
    """Register a new user"""
    try:
        auth_service = AuthService()
        user = auth_service.create_user(user_data)
        
        # Log user registration
        logging_service = get_logging_service()
        logging_service.log_activity(
            level=LogLevel.INFO,
            category=LogCategory.USER_MANAGEMENT,
            action=LogAction.USER_CREATE,
            message=f"New user registered: {user_data.email}",
            user_id=user.id,
            resource_type="user",
            resource_id=user.id,
            details={"email": user_data.email, "role": user_data.role.value}
        )
        
        return {
            "status": "success",
            "message": "User created successfully",
            "user": user
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )


@router.post("/login", response_model=dict)
def login_user(login_data: UserLogin, request: Request):
    """Authenticate user and return access token"""
    try:
        auth_service = AuthService()
        user = auth_service.authenticate_user(login_data.email, login_data.password)
        
        if not user:
            # Log failed login attempt
            logging_service = get_logging_service()
            logging_service.log_activity(
                level=LogLevel.WARNING,
                category=LogCategory.AUTHENTICATION,
                action=LogAction.USER_LOGIN,
                message=f"Failed login attempt for email: {login_data.email}",
                details={"email": login_data.email, "success": False}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Create token response
        token_response = auth_service.create_token_response(user)
        
        # Log successful login
        logging_service = get_logging_service()
        logging_service.log_activity(
            level=LogLevel.INFO,
            category=LogCategory.AUTHENTICATION,
            action=LogAction.USER_LOGIN,
            message=f"User successfully logged in: {login_data.email}",
            user_id=user.id,
            details={"email": login_data.email, "success": True}
        )
        
        return token_response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error authenticating user: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: UserResponse = Depends(AuthService.get_current_user)):
    """Get current user information"""
    return current_user


@router.post("/logout")
def logout_user(current_user: UserResponse = Depends(AuthService.get_current_user)):
    """Logout user (invalidate token)"""
    try:
        # Log logout
        logging_service = get_logging_service()
        logging_service.log_activity(
            level=LogLevel.INFO,
            category=LogCategory.AUTHENTICATION,
            action=LogAction.USER_LOGOUT,
            message=f"User logged out: {current_user.email}",
            user_id=current_user.id
        )
        
        return {"status": "success", "message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during logout: {str(e)}"
        )
