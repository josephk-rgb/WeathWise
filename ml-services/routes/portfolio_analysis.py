from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
from services.portfolio_optimizer import PortfolioOptimizer
from fastapi import Header
import httpx
import os

router = APIRouter()

class OptimizeRequest(BaseModel):
    symbols: List[str]
    risk_tolerance: Optional[str] = 'moderate'
    target_return: Optional[float] = None
    current_weights: Optional[List[float]] = None

class OptimizeResponse(BaseModel):
    symbols: List[str]
    weights: dict
    portfolio_stats: dict
    asset_stats: dict
    risk_metrics: dict
    generated_at: str

optimizer = PortfolioOptimizer()

@router.post("/optimize-portfolio", response_model=OptimizeResponse)
async def optimize_portfolio(req: OptimizeRequest, authorization: Optional[str] = Header(None)):
    try:
        symbols = [s.strip().upper() for s in req.symbols if isinstance(s, str) and s.strip()]
        if not symbols:
            raise HTTPException(status_code=400, detail="symbols required")
        # Validate symbols via backend market data to filter out bad tickers
        backend_url = os.getenv("BACKEND_API_URL", "http://localhost:3001/api")
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                # POST /market/yahoo-data expects body: { symbols: string[] }
                resp = await client.post(f"{backend_url}/market/yahoo-data", json={"symbols": symbols}, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    valid = []
                    # Accept both {data:[{symbol:...}]} and direct array
                    rows = data.get("data") if isinstance(data, dict) else data
                    if isinstance(rows, list):
                        seen = set()
                        for r in rows:
                            sym = (r.get("symbol") if isinstance(r, dict) else None)
                            if sym and sym not in seen:
                                seen.add(sym)
                                valid.append(sym)
                    if valid:
                        symbols = [s for s in symbols if s in valid]
        except Exception:
            # If backend validation fails, proceed with original symbols
            pass

        if len(symbols) < 2:
            raise HTTPException(status_code=400, detail="need at least two valid symbols for optimization")

        try:
            result = optimizer.optimize(symbols, risk_tolerance=req.risk_tolerance or 'moderate', target_return=req.target_return)
            return result
        except Exception as opt_err:
            # Server-side graceful fallback: equal-weight targets so callers still get actionable output
            try:
                n = len(symbols)
                if n >= 2:
                    w = 1.0 / n
                    weights = {s: w for s in symbols}
                    from datetime import datetime
                    return {
                        "symbols": symbols,
                        "weights": weights,
                        "portfolio_stats": {"return": 0, "volatility": 0, "sharpe_ratio": 0},
                        "asset_stats": {s: {"weight": w, "expected_return": 0, "volatility": 0} for s in symbols},
                        "risk_metrics": {"var_95": 0, "max_drawdown": 0, "downside_deviation": 0},
                        "generated_at": datetime.utcnow().isoformat(),
                        "fallback": True,
                        "message": f"Optimizer failed: {str(opt_err)}. Returning equal-weight targets."
                    }
            except Exception:
                pass
            raise HTTPException(status_code=400, detail=f"optimization failed: {str(opt_err)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class FrontierRequest(BaseModel):
    symbols: List[str]
    num_portfolios: Optional[int] = 100


@router.post("/efficient-frontier")
async def get_efficient_frontier(req: FrontierRequest):
    try:
        symbols = [s.strip().upper() for s in req.symbols if isinstance(s, str) and s.strip()]
        if not symbols:
            raise HTTPException(status_code=400, detail="symbols required")
        data = optimizer.efficient_frontier(symbols, num_portfolios=min(max(req.num_portfolios or 100, 20), 500))
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))





