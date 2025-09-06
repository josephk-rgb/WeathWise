from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import logging

# Import database connections
from database import connect_mongodb, disconnect_mongodb, connect_redis, disconnect_redis
from database import mongodb_connected, redis_connected

# Import routers
from routes import portfolio_analysis, market_prediction, risk_assessment, ai_chat

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting WeathWise ML Services...")
    
    # Initialize MongoDB connection
    try:
        await connect_mongodb()
        if await mongodb_connected():
            logger.info("✅ MongoDB connected successfully")
        else:
            logger.warning("⚠️ MongoDB connection failed")
    except Exception as e:
        logger.error(f"❌ MongoDB connection error: {e}")
    
    # Initialize Redis connection (optional)
    try:
        await connect_redis()
        if await redis_connected():
            logger.info("✅ Redis connected successfully")
        else:
            logger.warning("⚠️ Redis connection failed (caching disabled)")
    except Exception as e:
        logger.warning(f"⚠️ Redis connection error (caching disabled): {e}")
    
    logger.info("✅ ML Services started successfully")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down WeathWise ML Services...")
    
    try:
        await disconnect_mongodb()
    except Exception as e:
        logger.error(f"❌ MongoDB disconnect error: {e}")
    
    try:
        await disconnect_redis()
    except Exception as e:
        logger.error(f"❌ Redis disconnect error: {e}")
    
    logger.info("✅ ML Services shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="WeathWise ML Services",
    description="Machine Learning services for financial analysis and portfolio optimization",
    version="1.0.0",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.vercel.app"]
)

# Include routers
app.include_router(portfolio_analysis.router, prefix="/api/ml/portfolio", tags=["Portfolio Analysis"])
app.include_router(market_prediction.router, prefix="/api/ml/market", tags=["Market Prediction"])
app.include_router(risk_assessment.router, prefix="/api/ml/risk", tags=["Risk Assessment"])
app.include_router(ai_chat.router, prefix="/api/ml/chat", tags=["AI Chat"])

# BACKWARD COMPATIBILITY: Add /ai prefix for direct frontend calls
app.include_router(ai_chat.router, prefix="/ai", tags=["AI Chat (Legacy)"])

@app.get("/")
async def root():
    return {
        "message": "WeathWise ML Services API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint with database status."""
    mongo_status = await mongodb_connected()
    redis_status = await redis_connected()
    
    return {
        "status": "healthy",
        "services": {
            "mongodb": mongo_status,
            "redis": redis_status,
            "ollama": True  # TODO: Add actual Ollama health check
        },
        "database_ready": mongo_status,
        "cache_ready": redis_status
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
