from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional
import httpx
import json
import asyncio
import subprocess
import time
import uuid
import logging

# Import database services
from services import DatabaseService, CacheService, FinancialDataService
from services.backend_proxy import backend_proxy

router = APIRouter()
logger = logging.getLogger(__name__)

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None
    model: str = "llama3.1:8b"
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    include_financial_data: bool = True

class ChatResponse(BaseModel):
    response: str
    confidence: float
    sources: List[str]
    session_id: str
    cached: bool = False
    processing_time_ms: int
    financial_insights: Optional[List[str]] = None

async def call_ollama(message: str, financial_context: str = "", model: str = "llama3.1:8b") -> str:
    """Call Ollama API to get AI response with financial context"""
    try:
        # Create a financial context prompt with markdown formatting instructions
        base_context = """You are the AI financial advisor for WeathWise, a comprehensive personal finance management platform. You have integrated access to the user's real financial data within the WeathWise app and can provide personalized advice based on their actual financial situation.

## 🏦 About WeathWise
WeathWise is a full-featured financial platform that helps users:
- **Track Transactions**: Monitor income and expenses across categories
- **Manage Budgets**: Create monthly budgets with spending tracking and alerts
- **Set Financial Goals**: Track progress on savings, debt payoff, and investment targets
- **Portfolio Management**: Track investments with real-time performance analytics
- **Advanced Analytics**: Get insights on spending patterns, portfolio performance, and financial health
- **AI-Powered Insights**: Receive personalized recommendations and financial guidance

## 🎯 Your Role & Capabilities
As WeathWise's integrated AI advisor, you can:
- **Access Real Data**: Review their actual transactions, budgets, goals, and investments
- **Provide Personalized Advice**: Give specific recommendations based on their unique situation
- **Track Progress**: Help monitor goal progress and budget performance
- **Portfolio Analysis**: Analyze investment allocation, performance, and risk
- **Financial Planning**: Assist with budgeting, savings strategies, and investment decisions

## 💰 WeathWise Features You Should Reference
- **Dashboard**: Shows net worth, portfolio value, recent transactions, and financial health score
- **Transactions Page**: Add/edit income and expenses, categorize spending
- **Portfolio Page**: Track investments with advanced analytics and performance metrics
- **Budget Page**: Create category-based budgets with spending tracking
- **Goals Page**: Set and track financial goals (emergency fund, savings, debt payoff)
- **Talk to Finances**: This AI chat feature where you provide personalized guidance

## 📊 Data Context Awareness
- If users ask about specific amounts (income, expenses, goals), reference their actual data when available
- When no data exists yet, guide them on how to add it within WeathWise
- Acknowledge their risk tolerance and investment experience level
- Provide actionable next steps using WeathWise features

## 🎨 Response Format
IMPORTANT: Format all responses using Markdown for excellent readability:
- Use **bold** for important terms, amounts, and key concepts
- Use *italics* for emphasis and highlights
- Use numbered lists (1. 2. 3.) for step-by-step instructions
- Use bullet points (-) for feature lists and options
- Use `code formatting` for specific amounts and percentages
- Use ## headers for main sections
- Use > for important quotes, warnings, or key takeaways

## 🚀 Actionable Guidance
Always provide specific, actionable advice:
- Reference specific WeathWise pages/features where they can take action
- Suggest concrete next steps they can do right now in the app
- Connect your advice to their actual financial data and goals
- Encourage them to explore relevant WeathWise features

Remember: You're not just answering questions - you're their personal financial advisor with access to their complete WeathWise financial profile. Be specific, be helpful, and always tie your advice back to actions they can take within the WeathWise platform."""
        
        # Combine base context with user's financial data
        full_context = base_context
        if financial_context:
            full_context += f"\n\n{financial_context}"
        
        full_prompt = f"{full_context}\n\nUser question: {message}\n\nBased on the user's WeathWise account data above, provide a personalized response. If they're asking about their financial situation and you have their data, reference the specific numbers and details. If they're a new user without data yet, acknowledge this and guide them on how to get started with WeathWise:"
        
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
async def chat_with_ai(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """Chat with AI about financial topics using Ollama with personalized financial context"""
    start_time = time.time()
    
    try:
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        # Initialize financial context and insights
        financial_context = ""
        financial_insights = []
        sources = ["ollama_ai", "financial_knowledge_base"]
        
        # Fetch user's financial data if user_id and auth token provided
        if request.user_id and authorization and request.include_financial_data:
            try:
                auth_token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
                
                # Use backend proxy instead of direct financial service
                user_financial_data = await backend_proxy.get_user_financial_data_with_auth(
                    request.user_id, auth_token
                )
                
                if user_financial_data and any(user_financial_data.values()):
                    # Format financial context for LLM using backend proxy
                    financial_context = backend_proxy.format_financial_context_for_llm(user_financial_data)
                    
                    # DEBUG: Log the financial context being sent to LLM
                    logger.info(f"🔍 [DEBUG] Financial context length: {len(financial_context)} characters")
                    logger.info(f"🔍 [DEBUG] Financial data keys: {list(user_financial_data.keys())}")
                    logger.info(f"🔍 [DEBUG] Financial context preview: {financial_context[:500]}...")
                    
                    # Generate insights from analytics
                    analytics = user_financial_data.get("analytics", {})
                    financial_insights = []
                    
                    if analytics.get("total_net_worth", 0) > 0:
                        financial_insights.append(f"Portfolio value: ${analytics['total_net_worth']:,.2f}")
                    
                    if analytics.get("savings_rate", 0) > 0:
                        financial_insights.append(f"Savings rate: {analytics['savings_rate']:.1f}%")
                    
                    if analytics.get("monthly_income", 0) > 0:
                        surplus = analytics['monthly_income'] - analytics['monthly_expenses']
                        financial_insights.append(f"Monthly surplus: ${surplus:,.2f}")
                    
                    # Add to sources
                    sources.extend(["user_portfolio", "user_transactions", "user_goals", "backend_api"])
                    
                    logger.info(f"✅ Added personalized financial context for user {request.user_id} via backend proxy")
                else:
                    logger.info(f"⚠️ No financial data found for user {request.user_id}")
                    
            except Exception as e:
                logger.warning(f"⚠️ Failed to fetch financial data for user {request.user_id}: {e}")
                # Continue without financial context - don't fail the entire request
        
        # Check cache first (include user_id in cache key for personalization)
        cache_key = f"{request.message}_{request.user_id or 'anonymous'}"
        cached_response = await CacheService.get_cached_chat_response(cache_key)
        if cached_response and not request.include_financial_data:  # Don't use cache for personalized responses
            logger.info(f"✅ Returning cached response for query")
            return ChatResponse(
                response=cached_response["response"],
                confidence=cached_response["confidence"],
                sources=cached_response["sources"],
                session_id=session_id,
                cached=True,
                processing_time_ms=int((time.time() - start_time) * 1000),
                financial_insights=financial_insights
            )
        
        # Save user message to database
        await DatabaseService.save_conversation(
            user_id=request.user_id,
            session_id=session_id,
            message_type="user",
            content=request.message,
            metadata={
                "model": request.model, 
                "context": request.context,
                "has_financial_data": bool(financial_context)
            }
        )
        
        # Call Ollama with financial context
        ai_response = await call_ollama(request.message, financial_context, request.model)
        
        # Calculate confidence based on response quality and personalization
        base_confidence = 0.85 if len(ai_response) > 50 else 0.7
        personalization_boost = 0.1 if financial_context else 0
        confidence = min(0.95, base_confidence + personalization_boost)
        
        # Add context-based sources
        if request.context:
            if "portfolio_data" in request.context:
                sources.append("portfolio_data")
            if "market_data" in request.context:
                sources.append("market_data")
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Save AI response to database
        await DatabaseService.save_conversation(
            user_id=request.user_id,
            session_id=session_id,
            message_type="assistant",
            content=ai_response,
            metadata={
                "model": request.model,
                "confidence": confidence,
                "sources": sources,
                "processing_time_ms": processing_time_ms,
                "personalized": bool(financial_context),
                "financial_insights": financial_insights
            }
        )
        
        # Save prediction result
        await DatabaseService.save_ml_prediction(
            prediction_type="chat",
            input_data={
                "message": request.message, 
                "model": request.model,
                "personalized": bool(financial_context)
            },
            prediction_result={"response": ai_response},
            user_id=request.user_id,
            confidence_score=confidence,
            processing_time_ms=processing_time_ms
        )
        
        # Cache the response (only non-personalized responses)
        if not financial_context:
            cache_data = {
                "response": ai_response,
                "confidence": confidence,
                "sources": sources
            }
            await CacheService.cache_chat_response(cache_key, cache_data)
        
        return ChatResponse(
            response=ai_response,
            confidence=confidence,
            sources=sources,
            session_id=session_id,
            cached=False,
            processing_time_ms=processing_time_ms,
            financial_insights=financial_insights
        )
        
    except Exception as e:
        logger.error(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{session_id}")
async def get_conversation_history(session_id: str, user_id: Optional[str] = None, limit: int = 50):
    """Get conversation history for a session"""
    try:
        history = await DatabaseService.get_conversation_history(
            session_id=session_id,
            user_id=user_id,
            limit=limit
        )
        
        return {
            "session_id": session_id,
            "messages": [
                {
                    "id": str(msg.id),
                    "message_type": msg.message_type,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "metadata": msg.metadata
                }
                for msg in history
            ],
            "total_messages": len(history)
        }
    except Exception as e:
        logger.error(f"❌ Error getting conversation history: {e}")
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

