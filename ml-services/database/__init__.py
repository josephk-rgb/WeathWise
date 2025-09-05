"""Database configuration and connection management for WeathWise ML Services."""

from .mongodb import (
    connect_mongodb, 
    disconnect_mongodb,
    get_mongo_client, 
    get_database, 
    mongodb_connected,
    get_collection,
    Collections
)
from .redis_client import (
    connect_redis,
    disconnect_redis,
    get_redis_client, 
    redis_connected,
    cache_get,
    cache_set,
    cache_delete,
    cache_exists,
    generate_cache_key,
    CacheKeys
)
from .models import (
    MLPrediction, 
    ConversationHistory, 
    UserPreferences,
    PortfolioAnalysisResult,
    MarketPredictionResult,
    RiskAssessmentResult
)

__all__ = [
    # MongoDB
    "connect_mongodb",
    "disconnect_mongodb", 
    "get_mongo_client",
    "get_database", 
    "mongodb_connected",
    "get_collection",
    "Collections",
    # Redis
    "connect_redis",
    "disconnect_redis",
    "get_redis_client",
    "redis_connected", 
    "cache_get",
    "cache_set",
    "cache_delete",
    "cache_exists",
    "generate_cache_key",
    "CacheKeys",
    # Models
    "MLPrediction",
    "ConversationHistory", 
    "UserPreferences",
    "PortfolioAnalysisResult",
    "MarketPredictionResult",
    "RiskAssessmentResult"
]
