"""
Redis Client for Financial Document Analyzer
Handles caching operations for improved performance and scalability
"""

import os
import json
import pickle
from typing import Any, Optional, Union, List
from datetime import timedelta
import logging

try:
    import redis
    from redis.exceptions import ConnectionError, TimeoutError
except ImportError:
    redis = None

# Set up logging
logger = logging.getLogger(__name__)

class RedisClient:
    """Redis client for caching operations"""
    
    def __init__(self, connection_string: str = None):
        """
        Initialize Redis client
        
        Args:
            connection_string (str): Redis connection string
        """
        self.connection_string = connection_string or os.getenv(
            "REDIS_URL", 
            "redis://localhost:6379/0"
        )
        self.client = None
        self.is_available = False
        self.connect()
    
    def connect(self):
        """Establish connection to Redis"""
        if redis is None:
            logger.warning("Redis package not installed. Caching will be disabled.")
            return
            
        try:
            logger.info(f"Attempting to connect to Redis: {self.connection_string}")
            self.client = redis.from_url(
                self.connection_string,
                decode_responses=False,  # We'll handle encoding ourselves
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test the connection
            self.client.ping()
            self.is_available = True
            logger.info("Successfully connected to Redis")
            
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis connection failed: {e}")
            self.client = None
            self.is_available = False
        except Exception as e:
            logger.warning(f"Unexpected error connecting to Redis: {e}")
            self.client = None
            self.is_available = False
    
    def _serialize(self, data: Any) -> bytes:
        """Serialize data for Redis storage"""
        try:
            # Try JSON first for simple data types
            if isinstance(data, (str, int, float, bool, list, dict, type(None))):
                return json.dumps(data).encode('utf-8')
            else:
                # Use pickle for complex objects
                return pickle.dumps(data)
        except Exception as e:
            logger.error(f"Error serializing data: {e}")
            return pickle.dumps(data)
    
    def _deserialize(self, data: bytes) -> Any:
        """Deserialize data from Redis"""
        try:
            # Try JSON first
            decoded = data.decode('utf-8')
            return json.loads(decoded)
        except (UnicodeDecodeError, json.JSONDecodeError):
            try:
                # Fall back to pickle
                return pickle.loads(data)
            except Exception as e:
                logger.error(f"Error deserializing data: {e}")
                return None
    
    def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """
        Set a key-value pair in Redis
        
        Args:
            key (str): Cache key
            value (Any): Value to cache
            expire (int, optional): Expiration time in seconds
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.is_available or not self.client:
            return False
            
        try:
            serialized_value = self._serialize(value)
            if expire:
                result = self.client.setex(key, expire, serialized_value)
            else:
                result = self.client.set(key, serialized_value)
            return bool(result)
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from Redis
        
        Args:
            key (str): Cache key
            
        Returns:
            Any: Cached value or None if not found
        """
        if not self.is_available or not self.client:
            return None
            
        try:
            data = self.client.get(key)
            if data is None:
                return None
            return self._deserialize(data)
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """
        Delete a key from Redis
        
        Args:
            key (str): Cache key to delete
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.is_available or not self.client:
            return False
            
        try:
            result = self.client.delete(key)
            return bool(result)
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """
        Check if a key exists in Redis
        
        Args:
            key (str): Cache key to check
            
        Returns:
            bool: True if key exists, False otherwise
        """
        if not self.is_available or not self.client:
            return False
            
        try:
            return bool(self.client.exists(key))
        except Exception as e:
            logger.error(f"Error checking cache key {key}: {e}")
            return False
    
    def expire(self, key: str, seconds: int) -> bool:
        """
        Set expiration time for a key
        
        Args:
            key (str): Cache key
            seconds (int): Expiration time in seconds
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.is_available or not self.client:
            return False
            
        try:
            return bool(self.client.expire(key, seconds))
        except Exception as e:
            logger.error(f"Error setting expiration for key {key}: {e}")
            return False
    
    def get_many(self, keys: List[str]) -> dict:
        """
        Get multiple values from Redis
        
        Args:
            keys (List[str]): List of cache keys
            
        Returns:
            dict: Dictionary of key-value pairs
        """
        if not self.is_available or not self.client:
            return {}
            
        try:
            values = self.client.mget(keys)
            result = {}
            for key, value in zip(keys, values):
                if value is not None:
                    result[key] = self._deserialize(value)
            return result
        except Exception as e:
            logger.error(f"Error getting multiple cache keys: {e}")
            return {}
    
    def set_many(self, mapping: dict, expire: Optional[int] = None) -> bool:
        """
        Set multiple key-value pairs in Redis
        
        Args:
            mapping (dict): Dictionary of key-value pairs
            expire (int, optional): Expiration time in seconds
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.is_available or not self.client:
            return False
            
        try:
            serialized_mapping = {
                key: self._serialize(value) 
                for key, value in mapping.items()
            }
            
            if expire:
                # Use pipeline for atomic operations with expiration
                pipe = self.client.pipeline()
                for key, value in serialized_mapping.items():
                    pipe.setex(key, expire, value)
                pipe.execute()
            else:
                self.client.mset(serialized_mapping)
            return True
        except Exception as e:
            logger.error(f"Error setting multiple cache keys: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """
        Clear all keys matching a pattern
        
        Args:
            pattern (str): Redis key pattern (e.g., "user:*")
            
        Returns:
            int: Number of keys deleted
        """
        if not self.is_available or not self.client:
            return 0
            
        try:
            keys = self.client.keys(pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Error clearing cache pattern {pattern}: {e}")
            return 0
    
    def get_stats(self) -> dict:
        """
        Get Redis server statistics
        
        Returns:
            dict: Redis server info and statistics
        """
        if not self.is_available or not self.client:
            return {"status": "unavailable"}
            
        try:
            info = self.client.info()
            return {
                "status": "connected",
                "version": info.get("redis_version"),
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_commands_processed": info.get("total_commands_processed"),
                "keyspace": info.get("db0", {}).get("keys", 0)
            }
        except Exception as e:
            logger.error(f"Error getting Redis stats: {e}")
            return {"status": "error", "error": str(e)}

# Global Redis client instance
redis_client = None

def get_redis_client() -> RedisClient:
    """Get or create Redis client instance"""
    global redis_client
    if redis_client is None:
        redis_client = RedisClient()
    return redis_client

def init_redis():
    """Initialize Redis connection"""
    try:
        client = get_redis_client()
        client.connect()
        logger.info("Redis connection initialized successfully")
    except Exception as e:
        logger.warning(f"Redis initialization failed: {e}")

def close_redis():
    """Close Redis connection"""
    try:
        global redis_client
        if redis_client:
            redis_client.client.close()
            redis_client = None
        logger.info("Redis connection closed")
    except Exception as e:
        logger.warning(f"Redis shutdown failed: {e}")

# Cache decorator for functions
def cache_result(expire: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results
    
    Args:
        expire (int): Cache expiration time in seconds (default: 5 minutes)
        key_prefix (str): Prefix for cache keys
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            redis_client = get_redis_client()
            cached_result = redis_client.get(cache_key)
            
            if cached_result is not None:
                # Cache hit
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            redis_client.set(cache_key, result, expire)
            # Result cached
            
            return result
        return wrapper
    return decorator

# Convenience functions for common caching operations
def cache_user_data(user_id: str, data: Any, expire: int = 1800) -> bool:
    """Cache user-specific data"""
    redis_client = get_redis_client()
    return redis_client.set(f"user:{user_id}", data, expire)

def get_cached_user_data(user_id: str) -> Optional[Any]:
    """Get cached user data"""
    redis_client = get_redis_client()
    return redis_client.get(f"user:{user_id}")

def cache_document_analysis(document_id: str, analysis: Any, expire: int = 3600) -> bool:
    """Cache document analysis results"""
    redis_client = get_redis_client()
    return redis_client.set(f"analysis:{document_id}", analysis, expire)

def get_cached_analysis(document_id: str) -> Optional[Any]:
    """Get cached document analysis"""
    redis_client = get_redis_client()
    return redis_client.get(f"analysis:{document_id}")

def cache_api_response(endpoint: str, params: str, response: Any, expire: int = 300) -> bool:
    """Cache API responses"""
    redis_client = get_redis_client()
    cache_key = f"api:{endpoint}:{hash(params)}"
    return redis_client.set(cache_key, response, expire)

def get_cached_api_response(endpoint: str, params: str) -> Optional[Any]:
    """Get cached API response"""
    redis_client = get_redis_client()
    cache_key = f"api:{endpoint}:{hash(params)}"
    return redis_client.get(cache_key)

def clear_user_cache(user_id: str) -> int:
    """Clear all cache entries for a user"""
    redis_client = get_redis_client()
    return redis_client.clear_pattern(f"user:{user_id}*")

def clear_analysis_cache(document_id: str) -> int:
    """Clear cache entries for a document analysis"""
    redis_client = get_redis_client()
    return redis_client.clear_pattern(f"analysis:{document_id}*")
