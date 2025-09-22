from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict
from database.redis_client import generate_cache_key, cache_get, cache_set
from services.sentiment_analyzer import analyzer, MarketSentimentAnalyzer
from fastapi import Header

router = APIRouter()

class PredictionRequest(BaseModel):
    symbol: str
    timeframe: str
    features: Optional[List[str]] = None

class PredictionResponse(BaseModel):
    symbol: str
    predictions: List[float]
    confidence: float
    next_price: float
    trend: str

@router.post("/predict", response_model=PredictionResponse)
async def predict_market(request: PredictionRequest):
    """Predict market movements for a given symbol"""
    try:
        # TODO: Implement market prediction logic
        # This is a placeholder implementation
        
        # Mock predictions
        predictions = [100.0, 101.5, 99.8, 102.3, 103.1]
        confidence = 0.75
        next_price = 103.1
        trend = "bullish" if next_price > 100 else "bearish"
        
        return PredictionResponse(
            symbol=request.symbol,
            predictions=predictions,
            confidence=confidence,
            next_price=next_price,
            trend=trend
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sentiment/{symbol}")
async def get_market_sentiment(symbol: str, authorization: Optional[str] = Header(None)):
    """Model-backed (or cached) sentiment endpoint with 30–60m cache TTL."""
    try:
        sym = (symbol or "").strip().upper()
        if not sym:
            raise HTTPException(status_code=400, detail="symbol required")
        # Cache check
        cache_key = generate_cache_key("ml:sentiment:{symbol}", symbol=sym)
        cached = await cache_get(cache_key)
        if cached:
            return cached

        # Use trained analyzer if available; otherwise return neutral
        if getattr(analyzer, 'is_trained', False):
            result = analyzer.predict_sentiment(sym, authorization=authorization)
        else:
            result = {
                "symbol": sym,
                "technical_sentiment": "neutral",
                "technical_probabilities": {"neutral": 1.0},
                "news_sentiment": {"sentiment_label": "neutral", "confidence": 0.0},
                "combined_sentiment": "neutral",
                "confidence": 0.0,
                "timestamp": datetime.utcnow().isoformat(),
                "modelVersion": "untrained"
            }
        # Cache for 30 minutes by default (1800 seconds)
        await cache_set(cache_key, result, ttl=1800)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class TrainRequest(BaseModel):
    symbols: List[str]


@router.post("/train-sentiment-model")
async def train_sentiment_model(req: TrainRequest, authorization: Optional[str] = Header(None)):
    """Train the sentiment model using provided symbols."""
    try:
        # Wire to real MarketSentimentAnalyzer in a follow-up; return basic ack now.
        if not req.symbols or len(req.symbols) < 3:
            raise HTTPException(status_code=400, detail="Provide at least 3 symbols for training")
        syms = [s.strip().upper() for s in req.symbols if isinstance(s, str) and s.strip()]
        try:
            metrics = analyzer.train_model(syms, authorization=authorization)
        except Exception as e:
            # Relax constraints: if training fails due to data sparsity, try shorter universe (first 5) and shorter period inside analyzer via symbols subset
            short = syms[:5]
            metrics = analyzer.train_model(short, authorization=authorization)
        return {
            "success": True,
            "symbols": syms,
            "metrics": metrics,
            "trained_at": metrics.get('trained_at')
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





