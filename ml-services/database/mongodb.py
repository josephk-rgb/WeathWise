"""MongoDB connection and utilities for WeathWise ML Services."""

import os
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

# Global MongoDB client
_mongo_client: Optional[AsyncIOMotorClient] = None
_mongo_database: Optional[AsyncIOMotorDatabase] = None

async def connect_mongodb() -> AsyncIOMotorClient:
    """Connect to MongoDB and return the client."""
    global _mongo_client, _mongo_database
    
    if _mongo_client is None:
        mongodb_uri = os.getenv("MONGODB_URI")
        if not mongodb_uri:
            raise ValueError("MONGODB_URI environment variable is not set")
        
        try:
            _mongo_client = AsyncIOMotorClient(mongodb_uri)
            # Test the connection
            await _mongo_client.admin.command('ismaster')
            
            db_name = os.getenv("MONGODB_DB_NAME", "wealthwise")
            _mongo_database = _mongo_client[db_name]
            
            logger.info(f"✅ Connected to MongoDB: {db_name}")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            raise
    
    return _mongo_client

async def disconnect_mongodb():
    """Disconnect from MongoDB."""
    global _mongo_client, _mongo_database
    
    if _mongo_client:
        _mongo_client.close()
        _mongo_client = None
        _mongo_database = None
        logger.info("✅ Disconnected from MongoDB")

def get_mongo_client() -> Optional[AsyncIOMotorClient]:
    """Get the current MongoDB client."""
    return _mongo_client

def get_database() -> Optional[AsyncIOMotorDatabase]:
    """Get the current MongoDB database."""
    return _mongo_database

async def mongodb_connected() -> bool:
    """Check if MongoDB is connected and ready."""
    try:
        if _mongo_client is None:
            return False
        
        # Ping the database to check connection
        await _mongo_client.admin.command('ismaster')
        return True
    except Exception:
        return False

# Collection helpers
def get_collection(collection_name: str):
    """Get a MongoDB collection."""
    if _mongo_database is None:
        raise RuntimeError("MongoDB not connected. Call connect_mongodb() first.")
    return _mongo_database[collection_name]

class Collections:
    """Collection name constants."""
    ML_PREDICTIONS = "ml_predictions"
    CONVERSATION_HISTORY = "conversation_history" 
    USER_PREFERENCES = "user_preferences"
    PORTFOLIO_ANALYSIS = "portfolio_analysis"
    MARKET_PREDICTIONS = "market_predictions"
    RISK_ASSESSMENTS = "risk_assessments"
