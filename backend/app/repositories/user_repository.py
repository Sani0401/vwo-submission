"""
User Repository
Handles user data operations with MongoDB
"""

import logging
from datetime import datetime
from typing import Optional
from bson import ObjectId

from app.models.schemas import User, UserCreate, UserRole, UserProfile, UserAccount, UserSecurity
from app.repositories.connection import get_sync_database

logger = logging.getLogger(__name__)


class UserRepository:
    """Repository for user data operations"""
    
    def __init__(self):
        self.db = get_sync_database()
        self.collection = self.db['users']
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            user_doc = self.collection.find_one({"_id": ObjectId(user_id)})
            if not user_doc:
                return None
            
            return self._document_to_user(user_doc)
            
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        try:
            user_doc = self.collection.find_one({"email": email})
            if not user_doc:
                return None
            
            return self._document_to_user(user_doc)
            
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None
    
    def create_user(self, user_data: UserCreate, password_hash: str) -> User:
        """Create a new user"""
        try:
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
            
            result = self.collection.insert_one(user_doc)
            user_doc["_id"] = result.inserted_id
            
            return self._document_to_user(user_doc)
            
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise
    
    def update_last_login(self, user_id: ObjectId):
        """Update user's last login timestamp"""
        try:
            self.collection.update_one(
                {"_id": user_id},
                {
                    "$set": {
                        "account.last_login": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    },
                    "$inc": {"account.login_streak": 1}
                }
            )
        except Exception as e:
            logger.error(f"Error updating last login: {e}")
    
    def update_user(self, user_id: str, update_data: dict) -> Optional[User]:
        """Update user information"""
        try:
            update_data["updated_at"] = datetime.utcnow()
            
            result = self.collection.update_one(
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
            result = self.collection.delete_one({"_id": ObjectId(user_id)})
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False
    
    def get_all_users(self, skip: int = 0, limit: int = 100) -> list:
        """Get all users with pagination"""
        try:
            cursor = self.collection.find().skip(skip).limit(limit)
            users = []
            
            for user_doc in cursor:
                users.append(self._document_to_user(user_doc))
            
            return users
            
        except Exception as e:
            logger.error(f"Error getting all users: {e}")
            return []
    
    def _document_to_user(self, doc: dict) -> User:
        """Convert MongoDB document to User model"""
        return User(
            id=doc["_id"],
            name=doc["name"],
            email=doc["email"],
            password_hash=doc["password_hash"],
            role=doc["role"],
            profile=UserProfile(**doc["profile"]),
            account=UserAccount(**doc["account"]),
            security=UserSecurity(**doc["security"]),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"]
        )
