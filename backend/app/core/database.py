"""
MongoDB Client for Financial Document Analyzer
Handles database operations for storing and retrieving analysis results
"""

import os
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MongoDBClient:
    """MongoDB client for financial document analysis storage"""
    
    def __init__(self, connection_string: str = None):
        """
        Initialize MongoDB client
        
        Args:
            connection_string (str): MongoDB connection string
        """
        self.connection_string = connection_string or os.getenv(
            "MONGODB_CONNECTION_STRING", 
            "mongodb+srv://sani0401:sani0401@cluster0.8qibom8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        )
        self.client = None
        self.db = None
        self.collection = None
        self.connect()
    
    def connect(self):
        """Establish connection to MongoDB"""
        try:
            logger.info(f"Attempting to connect to MongoDB: {self.connection_string[:50]}...")
            self.client = MongoClient(
                self.connection_string,
                serverSelectionTimeoutMS=10000,  # 10 sec
                connectTimeoutMS=15000,          # 15 sec
                socketTimeoutMS=30000,           # 30 sec
                maxPoolSize=50,
                retryWrites=True,
                tls=True,
                tlsAllowInvalidCertificates=True,  # Bypass SSL certificate verification
                tlsAllowInvalidHostnames=True      # Bypass hostname verification
            )
            
            # Test the connection
            self.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
            
            # Get database and collection
            self.db = self.client['financial_analyzer']
            logger.info(f"Database selected: {self.db.name}")
            self.collection = self.db['document_analyses']
            logger.info(f"Collection selected: {self.collection.name}")
            
            # Create indexes for better performance
            self._create_indexes()
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.warning(f"MongoDB connection failed: {e}")
            self.client = None
            self.db = None
            self.collection = None
        except Exception as e:
            logger.warning(f"Unexpected error connecting to MongoDB: {e}")
            self.client = None
            self.db = None
            self.collection = None

    
    def _create_indexes(self):
        """Create database indexes for better performance"""
        try:
            # Index on file_path for quick lookups
            self.collection.create_index("file_path")
            
            # Index on timestamp for time-based queries
            self.collection.create_index("timestamp")
            
            # Index on query for search functionality
            self.collection.create_index("query")
            
            # Compound index for file_path and timestamp
            self.collection.create_index([("file_path", 1), ("timestamp", -1)])
            
            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.warning(f"Could not create indexes: {e}")
    
    def save_analysis(self, analysis_data: Dict[str, Any]) -> str:
        """
        Save document analysis to MongoDB
        
        Args:
            analysis_data (dict): Analysis data to save
            
        Returns:
            str: Document ID of the saved analysis
        """
        try:
            # Add timestamp if not present
            if 'timestamp' not in analysis_data:
                analysis_data['timestamp'] = datetime.utcnow()
            
            # Insert document
            result = self.collection.insert_one(analysis_data)
            logger.info(f"Analysis saved with ID: {result.inserted_id}")
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Error saving analysis: {e}")
            raise
    
    def get_analysis_by_id(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve analysis by ID
        
        Args:
            analysis_id (str): Analysis document ID
            
        Returns:
            dict: Analysis data or None if not found
        """
        try:
            from bson import ObjectId
            result = self.collection.find_one({"_id": ObjectId(analysis_id)})
            if result:
                result['_id'] = str(result['_id'])  # Convert ObjectId to string
            return result
        except Exception as e:
            logger.error(f"Error retrieving analysis by ID: {e}")
            return None
    
    def get_analyses_by_file(self, file_path: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieve analyses for a specific file
        
        Args:
            file_path (str): Path to the file
            limit (int): Maximum number of results to return
            
        Returns:
            list: List of analysis documents
        """
        try:
            cursor = self.collection.find(
                {"file_path": file_path}
            ).sort("timestamp", -1).limit(limit)
            
            results = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])  # Convert ObjectId to string
                results.append(doc)
            
            return results
        except Exception as e:
            logger.error(f"Error retrieving analyses by file: {e}")
            return []
    
    def get_recent_analyses(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Retrieve recent analyses
        
        Args:
            limit (int): Maximum number of results to return
            
        Returns:
            list: List of recent analysis documents
        """
        try:
            cursor = self.collection.find().sort("timestamp", -1).limit(limit)
            
            results = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])  # Convert ObjectId to string
                results.append(doc)
            
            return results
        except Exception as e:
            logger.error(f"Error retrieving recent analyses: {e}")
            return []
    
    def search_analyses(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search analyses by query text
        
        Args:
            query (str): Search query
            limit (int): Maximum number of results to return
            
        Returns:
            list: List of matching analysis documents
        """
        try:
            # Create text search index if it doesn't exist
            try:
                self.collection.create_index([("query", "text"), ("analysis", "text")])
            except:
                pass  # Index might already exist
            
            cursor = self.collection.find(
                {"$text": {"$search": query}}
            ).sort("timestamp", -1).limit(limit)
            
            results = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])  # Convert ObjectId to string
                results.append(doc)
            
            return results
        except Exception as e:
            logger.error(f"Error searching analyses: {e}")
            return []
    
    def delete_analysis(self, analysis_id: str) -> bool:
        """
        Delete analysis by ID
        
        Args:
            analysis_id (str): Analysis document ID
            
        Returns:
            bool: True if deleted, False otherwise
        """
        try:
            from bson import ObjectId
            result = self.collection.delete_one({"_id": ObjectId(analysis_id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting analysis: {e}")
            return False
    
    def get_database_stats(self) -> Dict[str, Any]:
        """
        Get database statistics
        
        Returns:
            dict: Database statistics
        """
        try:
            stats = self.db.command("dbStats")
            collection_stats = self.collection.count_documents({})
            
            return {
                "database_name": stats.get("db", "unknown"),
                "collections": stats.get("collections", 0),
                "documents": collection_stats,
                "data_size": stats.get("dataSize", 0),
                "storage_size": stats.get("storageSize", 0),
                "indexes": stats.get("indexes", 0),
                "index_size": stats.get("indexSize", 0)
            }
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {}
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

# Global MongoDB client instance
mongodb_client = None

def get_mongodb_client() -> MongoDBClient:
    """Get or create MongoDB client instance"""
    global mongodb_client
    if mongodb_client is None:
        mongodb_client = MongoDBClient()
    return mongodb_client

def save_document_analysis(
    file_path: str,
    query: str,
    analysis: str,
    file_processed: str = None,
    status: str = "success",
    metadata: Dict[str, Any] = None
) -> str:
    """
    Save document analysis to MongoDB
    
    Args:
        file_path (str): Path to the analyzed file
        query (str): User query
        analysis (str): Analysis result
        file_processed (str): Name of processed file
        status (str): Analysis status
        metadata (dict): Additional metadata
        
    Returns:
        str: Document ID of saved analysis
    """
    try:
        client = get_mongodb_client()
        
        analysis_data = {
            "file_path": file_path,
            "query": query,
            "analysis": analysis,
            "file_processed": file_processed or os.path.basename(file_path),
            "status": status,
            "timestamp": datetime.utcnow(),
            "metadata": metadata or {}
        }
        
        return client.save_analysis(analysis_data)
    except Exception as e:
        logger.error(f"Error saving document analysis: {e}")
        raise

def get_document_analysis_history(file_path: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Get analysis history for a document
    
    Args:
        file_path (str): Path to the file
        limit (int): Maximum number of results
        
    Returns:
        list: List of analysis documents
    """
    try:
        client = get_mongodb_client()
        return client.get_analyses_by_file(file_path, limit)
    except Exception as e:
        logger.error(f"Error getting document analysis history: {e}")
        return []
