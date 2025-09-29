"""
Authentication Service
Handles user authentication, authorization, and token management
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.models.schemas import User, UserCreate, UserLogin, UserResponse, UserRole
from app.repositories.user_repository import UserRepository
from app.config import get_settings

logger = logging.getLogger(__name__)

# Security configuration
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


class AuthService:
    """Service for handling authentication and authorization"""
    
    def __init__(self):
        self.user_repository = UserRepository()
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except JWTError:
            return None
    
    def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user"""
        try:
            # Check if user already exists
            existing_user = self.user_repository.get_user_by_email(user_data.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            
            # Hash password
            password_hash = self.hash_password(user_data.password)
            
            # Create user
            user = self.user_repository.create_user(user_data, password_hash)
            
            return UserResponse(
                id=str(user.id),
                name=user.name,
                email=user.email,
                role=user.role,
                profile=user.profile,
                account=user.account,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error creating user"
            )
    
    def authenticate_user(self, email: str, password: str) -> Optional[UserResponse]:
        """Authenticate a user with email and password"""
        try:
            user = self.user_repository.get_user_by_email(email)
            if not user:
                return None
            
            if not self.verify_password(password, user.password_hash):
                return None
            
            # Update last login
            self.user_repository.update_last_login(user.id)
            
            return UserResponse(
                id=str(user.id),
                name=user.name,
                email=user.email,
                role=user.role,
                profile=user.profile,
                account=user.account,
                created_at=user.created_at,
                updated_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error authenticating user: {e}")
            return None
    
    def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        """Get user by ID"""
        try:
            user = self.user_repository.get_user_by_id(user_id)
            if not user:
                return None
            
            return UserResponse(
                id=str(user.id),
                name=user.name,
                email=user.email,
                role=user.role,
                profile=user.profile,
                account=user.account,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
            
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
    
    def get_all_users(self, skip: int = 0, limit: int = 100) -> list[UserResponse]:
        """Get all users with pagination"""
        try:
            users = self.user_repository.get_all_users(skip, limit)
            return [
                UserResponse(
                    id=str(user.id),
                    name=user.name,
                    email=user.email,
                    role=user.role,
                    profile=user.profile,
                    account=user.account,
                    created_at=user.created_at,
                    updated_at=user.updated_at
                )
                for user in users
            ]
            
        except Exception as e:
            logger.error(f"Error getting all users: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error retrieving users"
            )
    
    def update_user(self, user_id: str, update_data: dict) -> Optional[UserResponse]:
        """Update user information"""
        try:
            user = self.user_repository.update_user(user_id, update_data)
            if not user:
                return None
            
            return UserResponse(
                id=str(user.id),
                name=user.name,
                email=user.email,
                role=user.role,
                profile=user.profile,
                account=user.account,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
            
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            return None
    
    def delete_user(self, user_id: str) -> bool:
        """Delete a user"""
        try:
            return self.user_repository.delete_user(user_id)
            
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False
    
    def create_token_response(self, user: UserResponse) -> Dict[str, Any]:
        """Create a token response for successful authentication"""
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={"sub": user.id}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user
        }
    
    @staticmethod
    def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserResponse:
        """Get current authenticated user from JWT token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            token = credentials.credentials
            auth_service = AuthService()
            payload = auth_service.verify_token(token)
            if payload is None:
                raise credentials_exception
            
            user_id: str = payload.get("sub")
            if user_id is None:
                raise credentials_exception
            
            user = auth_service.get_user_by_id(user_id)
            if user is None:
                raise credentials_exception
            
            return user
            
        except Exception:
            raise credentials_exception
    
    @staticmethod
    def get_current_admin_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
        """Get current user and verify they are an admin"""
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
