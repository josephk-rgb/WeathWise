"""Financial data service to fetch user's financial information for ML context."""

import logging
from typing import Optional, Dict, Any, List
import httpx
import os

logger = logging.getLogger(__name__)

class FinancialDataService:
    """Service to fetch user financial data from the backend API."""
    
    def __init__(self):
        self.backend_url = os.getenv("BACKEND_API_URL", "http://localhost:3001/api")
    
    async def get_user_financial_context(self, user_id: str, auth_token: str) -> Dict[str, Any]:
        """Fetch comprehensive financial context for a user."""
        context = {
            "user_profile": None,
            "portfolio": None,
            "recent_transactions": [],
            "budgets": [],
            "goals": [],
            "investments": [],
            "total_net_worth": 0,
            "monthly_income": 0,
            "monthly_expenses": 0
        }
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        try:
            async with httpx.AsyncClient() as client:
                # Get user profile
                user_response = await client.get(f"{self.backend_url}/users/{user_id}", headers=headers)
                if user_response.status_code == 200:
                    context["user_profile"] = user_response.json()
                
                # Get portfolio data
                portfolio_response = await client.get(f"{self.backend_url}/portfolio/{user_id}", headers=headers)
                if portfolio_response.status_code == 200:
                    portfolio_data = portfolio_response.json()
                    context["portfolio"] = portfolio_data
                    context["total_net_worth"] = portfolio_data.get("totalValue", 0)
                
                # Get recent transactions (last 30 days)
                transactions_response = await client.get(
                    f"{self.backend_url}/transactions/{user_id}?limit=50", 
                    headers=headers
                )
                if transactions_response.status_code == 200:
                    transactions = transactions_response.json()
                    context["recent_transactions"] = transactions
                    
                    # Calculate monthly income/expenses
                    monthly_income = sum(t["amount"] for t in transactions if t["amount"] > 0)
                    monthly_expenses = sum(abs(t["amount"]) for t in transactions if t["amount"] < 0)
                    context["monthly_income"] = monthly_income
                    context["monthly_expenses"] = monthly_expenses
                
                # Get budgets
                budgets_response = await client.get(f"{self.backend_url}/budgets/{user_id}", headers=headers)
                if budgets_response.status_code == 200:
                    context["budgets"] = budgets_response.json()
                
                # Get financial goals
                goals_response = await client.get(f"{self.backend_url}/goals/{user_id}", headers=headers)
                if goals_response.status_code == 200:
                    context["goals"] = goals_response.json()
                
                # Get investments
                investments_response = await client.get(f"{self.backend_url}/investments/{user_id}", headers=headers)
                if investments_response.status_code == 200:
                    context["investments"] = investments_response.json()
                
                logger.info(f"✅ Retrieved financial context for user {user_id}")
                
        except Exception as e:
            logger.error(f"❌ Failed to fetch financial context for user {user_id}: {e}")
        
        return context
    
    def format_financial_context_for_llm(self, context: Dict[str, Any]) -> str:
        """Format financial context into a prompt for the LLM."""
        
        prompt_parts = []
        
        # User overview
        if context["user_profile"]:
            user = context["user_profile"]
            prompt_parts.append(f"""
## User Financial Profile
- Name: {user.get('name', 'User')}
- Age: {user.get('age', 'Not specified')}
- Risk Tolerance: {user.get('riskTolerance', 'Moderate')}
- Investment Experience: {user.get('investmentExperience', 'Beginner')}
""")
        
        # Portfolio overview
        if context["portfolio"]:
            portfolio = context["portfolio"]
            prompt_parts.append(f"""
## Current Portfolio (Total Value: ${context['total_net_worth']:,.2f})
- Cash: ${portfolio.get('cash', 0):,.2f}
- Stocks: ${portfolio.get('stocks', 0):,.2f}
- Bonds: ${portfolio.get('bonds', 0):,.2f}
- Other Investments: ${portfolio.get('other', 0):,.2f}
- Portfolio Allocation: {portfolio.get('allocation', 'Not specified')}
""")
        
        # Income/Expenses
        if context["monthly_income"] or context["monthly_expenses"]:
            prompt_parts.append(f"""
## Monthly Cash Flow
- Monthly Income: ${context['monthly_income']:,.2f}
- Monthly Expenses: ${context['monthly_expenses']:,.2f}
- Net Cash Flow: ${context['monthly_income'] - context['monthly_expenses']:,.2f}
""")
        
        # Recent transactions (top 5)
        if context["recent_transactions"]:
            prompt_parts.append("## Recent Transactions")
            for i, transaction in enumerate(context["recent_transactions"][:5]):
                amount = transaction.get("amount", 0)
                description = transaction.get("description", "Transaction")
                category = transaction.get("category", "Other")
                prompt_parts.append(f"- {description}: ${amount:,.2f} ({category})")
        
        # Financial goals
        if context["goals"]:
            prompt_parts.append("## Financial Goals")
            for goal in context["goals"][:3]:  # Top 3 goals
                name = goal.get("name", "Goal")
                target = goal.get("targetAmount", 0)
                current = goal.get("currentAmount", 0)
                progress = (current / target * 100) if target > 0 else 0
                prompt_parts.append(f"- {name}: ${current:,.2f} / ${target:,.2f} ({progress:.1f}% complete)")
        
        # Budget status
        if context["budgets"]:
            prompt_parts.append("## Budget Overview")
            for budget in context["budgets"][:3]:  # Top 3 budgets
                category = budget.get("category", "Category")
                spent = budget.get("spent", 0)
                limit = budget.get("limit", 0)
                remaining = limit - spent
                prompt_parts.append(f"- {category}: ${spent:,.2f} / ${limit:,.2f} (${remaining:,.2f} remaining)")
        
        financial_context = "\n".join(prompt_parts)
        
        return f"""
## IMPORTANT: User's Personal Financial Data
The following is the user's actual financial information. Use this data to provide personalized, specific advice:

{financial_context}

When answering the user's question, reference their specific financial situation, portfolio, goals, and spending patterns from the data above.
"""
    
    def get_financial_insights(self, context: Dict[str, Any]) -> List[str]:
        """Generate quick financial insights from user data."""
        insights = []
        
        # Net worth insight
        net_worth = context.get("total_net_worth", 0)
        if net_worth > 100000:
            insights.append(f"You have a strong net worth of ${net_worth:,.2f}")
        elif net_worth > 10000:
            insights.append(f"You're building wealth with ${net_worth:,.2f} in assets")
        else:
            insights.append("Focus on building your emergency fund and initial investments")
        
        # Cash flow insight
        income = context.get("monthly_income", 0)
        expenses = context.get("monthly_expenses", 0)
        if income > expenses:
            surplus = income - expenses
            insights.append(f"You have a positive cash flow of ${surplus:,.2f}/month")
        else:
            deficit = expenses - income
            insights.append(f"You're spending ${deficit:,.2f} more than you earn monthly")
        
        # Portfolio diversification
        portfolio = context.get("portfolio", {})
        if portfolio:
            total = portfolio.get("stocks", 0) + portfolio.get("bonds", 0) + portfolio.get("cash", 0)
            if total > 0:
                stock_pct = (portfolio.get("stocks", 0) / total) * 100
                if stock_pct > 80:
                    insights.append("Your portfolio is heavily weighted in stocks - consider diversification")
                elif stock_pct < 30:
                    insights.append("You may want to increase stock allocation for growth")
        
        return insights
