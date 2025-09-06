"""Test endpoint to demonstrate personalized AI with mock user data - bypasses authentication."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import time
import uuid
import logging

from services import DatabaseService, CacheService
from routes.ai_chat import call_ollama

router = APIRouter()
logger = logging.getLogger(__name__)

class TestPersonalizedChatRequest(BaseModel):
    message: str
    model: str = "llama3.1:8b"

class TestPersonalizedChatResponse(BaseModel):
    response: str
    confidence: float
    sources: List[str]
    session_id: str
    processing_time_ms: int
    financial_insights: List[str]
    mock_user_data: Dict[str, Any]
    personalized: bool = True

def get_mock_user_financial_data() -> Dict[str, Any]:
    """Generate realistic mock financial data for testing."""
    return {
        "user_profile": {
            "name": "Alex Johnson",
            "age": 32,
            "riskTolerance": "Moderate",
            "investmentExperience": "Intermediate"
        },
        "portfolio": {
            "totalValue": 85000,
            "cash": 15000,
            "stocks": 50000,
            "bonds": 15000,
            "other": 5000,
            "allocation": "59% Stocks, 18% Bonds, 18% Cash, 6% Other"
        },
        "monthly_income": 7500,
        "monthly_expenses": 5200,
        "recent_transactions": [
            {"description": "Salary Deposit", "amount": 7500, "category": "Income"},
            {"description": "Grocery Shopping", "amount": -450, "category": "Food"},
            {"description": "Stock Purchase (AAPL)", "amount": -2000, "category": "Investment"},
            {"description": "Restaurant Dinner", "amount": -75, "category": "Dining"},
            {"description": "Utilities Bill", "amount": -180, "category": "Bills"}
        ],
        "goals": [
            {"name": "Emergency Fund", "currentAmount": 10000, "targetAmount": 15000},
            {"name": "House Down Payment", "currentAmount": 25000, "targetAmount": 50000},
            {"name": "Retirement Savings", "currentAmount": 50000, "targetAmount": 500000}
        ],
        "budgets": [
            {"category": "Food", "spent": 450, "limit": 600},
            {"category": "Entertainment", "spent": 200, "limit": 300},
            {"category": "Transportation", "spent": 350, "limit": 400}
        ]
    }

def format_mock_financial_context(data: Dict[str, Any]) -> str:
    """Format mock financial data into LLM context."""
    
    portfolio = data["portfolio"]
    goals = data["goals"]
    budgets = data["budgets"]
    
    return f"""
## IMPORTANT: User's Personal Financial Data (MOCK TEST DATA)
The following is Alex Johnson's actual financial information. Use this data to provide personalized, specific advice:

## User Financial Profile
- Name: {data["user_profile"]["name"]}
- Age: {data["user_profile"]["age"]}
- Risk Tolerance: {data["user_profile"]["riskTolerance"]}
- Investment Experience: {data["user_profile"]["investmentExperience"]}

## Current Portfolio (Total Value: ${portfolio["totalValue"]:,})
- Cash: ${portfolio["cash"]:,}
- Stocks: ${portfolio["stocks"]:,}
- Bonds: ${portfolio["bonds"]:,}
- Other Investments: ${portfolio["other"]:,}
- Portfolio Allocation: {portfolio["allocation"]}

## Monthly Cash Flow
- Monthly Income: ${data["monthly_income"]:,}
- Monthly Expenses: ${data["monthly_expenses"]:,}
- Net Cash Flow: ${data["monthly_income"] - data["monthly_expenses"]:,}

## Recent Transactions
{chr(10).join([f"- {t['description']}: ${t['amount']:,} ({t['category']})" for t in data["recent_transactions"]])}

## Financial Goals
{chr(10).join([f"- {g['name']}: ${g['currentAmount']:,} / ${g['targetAmount']:,} ({g['currentAmount']/g['targetAmount']*100:.1f}% complete)" for g in goals])}

## Budget Overview
{chr(10).join([f"- {b['category']}: ${b['spent']:,} / ${b['limit']:,} (${b['limit']-b['spent']:,} remaining)" for b in budgets])}

**IMPORTANT**: Reference Alex's specific financial situation, portfolio allocation, goals, and spending patterns in your response. Provide actionable, personalized advice based on these real numbers.
"""

def generate_mock_financial_insights(data: Dict[str, Any]) -> List[str]:
    """Generate financial insights from mock data."""
    insights = []
    
    portfolio = data["portfolio"]
    net_flow = data["monthly_income"] - data["monthly_expenses"]
    
    # Net worth insight
    insights.append(f"Strong financial position with ${portfolio['totalValue']:,} in total assets")
    
    # Cash flow insight
    insights.append(f"Healthy cash flow with ${net_flow:,} monthly surplus available for investing")
    
    # Portfolio allocation insight
    stock_pct = (portfolio["stocks"] / portfolio["totalValue"]) * 100
    if stock_pct > 70:
        insights.append("Portfolio is heavily weighted in stocks - consider diversification")
    elif stock_pct < 40:
        insights.append("Conservative allocation - could increase stock exposure for growth")
    else:
        insights.append("Well-balanced portfolio allocation for moderate risk tolerance")
    
    # Goal progress
    emergency_goal = next(g for g in data["goals"] if "Emergency" in g["name"])
    progress = (emergency_goal["currentAmount"] / emergency_goal["targetAmount"]) * 100
    if progress < 100:
        insights.append(f"Emergency fund {progress:.1f}% complete - consider prioritizing")
    
    return insights

@router.post("/test-personalized-chat", response_model=TestPersonalizedChatResponse)
async def test_personalized_chat(request: TestPersonalizedChatRequest):
    """
    TEST ENDPOINT: Demonstrate personalized AI with mock financial data.
    This bypasses authentication to show what the AI can do with real user data.
    """
    start_time = time.time()
    session_id = str(uuid.uuid4())
    
    try:
        # Get mock financial data
        mock_data = get_mock_user_financial_data()
        
        # Format financial context for LLM
        financial_context = format_mock_financial_context(mock_data)
        
        # Generate insights
        financial_insights = generate_mock_financial_insights(mock_data)
        
        # Enhanced sources for personalized response
        sources = [
            "ollama_ai", 
            "financial_knowledge_base", 
            "user_portfolio", 
            "user_transactions", 
            "user_goals",
            "mock_test_data"
        ]
        
        logger.info(f"🧪 Testing personalized AI with mock data for question: {request.message[:50]}...")
        
        # Call Ollama with financial context
        ai_response = await call_ollama(request.message, financial_context, request.model)
        
        # Higher confidence for personalized responses
        confidence = 0.92
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Save test conversation to database
        await DatabaseService.save_conversation(
            user_id="test_mock_user",
            session_id=session_id,
            message_type="user",
            content=request.message,
            metadata={"test_mode": True, "mock_data": True}
        )
        
        await DatabaseService.save_conversation(
            user_id="test_mock_user",
            session_id=session_id,
            message_type="assistant",
            content=ai_response,
            metadata={
                "test_mode": True,
                "mock_data": True,
                "confidence": confidence,
                "sources": sources,
                "financial_insights": financial_insights
            }
        )
        
        logger.info(f"✅ Test personalized response generated with {confidence} confidence")
        
        return TestPersonalizedChatResponse(
            response=ai_response,
            confidence=confidence,
            sources=sources,
            session_id=session_id,
            processing_time_ms=processing_time_ms,
            financial_insights=financial_insights,
            mock_user_data=mock_data,
            personalized=True
        )
        
    except Exception as e:
        logger.error(f"❌ Test personalized chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
