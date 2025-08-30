from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn
from contextlib import asynccontextmanager
# import redis.asyncio as redis
# from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Import routers
from routes import portfolio_analysis, market_prediction, risk_assessment, ai_chat

# Load environment variables
load_dotenv()

# Global variables for database and cache connections
# redis_client = None
# mongo_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global redis_client, mongo_client
    
    # Initialize Redis connection (commented out for minimal setup)
    # redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    # redis_client = redis.from_url(redis_url, decode_responses=True)
    
    # Initialize MongoDB connection (commented out for minimal setup)
    # mongo_url = os.getenv("MONGODB_URI")
    # if mongo_url:
    #     mongo_client = AsyncIOMotorClient(mongo_url)
    
    print("ML Services started successfully")
    
    yield
    
    # Shutdown
    # if redis_client:
    #     await redis_client.close()
    # if mongo_client:
    #     mongo_client.close()
    print("ML Services shutdown")

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

@app.get("/")
async def root():
    return {
        "message": "WeathWise ML Services API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "redis": False,  # Disabled in minimal setup
            "mongodb": False  # Disabled in minimal setup
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
