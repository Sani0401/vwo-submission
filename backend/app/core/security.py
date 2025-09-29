"""
Authentication and Authorization system
Handles user authentication, JWT tokens, and password management
"""

import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.models.schemas import User, UserRole, UserCreate, UserLogin, UserResponse
from app.core.database import get_mongodb_client
from app.core.logging import get_logging_service, LogLevel, LogCategory, LogAction

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token
security = HTTPBearer()

class AuthManager:
    """Handles authentication and authorization operations"""
    
    def __init__(self):
        self.mongodb_client = get_mongodb_client()
        if self.mongodb_client.db is not None:
            self.users_collection = self.mongodb_client.db['users']
        else:
            self.users_collection = None
    
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
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None
    
    def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user"""
        try:
            # Check if user already exists
            existing_user = self.users_collection.find_one({"email": user_data.email})
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            
            # Hash password
            password_hash = self.hash_password(user_data.password)
            
            # Create user document
            user_doc = {
                "name": user_data.name,
                "email": user_data.email,
                "password_hash": password_hash,
                "role": user_data.role,
                "profile": user_data.profile.dict(),
                "account": {
                    "status": "active",
                    "member_since": datetime.utcnow(),
                    "last_login": None,
                    "login_streak": 0,
                    "documents_uploaded_count": 0,
                    "analyses_completed_count": 0,
                    "storage_used_mb": 0.0
                },
                "security": {
                    "password_last_changed": datetime.utcnow(),
                    "two_factor_enabled": False,
                    "login_history": []
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert user
            result = self.users_collection.insert_one(user_doc)
            user_doc["_id"] = result.inserted_id
            
            # Log user creation
            logging_service = get_logging_service()
            logging_service.log_activity(
                level=LogLevel.INFO,
                category=LogCategory.USER_MANAGEMENT,
                action=LogAction.USER_CREATE,
                message=f"New user created: {user_data.email}",
                user_id=str(user_doc["_id"]),
                resource_type="user",
                resource_id=str(user_doc["_id"]),
                details={
                    "email": user_data.email,
                    "name": user_data.name,
                    "role": user_data.role.value
                }
            )
            
            # Return user response (without password)
            return UserResponse(
                id=str(user_doc["_id"]),
                name=user_doc["name"],
                email=user_doc["email"],
                role=user_doc["role"],
                profile=user_doc["profile"],
                account=user_doc["account"],
                created_at=user_doc["created_at"],
                updated_at=user_doc["updated_at"]
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
            user_doc = self.users_collection.find_one({"email": email})
            if not user_doc:
                return None
            
            if not self.verify_password(password, user_doc["password_hash"]):
                return None
            
            # Update last login
            self.users_collection.update_one(
                {"_id": user_doc["_id"]},
                {
                    "$set": {
                        "account.last_login": datetime.utcnow(),
                        "account.login_streak": user_doc["account"]["login_streak"] + 1,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Add to login history
            login_entry = {
                "device": "Unknown",  # Could be extracted from request headers
                "ip": "Unknown",      # Could be extracted from request
                "location": "Unknown", # Could be geolocated
                "timestamp": datetime.utcnow()
            }
            
            self.users_collection.update_one(
                {"_id": user_doc["_id"]},
                {
                    "$push": {"security.login_history": login_entry},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            # Log successful authentication
            logging_service = get_logging_service()
            logging_service.log_activity(
                level=LogLevel.INFO,
                category=LogCategory.AUTHENTICATION,
                action=LogAction.USER_LOGIN,
                message=f"User successfully authenticated: {email}",
                user_id=str(user_doc["_id"]),
                resource_type="user",
                resource_id=str(user_doc["_id"]),
                details={
                    "email": email,
                    "login_streak": user_doc["account"]["login_streak"] + 1
                }
            )
            
            return UserResponse(
                id=str(user_doc["_id"]),
                name=user_doc["name"],
                email=user_doc["email"],
                role=user_doc["role"],
                profile=user_doc["profile"],
                account=user_doc["account"],
                created_at=user_doc["created_at"],
                updated_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error authenticating user: {e}")
            return None
    
    def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        """Get user by ID"""
        try:
            from bson import ObjectId
            user_doc = self.users_collection.find_one({"_id": ObjectId(user_id)})
            if not user_doc:
                return None
            
            return UserResponse(
                id=str(user_doc["_id"]),
                name=user_doc["name"],
                email=user_doc["email"],
                role=user_doc["role"],
                profile=user_doc["profile"],
                account=user_doc["account"],
                created_at=user_doc["created_at"],
                updated_at=user_doc["updated_at"]
            )
            
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
    
    def get_user_by_email(self, email: str) -> Optional[UserResponse]:
        """Get user by email"""
        try:
            user_doc = self.users_collection.find_one({"email": email})
            if not user_doc:
                return None
            
            return UserResponse(
                id=str(user_doc["_id"]),
                name=user_doc["name"],
                email=user_doc["email"],
                role=user_doc["role"],
                profile=user_doc["profile"],
                account=user_doc["account"],
                created_at=user_doc["created_at"],
                updated_at=user_doc["updated_at"]
            )
            
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None
    
    def update_user(self, user_id: str, update_data: Dict[str, Any]) -> Optional[UserResponse]:
        """Update user information"""
        try:
            from bson import ObjectId
            update_data["updated_at"] = datetime.utcnow()
            
            result = self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                return None
            
            return self.get_user_by_id(user_id)
            
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            return None
    
    def delete_user(self, user_id: str) -> bool:
        """Delete a user"""
        try:
            from bson import ObjectId
            result = self.users_collection.delete_one({"_id": ObjectId(user_id)})
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False
    
    def get_all_users(self, skip: int = 0, limit: int = 100) -> list:
        """Get all users with pagination"""
        try:
            cursor = self.users_collection.find().skip(skip).limit(limit)
            users = []
            
            for user_doc in cursor:
                users.append(UserResponse(
                    id=str(user_doc["_id"]),
                    name=user_doc["name"],
                    email=user_doc["email"],
                    role=user_doc["role"],
                    profile=user_doc["profile"],
                    account=user_doc["account"],
                    created_at=user_doc["created_at"],
                    updated_at=user_doc["updated_at"]
                ))
            
            return users
            
        except Exception as e:
            logger.error(f"Error getting all users: {e}")
            return []

# Global auth manager instance
auth_manager = AuthManager()

# Dependency functions
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserResponse:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = auth_manager.verify_token(token)
        if payload is None:
            raise credentials_exception
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        user = auth_manager.get_user_by_id(user_id)
        if user is None:
            raise credentials_exception
        
        return user
        
    except Exception:
        raise credentials_exception

async def get_current_admin_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Get current user and verify they are an admin"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

# Authentication endpoints helper functions
def create_token_response(user: UserResponse) -> Dict[str, Any]:
    """Create a token response for successful authentication"""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_manager.create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user
    }
