"""
Debug endpoint to test financial data fetching without the full chat flow.
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional
import logging

from services.backend_proxy import backend_proxy

router = APIRouter()
logger = logging.getLogger(__name__)

class DebugFinancialRequest(BaseModel):
    user_id: str

@router.post("/financial-data")
async def debug_financial_data(request: DebugFinancialRequest, authorization: Optional[str] = Header(None)):
    """Debug endpoint to test financial data fetching"""
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        auth_token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        
        logger.info(f"🔍 [DEBUG] Testing financial data fetch for user: {request.user_id}")
        logger.info(f"🔍 [DEBUG] Token prefix: {auth_token[:30]}...")
        
        # Test financial data fetching
        financial_data = await backend_proxy.get_user_financial_data_with_auth(
            request.user_id, auth_token
        )
        
        # Format context
        financial_context = backend_proxy.format_financial_context_for_llm(financial_data)
        
        logger.info(f"🔍 [DEBUG] Financial data retrieved successfully")
        
        return {
            "success": True,
            "user_id": request.user_id,
            "data_summary": {
                "profile": bool(financial_data.get("profile")),
                "portfolio": bool(financial_data.get("portfolio")),
                "transactions_count": len(financial_data.get("transactions", [])),
                "budgets_count": len(financial_data.get("budgets", [])),
                "goals_count": len(financial_data.get("goals", [])),
                "investments_count": len(financial_data.get("investments", [])),
                "analytics": bool(financial_data.get("analytics"))
            },
            "context_length": len(financial_context),
            "context_preview": financial_context[:500] + "..." if len(financial_context) > 500 else financial_context,
            "raw_data": financial_data  # Include raw data for debugging
        }
        
    except Exception as e:
        logger.error(f"❌ Debug financial data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-endpoints")
async def test_backend_endpoints(authorization: Optional[str] = Header(None)):
    """Test which backend endpoints are accessible"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    auth_token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    import httpx
    
    backend_url = "http://localhost:3001/api"
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    results = {}
    
    endpoints = [
        "/auth/me",
        "/portfolio/overview",
        "/portfolio/metrics",
        "/transactions",
        "/budgets",
        "/goals",
        "/investments"
    ]
    
    async with httpx.AsyncClient() as client:
        for endpoint in endpoints:
            try:
                response = await client.get(f"{backend_url}{endpoint}", headers=headers)
                results[endpoint] = {
                    "status": response.status_code,
                    "accessible": response.status_code == 200,
                    "error": response.text if response.status_code != 200 else None
                }
            except Exception as e:
                results[endpoint] = {
                    "status": "error",
                    "accessible": False,
                    "error": str(e)
                }
    
    return {
        "backend_url": backend_url,
        "test_results": results,
        "summary": {
            "accessible_endpoints": len([r for r in results.values() if r.get("accessible")]),
            "total_endpoints": len(endpoints)
        }
    }
