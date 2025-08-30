from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx
import json
import asyncio
import subprocess

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None
    model: str = "llama3.1:8b"

class ChatResponse(BaseModel):
    response: str
    confidence: float
    sources: List[str]

async def call_ollama(message: str, model: str = "llama3.1:8b") -> str:
    """Call Ollama API to get AI response"""
    try:
        # Create a financial context prompt
        financial_context = """You are a helpful financial advisor AI assistant. You provide clear, accurate, and helpful advice about personal finance, investing, budgeting, and financial planning. Always be professional, ethical, and encourage users to consult with qualified financial professionals for specific investment advice."""
        
        full_prompt = f"{financial_context}\n\nUser question: {message}\n\nPlease provide a helpful and informative response:"
        
        # Call Ollama using subprocess
        result = subprocess.run(
            ["ollama", "run", model, full_prompt],
            capture_output=True,
            text=True,
            timeout=30  # 30 second timeout
        )
        
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            raise Exception(f"Ollama error: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        raise Exception("Ollama request timed out")
    except Exception as e:
        raise Exception(f"Error calling Ollama: {str(e)}")

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """Chat with AI about financial topics using Ollama"""
    try:
        # Call Ollama to get response
        ai_response = await call_ollama(request.message, request.model)
        
        # Calculate confidence based on response quality
        confidence = 0.85 if len(ai_response) > 50 else 0.7
        
        # Determine sources based on context
        sources = ["ollama_ai", "financial_knowledge_base"]
        if request.context:
            if "portfolio_data" in request.context:
                sources.append("portfolio_data")
            if "market_data" in request.context:
                sources.append("market_data")
        
        return ChatResponse(
            response=ai_response,
            confidence=confidence,
            sources=sources
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-sentiment")
async def analyze_chat_sentiment(request: ChatRequest):
    """Analyze sentiment of user message using Ollama"""
    try:
        sentiment_prompt = f"""Analyze the sentiment of this message and respond with only one word: positive, negative, or neutral.

Message: "{request.message}"

Sentiment:"""
        
        sentiment_response = await call_ollama(sentiment_prompt, request.model)
        sentiment = sentiment_response.strip().lower()
        
        # Validate sentiment
        if sentiment not in ["positive", "negative", "neutral"]:
            sentiment = "neutral"  # Default fallback
        
        confidence = 0.8 if sentiment in ["positive", "negative"] else 0.6
        
        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "message": f"Sentiment analysis completed: {sentiment}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
async def list_available_models():
    """List available Ollama models"""
    try:
        result = subprocess.run(
            ["ollama", "list"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            models = []
            lines = result.stdout.strip().split('\n')[1:]  # Skip header
            for line in lines:
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 2:
                        models.append({
                            "name": parts[0],
                            "id": parts[1],
                            "size": parts[2] if len(parts) > 2 else "Unknown"
                        })
            return {"models": models}
        else:
            raise Exception(f"Error listing models: {result.stderr}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

