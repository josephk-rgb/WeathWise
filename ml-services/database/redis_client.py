"""Redis connection and utilities for WeathWise ML Services."""

import os
import json
import logging
from typing import Optional, Any, Dict
import redis.asyncio as redis

logger = logging.getLogger(__name__)

# Global Redis client
_redis_client: Optional[redis.Redis] = None

async def connect_redis() -> redis.Redis:
    """Connect to Redis and return the client."""
    global _redis_client
    
    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        
        try:
            _redis_client = redis.from_url(
                redis_url, 
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # Test the connection
            await _redis_client.ping()
            logger.info(f"✅ Connected to Redis: {redis_url}")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to Redis: {e}")
            # Don't raise exception - Redis is optional for caching
            _redis_client = None
    
    return _redis_client

async def disconnect_redis():
    """Disconnect from Redis."""
    global _redis_client
    
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
        logger.info("✅ Disconnected from Redis")

def get_redis_client() -> Optional[redis.Redis]:
    """Get the current Redis client."""
    return _redis_client

async def redis_connected() -> bool:
    """Check if Redis is connected and ready."""
    try:
        if _redis_client is None:
            return False
        
        await _redis_client.ping()
        return True
    except Exception:
        return False

# Cache utilities
class CacheKeys:
    """Cache key constants."""
    ML_CHAT_RESPONSE = "ml:chat:response:{hash}"
    PORTFOLIO_ANALYSIS = "ml:portfolio:{user_id}:{hash}"
    MARKET_PREDICTION = "ml:market:{symbol}:{timeframe}"
    RISK_ASSESSMENT = "ml:risk:{user_id}:{hash}"
    OLLAMA_MODEL_LIST = "ml:ollama:models"

async def cache_get(key: str) -> Optional[Any]:
    """Get a value from cache."""
    if not _redis_client:
        return None
    
    try:
        value = await _redis_client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        logger.warning(f"Cache get error for key {key}: {e}")
        return None

async def cache_set(key: str, value: Any, ttl: int = 3600) -> bool:
    """Set a value in cache with TTL."""
    if not _redis_client:
        return False
    
    try:
        serialized_value = json.dumps(value, default=str)
        await _redis_client.setex(key, ttl, serialized_value)
        return True
    except Exception as e:
        logger.warning(f"Cache set error for key {key}: {e}")
        return False

async def cache_delete(key: str) -> bool:
    """Delete a key from cache."""
    if not _redis_client:
        return False
    
    try:
        await _redis_client.delete(key)
        return True
    except Exception as e:
        logger.warning(f"Cache delete error for key {key}: {e}")
        return False

async def cache_exists(key: str) -> bool:
    """Check if a key exists in cache."""
    if not _redis_client:
        return False
    
    try:
        return bool(await _redis_client.exists(key))
    except Exception as e:
        logger.warning(f"Cache exists error for key {key}: {e}")
        return False

def generate_cache_key(pattern: str, **kwargs) -> str:
    """Generate a cache key from a pattern and parameters."""
    return pattern.format(**kwargs)
