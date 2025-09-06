"""Database service utilities for WeathWise ML Services."""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import hashlib
import json

from database import (
    get_collection, Collections, 
    cache_get, cache_set, CacheKeys,
    MLPrediction, ConversationHistory, UserPreferences
)

logger = logging.getLogger(__name__)

class DatabaseService:
    """Service class for database operations."""
    
    @staticmethod
    async def save_ml_prediction(
        prediction_type: str,
        input_data: Dict[str, Any],
        prediction_result: Dict[str, Any],
        user_id: Optional[str] = None,
        confidence_score: Optional[float] = None,
        processing_time_ms: Optional[int] = None
    ) -> Optional[str]:
        """Save ML prediction to database."""
        try:
            prediction = MLPrediction(
                user_id=user_id,
                prediction_type=prediction_type,
                input_data=input_data,
                prediction_result=prediction_result,
                confidence_score=confidence_score,
                processing_time_ms=processing_time_ms
            )
            
            collection = get_collection(Collections.ML_PREDICTIONS)
            result = await collection.insert_one(prediction.dict(by_alias=True))
            logger.info(f"✅ Saved ML prediction: {result.inserted_id}")
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"❌ Failed to save ML prediction: {e}")
            return None
    
    @staticmethod
    async def save_conversation(
        user_id: Optional[str],
        session_id: str,
        message_type: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Save conversation message to database."""
        try:
            conversation = ConversationHistory(
                user_id=user_id,
                session_id=session_id,
                message_type=message_type,
                content=content,
                metadata=metadata or {}
            )
            
            collection = get_collection(Collections.CONVERSATION_HISTORY)
            result = await collection.insert_one(conversation.dict(by_alias=True))
            logger.info(f"✅ Saved conversation message: {result.inserted_id}")
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"❌ Failed to save conversation: {e}")
            return None
    
    @staticmethod
    async def get_user_preferences(user_id: str) -> Optional[UserPreferences]:
        """Get user preferences from database."""
        try:
            collection = get_collection(Collections.USER_PREFERENCES)
            data = await collection.find_one({"user_id": user_id})
            
            if data:
                return UserPreferences(**data)
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get user preferences: {e}")
            return None
    
    @staticmethod
    async def save_user_preferences(preferences: UserPreferences) -> bool:
        """Save or update user preferences."""
        try:
            collection = get_collection(Collections.USER_PREFERENCES)
            preferences.updated_at = datetime.utcnow()
            
            result = await collection.replace_one(
                {"user_id": preferences.user_id},
                preferences.dict(by_alias=True),
                upsert=True
            )
            
            logger.info(f"✅ Saved user preferences for user: {preferences.user_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to save user preferences: {e}")
            return False
    
    @staticmethod
    async def get_conversation_history(
        session_id: str, 
        limit: int = 50,
        user_id: Optional[str] = None
    ) -> List[ConversationHistory]:
        """Get conversation history for a session."""
        try:
            collection = get_collection(Collections.CONVERSATION_HISTORY)
            
            query = {"session_id": session_id}
            if user_id:
                query["user_id"] = user_id
            
            cursor = collection.find(query).sort("timestamp", -1).limit(limit)
            conversations = []
            
            async for doc in cursor:
                conversations.append(ConversationHistory(**doc))
            
            return list(reversed(conversations))  # Return in chronological order
            
        except Exception as e:
            logger.error(f"❌ Failed to get conversation history: {e}")
            return []

class CacheService:
    """Service class for caching operations."""
    
    @staticmethod
    def generate_hash(data: Any) -> str:
        """Generate a hash for cache keys."""
        serialized = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(serialized.encode()).hexdigest()[:16]
    
    @staticmethod
    async def cache_chat_response(
        query: str,
        response: Dict[str, Any],
        ttl: int = 3600
    ) -> bool:
        """Cache chat response."""
        try:
            query_hash = CacheService.generate_hash(query)
            cache_key = CacheKeys.ML_CHAT_RESPONSE.format(hash=query_hash)
            return await cache_set(cache_key, response, ttl)
        except Exception as e:
            logger.warning(f"⚠️ Failed to cache chat response: {e}")
            return False
    
    @staticmethod
    async def get_cached_chat_response(query: str) -> Optional[Dict[str, Any]]:
        """Get cached chat response."""
        try:
            query_hash = CacheService.generate_hash(query)
            cache_key = CacheKeys.ML_CHAT_RESPONSE.format(hash=query_hash)
            return await cache_get(cache_key)
        except Exception as e:
            logger.warning(f"⚠️ Failed to get cached chat response: {e}")
            return None
    
    @staticmethod
    async def cache_portfolio_analysis(
        user_id: str,
        portfolio_data: Dict[str, Any],
        analysis_result: Dict[str, Any],
        ttl: int = 1800  # 30 minutes
    ) -> bool:
        """Cache portfolio analysis results."""
        try:
            data_hash = CacheService.generate_hash(portfolio_data)
            cache_key = CacheKeys.PORTFOLIO_ANALYSIS.format(
                user_id=user_id, hash=data_hash
            )
            return await cache_set(cache_key, analysis_result, ttl)
        except Exception as e:
            logger.warning(f"⚠️ Failed to cache portfolio analysis: {e}")
            return False
    
    @staticmethod
    async def get_cached_portfolio_analysis(
        user_id: str,
        portfolio_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Get cached portfolio analysis."""
        try:
            data_hash = CacheService.generate_hash(portfolio_data)
            cache_key = CacheKeys.PORTFOLIO_ANALYSIS.format(
                user_id=user_id, hash=data_hash
            )
            return await cache_get(cache_key)
        except Exception as e:
            logger.warning(f"⚠️ Failed to get cached portfolio analysis: {e}")
            return None
    
    @staticmethod
    async def cache_market_prediction(
        symbol: str,
        timeframe: str,
        prediction_result: Dict[str, Any],
        ttl: int = 900  # 15 minutes
    ) -> bool:
        """Cache market prediction results."""
        try:
            cache_key = CacheKeys.MARKET_PREDICTION.format(
                symbol=symbol, timeframe=timeframe
            )
            return await cache_set(cache_key, prediction_result, ttl)
        except Exception as e:
            logger.warning(f"⚠️ Failed to cache market prediction: {e}")
            return False
    
    @staticmethod
    async def get_cached_market_prediction(
        symbol: str,
        timeframe: str
    ) -> Optional[Dict[str, Any]]:
        """Get cached market prediction."""
        try:
            cache_key = CacheKeys.MARKET_PREDICTION.format(
                symbol=symbol, timeframe=timeframe
            )
            return await cache_get(cache_key)
        except Exception as e:
            logger.warning(f"⚠️ Failed to get cached market prediction: {e}")
            return None
