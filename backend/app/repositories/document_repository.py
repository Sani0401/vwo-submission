"""
Document Repository
Handles document data operations with MongoDB
"""

import logging
import hashlib
from datetime import datetime
from typing import List, Optional
from bson import ObjectId

from app.models.schemas import Document, DocumentResponse, DocumentStatus, DocumentCreate, DocumentMetadata
from app.repositories.connection import get_sync_database

logger = logging.getLogger(__name__)


class DocumentRepository:
    """Repository for document data operations"""
    
    def __init__(self):
        self.db = get_sync_database()
        self.collection = self.db['documents']
        self.analysis_collection = self.db['analysis_results']
    
    def calculate_file_checksum(self, file_path: str) -> str:
        """Calculate SHA256 checksum of a file"""
        try:
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return f"sha256:{sha256_hash.hexdigest()}"
        except Exception as e:
            logger.error(f"Error calculating checksum: {e}")
            return ""
    
    def create_document(
        self,
        user_id: str,
        file_path: str,
        file_name: str,
        file_size_mb: float,
        file_format: str,
        category: Optional[str] = None,
        tags: List[str] = None
    ) -> DocumentResponse:
        """Create a new document record"""
        try:
            # Calculate checksum
            checksum = self.calculate_file_checksum(file_path)
            
            # Check for duplicate documents (same user, same checksum)
            existing_document = self.collection.find_one({
                "user_id": ObjectId(user_id),
                "checksum": checksum
            })
            
            if existing_document:
                logger.warning(f"Duplicate document detected for user {user_id} with checksum {checksum}")
                return self._document_to_response(existing_document)
            
            # Create document
            document_data = {
                "user_id": ObjectId(user_id),
                "file_name": file_name,
                "file_path": file_path,
                "file_size_mb": file_size_mb,
                "file_format": file_format,
                "checksum": checksum,
                "category": category,
                "tags": tags or [],
                "status": DocumentStatus.UPLOADING,
                "progress": 0,
                "processing_duration_sec": None,
                "metadata": {
                    "upload_date": datetime.utcnow(),
                    "last_modified": datetime.utcnow()
                },
                "analysis_ids": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert document
            result = self.collection.insert_one(document_data)
            document_data["_id"] = result.inserted_id
            
            return self._document_to_response(document_data)
            
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            raise
    
    def get_user_documents(self, user_id: str, skip: int = 0, limit: int = 50) -> List[DocumentResponse]:
        """Get documents for a specific user"""
        try:
            cursor = self.collection.find(
                {"user_id": ObjectId(user_id)}
            ).sort("created_at", -1).skip(skip).limit(limit)
            
            documents = []
            for doc in cursor:
                documents.append(self._document_to_response(doc))
            
            return documents
            
        except Exception as e:
            logger.error(f"Error getting user documents: {e}")
            return []
    
    def get_document_by_id(self, document_id: str) -> Optional[DocumentResponse]:
        """Get a document by its ID"""
        try:
            document_doc = self.collection.find_one({"_id": ObjectId(document_id)})
            if not document_doc:
                return None
            
            return self._document_to_response(document_doc)
            
        except Exception as e:
            logger.error(f"Error getting document by ID: {e}")
            return None
    
    def update_document_status(self, document_id: str, status: str, progress: int = None, processing_duration: int = None) -> bool:
        """Update document processing status"""
        try:
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow()
            }
            
            if progress is not None:
                update_data["progress"] = progress
            
            if processing_duration is not None:
                update_data["processing_duration_sec"] = processing_duration
            
            result = self.collection.update_one(
                {"_id": ObjectId(document_id)},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error updating document status: {e}")
            return False
    
    def delete_document(self, document_id: str) -> bool:
        """Delete a document from the database"""
        try:
            result = self.collection.delete_one({"_id": ObjectId(document_id)})
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            return False
    
    def delete_analyses_by_document_id(self, document_id: str) -> int:
        """Delete all analyses associated with a document"""
        try:
            result = self.analysis_collection.delete_many({"document_id": ObjectId(document_id)})
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Error deleting analyses: {e}")
            return 0
    
    def _document_to_response(self, doc: dict) -> DocumentResponse:
        """Convert MongoDB document to DocumentResponse"""
        return DocumentResponse(
            id=str(doc["_id"]),
            user_id=str(doc["user_id"]),
            file_name=doc["file_name"],
            file_path=doc["file_path"],
            file_size_mb=doc["file_size_mb"],
            file_format=doc["file_format"],
            category=doc.get("category"),
            tags=doc.get("tags", []),
            status=doc["status"],
            progress=doc["progress"],
            processing_duration_sec=doc.get("processing_duration_sec"),
            analysis_ids=[str(aid) for aid in doc.get("analysis_ids", [])],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"]
        )
