from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional, Literal
import subprocess
import logging
# Removed DB context dependencies to prevent crashes

router = APIRouter()
logger = logging.getLogger(__name__)

Scope = Literal['dashboard', 'portfolio']

class GenerateRequest(BaseModel):
    user_id: str
    scope: Scope = 'dashboard'
    max: int = 5
    portfolio: Optional[dict] = None
    model: str = "llama3.1:8b"

class MLRecommendation(BaseModel):
    title: str
    description: str
    reasoning: List[str] = []
    actionItems: List[str] = []
    priority: Literal['low','medium','high','urgent'] = 'medium'
    confidence: float = 0.8
    scope: Scope
    symbol: Optional[str] = None
    targetAllocation: Optional[float] = None
    timeHorizon: Optional[Literal['short','medium','long']] = None
    riskScore: Optional[float] = None

class GenerateResponse(BaseModel):
    recommendations: List[MLRecommendation]
    model: str
    generated_at: str

from typing import Optional
from services.backend_proxy import backend_proxy

async def build_user_context(user_id: str, auth_token: Optional[str]) -> dict:
    # Chat-like behavior: use backend proxy with user auth to fetch context; fallback to empty
    if not auth_token:
        return {}
    try:
        return await backend_proxy.get_user_financial_data_with_auth(user_id, auth_token)
    except Exception as e:
        logger.warning(f"⚠️ Backend proxy context fetch failed for {user_id}: {e}")
        return {}

def call_ollama_prompt(prompt: str, model: str, timeout: int = 45) -> str:
    try:
        result = subprocess.run(
            ["ollama", "run", model, prompt],
            capture_output=True,
            text=True,
            timeout=timeout
        )
        if result.returncode == 0:
            return result.stdout.strip()
        raise Exception(result.stderr)
    except subprocess.TimeoutExpired:
        raise Exception("Ollama request timed out")

def build_prompt(scope: Scope, context: dict, max_items: int) -> str:
    summary_parts = []

    # Try multiple shapes for portfolio/investments
    inv = context.get("investments")
    portfolio = context.get("portfolio")

    # investments as dict (FinancialDataService shape)
    if isinstance(inv, dict):
        total_value = inv.get("total_value")
        top_holdings = inv.get("top_holdings") or inv.get("holdings") or []
        if total_value is not None:
            summary_parts.append(f"Portfolio Value: ${total_value:,.0f}")
        if top_holdings and isinstance(top_holdings, list):
            top = ", ".join([str((h.get('symbol') if isinstance(h, dict) else None) or (h.get('name') if isinstance(h, dict) else None) or h) for h in top_holdings[:5]])
            if top.strip():
                summary_parts.append(f"Top Holdings: {top}")

    # portfolio as dict (backend proxy summary)
    if isinstance(portfolio, dict):
        pv = portfolio.get('totalValue') or portfolio.get('portfolioValue') or portfolio.get('current')
        if isinstance(pv, (int, float)):
            summary_parts.append(f"Portfolio Value: ${pv:,.0f}")
        th = portfolio.get('topHoldings') or portfolio.get('top_holdings')
        if isinstance(th, list) and th:
            top = ", ".join([str(h.get('symbol') or h.get('name') or '') for h in th[:5] if isinstance(h, dict)])
            if top.strip():
                summary_parts.append(f"Top Holdings: {top}")

    # Transactions may be list (backend proxy) or dict summary
    tx = context.get("transactions")
    if isinstance(tx, dict) and tx.get("total_spending") is not None:
        summary_parts.append(f"Monthly Spending: ${tx['total_spending']:,.0f}")
    elif isinstance(tx, list):
        summary_parts.append(f"Recent Transactions: {len(tx)} items")

    # Accounts (backend proxy)
    accounts = context.get("accounts")
    if isinstance(accounts, dict) and accounts.get("total_balance") is not None:
        summary_parts.append(f"Cash & Accounts: ${accounts['total_balance']:,.0f}")
    elif isinstance(accounts, list) and accounts:
        total_bal = 0.0
        try:
            total_bal = sum(float(a.get('balance') or 0) for a in accounts if isinstance(a, dict))
        except Exception:
            total_bal = 0.0
        if total_bal:
            summary_parts.append(f"Cash & Accounts: ${total_bal:,.0f}")

    # Financial health (FinancialDataService shape)
    health = context.get("financial_health")
    if isinstance(health, dict) and health.get("overall_health_score") is not None:
        summary_parts.append(f"Health Score: {health['overall_health_score']:.2f}")

    # Profile/risk profile (backend proxy profile)
    profile = context.get('profile')
    if isinstance(profile, dict):
        risk = (profile.get('risk_profile') if isinstance(profile.get('risk_profile'), str) else None) or profile.get('riskProfile', {}).get('level') if isinstance(profile.get('riskProfile'), dict) else None
        if risk:
            summary_parts.append(f"Risk Profile: {risk}")

    summary = "\n".join(f"- {s}" for s in summary_parts if s)

    if scope == 'dashboard':
        instruction = (
            f"Provide exactly {max_items} concise, actionable personal finance recommendations across budgeting, savings, debt, goals, and risk. "
            "Return a strict JSON array of length {max_items} where each element is an object with keys: title, description, reasoning (array), actionItems (array), priority, confidence (0-1)."
        )
    else:
        instruction = (
            f"Provide exactly {max_items} portfolio-focused recommendations (buy/sell/hold/rebalance, risk). "
            "Return a strict JSON array of length {max_items} with objects: title, description, reasoning (array), actionItems (array), priority, confidence (0-1), symbol (optional), targetAllocation (optional), timeHorizon (optional)."
        )

    base = (
        "You are a financial assistant. Use the user's context to personalize. "
        "Respond with ONLY a JSON array and no extra text."
    )
    return f"""
{base}

USER CONTEXT SUMMARY:
{summary}

{instruction}
""".strip()

def parse_recommendations_json(raw: str) -> List[dict]:
    import json
    text = raw.strip()
    # Attempt to extract JSON array if model added prose
    start = text.find('[')
    end = text.rfind(']')
    if start != -1 and end != -1 and end > start:
        text = text[start:end+1]
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError("Model did not return a JSON array")
    return data

@router.post("/generate", response_model=GenerateResponse)
async def generate_recommendations(req: GenerateRequest, authorization: Optional[str] = Header(None)):
    try:
        auth_token = None
        if authorization:
            auth_token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        context = await build_user_context(req.user_id, auth_token)
        desired_count = min(max(req.max, 1), 5)
        prompt = build_prompt(req.scope, context, max_items=desired_count)
        raw = call_ollama_prompt(prompt, req.model, timeout=60)
        try:
            logger.info(f"🧠 [Recs] Model: {req.model} | Raw length: {len(raw)} | Preview: {raw[:400]}...")
        except Exception:
            pass
        try:
            recs = parse_recommendations_json(raw)
            try:
                logger.info(f"🧠 [Recs] Parsed items: {len(recs)}")
            except Exception:
                pass
        except Exception as e:
            logger.warning(f"⚠️ Failed to parse JSON from model: {e}")
            recs = []

        # Coerce and cap
        items: List[MLRecommendation] = []
        for r in recs[: desired_count]:
            try:
                item = MLRecommendation(
                    title=str(r.get('title') or r.get('symbol') or 'Recommendation')[:200],
                    description=str(r.get('description') or 'Action recommended')[:1200],
                    reasoning=[str(x) for x in (r.get('reasoning') or [])][:8],
                    actionItems=[str(x) for x in (r.get('actionItems') or r.get('actions') or [])][:8],
                    priority=r.get('priority') or 'medium',
                    confidence=float(r.get('confidence') or 0.8),
                    scope=req.scope,
                    symbol=r.get('symbol'),
                    targetAllocation=r.get('targetAllocation'),
                    timeHorizon=r.get('timeHorizon'),
                    riskScore=r.get('riskScore')
                )
                items.append(item)
            except Exception:
                continue

        # Top-up with sensible defaults if fewer than requested were returned
        if len(items) < desired_count:
            defaults: List[MLRecommendation] = []
            if req.scope == 'portfolio':
                defaults = [
                    MLRecommendation(title="Rebalance to target allocation", description="Adjust holdings to align with risk profile and target mix.", scope=req.scope),
                    MLRecommendation(title="Review concentration risk", description="Check top positions and reduce any single holding exceeding 15% of portfolio.", scope=req.scope),
                    MLRecommendation(title="Automate contributions", description="Set up monthly investments to dollar-cost average into core funds.", scope=req.scope),
                ]
            else:
                defaults = [
                    MLRecommendation(title="Increase savings rate by 1-2%", description="Identify one category to trim and redirect to savings.", scope=req.scope),
                    MLRecommendation(title="Debt repayment plan", description="Prioritize highest-interest debt with extra payments this month.", scope=req.scope),
                    MLRecommendation(title="Set or update 3 goals", description="Create targets for emergency fund, travel, and retirement.", scope=req.scope),
                ]
            for d in defaults:
                if len(items) >= desired_count:
                    break
                items.append(d)

        from datetime import datetime
        return GenerateResponse(
            recommendations=items,
            model=req.model,
            generated_at=datetime.utcnow().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


