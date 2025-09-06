"""
Backend proxy service for ML services to communicate with authenticated backend API.
This approach avoids JWT validation in ML services by using backend as an authentication proxy.
"""

import httpx
import os
import logging
from typing import Dict, Any, Optional, List
import asyncio

logger = logging.getLogger(__name__)

class BackendProxyService:
    """Service to proxy requests to authenticated backend API"""
    
    def __init__(self):
        self.backend_url = os.getenv("BACKEND_API_URL", "http://localhost:3001/api")
        self.timeout = 30
    
    async def get_user_financial_data_with_auth(self, user_id: str, auth_token: str) -> Dict[str, Any]:
        """
        Get comprehensive user financial data through backend proxy.
        Backend validates the token and returns user data.
        """
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        financial_data = {
            "user_profile": None,
            "portfolio": None,
            "recent_transactions": [],
            "budgets": [],
            "goals": [],
            "investments": [],
            "analytics": {}
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Create tasks for parallel requests
                tasks = {
                    "profile": self._get_user_profile(client, user_id, headers),
                    "portfolio": self._get_portfolio_data(client, user_id, headers),
                    "transactions": self._get_transactions(client, user_id, headers),
                    "budgets": self._get_budgets(client, user_id, headers),
                    "goals": self._get_goals(client, user_id, headers),
                    "investments": self._get_investments(client, user_id, headers)
                }
                
                # Execute all requests in parallel
                results = await asyncio.gather(*tasks.values(), return_exceptions=True)
                
                # Process results
                for key, result in zip(tasks.keys(), results):
                    if isinstance(result, Exception):
                        logger.warning(f"❌ Failed to fetch {key} for user {user_id}: {result}")
                        continue
                    
                    financial_data[key] = result
                    logger.info(f"✅ Successfully fetched {key} for user {user_id}: {type(result)} with {len(result) if isinstance(result, (list, dict)) else 'N/A'} items")
                
                # Calculate analytics
                financial_data["analytics"] = self._calculate_analytics(financial_data)
                
                logger.info(f"✅ Retrieved financial data for user {user_id}")
                return financial_data
                
        except Exception as e:
            logger.error(f"❌ Backend proxy error for user {user_id}: {e}")
            return financial_data
    
    async def _get_user_profile(self, client: httpx.AsyncClient, user_id: str, headers: Dict) -> Optional[Dict]:
        """Get user profile data"""
        try:
            response = await client.get(f"{self.backend_url}/auth/me", headers=headers)
            if response.status_code == 200:
                logger.info(f"✅ Got user profile data: {response.status_code}")
                return response.json()
            else:
                logger.warning(f"❌ User profile request failed: {response.status_code} - {response.text}")
        except Exception as e:
            logger.warning(f"Failed to get user profile: {e}")
        return None
    
    async def _get_portfolio_data(self, client: httpx.AsyncClient, user_id: str, headers: Dict) -> Optional[Dict]:
        """Get portfolio data"""
        try:
            # The backend routes don't use user_id in path - they get it from JWT token
            endpoints = [
                f"{self.backend_url}/portfolio/overview",
                f"{self.backend_url}/portfolio/metrics",
                f"{self.backend_url}/portfolio"
            ]
            
            for endpoint in endpoints:
                response = await client.get(endpoint, headers=headers)
                if response.status_code == 200:
                    logger.info(f"✅ Got portfolio data from {endpoint}: {response.status_code}")
                    return response.json()
                else:
                    logger.warning(f"❌ Portfolio request failed for {endpoint}: {response.status_code}")
                    
        except Exception as e:
            logger.warning(f"Failed to get portfolio data: {e}")
        return None
    
    async def _get_transactions(self, client: httpx.AsyncClient, user_id: str, headers: Dict) -> List[Dict]:
        """Get recent transactions"""
        try:
            # The backend routes don't use user_id in path - they get it from JWT token
            endpoints = [
                f"{self.backend_url}/transactions?limit=50",
                f"{self.backend_url}/transactions"
            ]
            
            for endpoint in endpoints:
                response = await client.get(endpoint, headers=headers)
                if response.status_code == 200:
                    logger.info(f"✅ Got transactions data from {endpoint}: {response.status_code}")
                    data = response.json()
                    return data if isinstance(data, list) else data.get("transactions", [])
                else:
                    logger.warning(f"❌ Transactions request failed for {endpoint}: {response.status_code}")
                    
        except Exception as e:
            logger.warning(f"Failed to get transactions: {e}")
        return []
    
    async def _get_budgets(self, client: httpx.AsyncClient, user_id: str, headers: Dict) -> List[Dict]:
        """Get budget data"""
        try:
            # The backend routes don't use user_id in path - they get it from JWT token
            endpoints = [
                f"{self.backend_url}/budgets"
            ]
            
            for endpoint in endpoints:
                response = await client.get(endpoint, headers=headers)
                if response.status_code == 200:
                    logger.info(f"✅ Got budgets data from {endpoint}: {response.status_code}")
                    data = response.json()
                    return data if isinstance(data, list) else data.get("budgets", [])
                else:
                    logger.warning(f"❌ Budgets request failed for {endpoint}: {response.status_code}")
                    
        except Exception as e:
            logger.warning(f"Failed to get budgets: {e}")
        return []
    
    async def _get_goals(self, client: httpx.AsyncClient, user_id: str, headers: Dict) -> List[Dict]:
        """Get financial goals"""
        try:
            # The backend routes don't use user_id in path - they get it from JWT token
            endpoints = [
                f"{self.backend_url}/goals"
            ]
            
            for endpoint in endpoints:
                response = await client.get(endpoint, headers=headers)
                if response.status_code == 200:
                    logger.info(f"✅ Got goals data from {endpoint}: {response.status_code}")
                    data = response.json()
                    return data if isinstance(data, list) else data.get("goals", [])
                else:
                    logger.warning(f"❌ Goals request failed for {endpoint}: {response.status_code}")
                    
        except Exception as e:
            logger.warning(f"Failed to get goals: {e}")
        return []
    
    async def _get_investments(self, client: httpx.AsyncClient, user_id: str, headers: Dict) -> List[Dict]:
        """Get investment data"""
        try:
            # The backend routes don't use user_id in path - they get it from JWT token
            endpoints = [
                f"{self.backend_url}/investments"
            ]
            
            for endpoint in endpoints:
                response = await client.get(endpoint, headers=headers)
                if response.status_code == 200:
                    logger.info(f"✅ Got investments data from {endpoint}: {response.status_code}")
                    data = response.json()
                    return data if isinstance(data, list) else data.get("investments", [])
                else:
                    logger.warning(f"❌ Investments request failed for {endpoint}: {response.status_code}")
                    
        except Exception as e:
            logger.warning(f"Failed to get investments: {e}")
        return []
    
    def _calculate_analytics(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate financial analytics from the data"""
        analytics = {
            "total_net_worth": 0,
            "monthly_income": 0,
            "monthly_expenses": 0,
            "savings_rate": 0,
            "debt_to_income": 0,
            "investment_allocation": {},
            "budget_utilization": {}
        }
        
        try:
            # Portfolio analytics
            portfolio = financial_data.get("portfolio")
            if portfolio:
                analytics["total_net_worth"] = portfolio.get("totalValue", 0)
                
                # Investment allocation
                holdings = portfolio.get("holdings", [])
                total_value = sum(h.get("currentValue", 0) for h in holdings)
                if total_value > 0:
                    for holding in holdings:
                        asset_type = holding.get("type", "unknown")
                        value = holding.get("currentValue", 0)
                        percentage = (value / total_value) * 100
                        analytics["investment_allocation"][asset_type] = analytics["investment_allocation"].get(asset_type, 0) + percentage
            
            # Transaction analytics
            transactions = financial_data.get("transactions", [])
            if transactions:
                income = sum(t.get("amount", 0) for t in transactions if t.get("amount", 0) > 0)
                expenses = sum(abs(t.get("amount", 0)) for t in transactions if t.get("amount", 0) < 0)
                
                analytics["monthly_income"] = income
                analytics["monthly_expenses"] = expenses
                
                if income > 0:
                    analytics["savings_rate"] = max(0, (income - expenses) / income * 100)
            
            # Budget analytics
            budgets = financial_data.get("budgets", [])
            for budget in budgets:
                category = budget.get("category", "unknown")
                spent = budget.get("spent", 0)
                limit = budget.get("limit", 0)
                if limit > 0:
                    utilization = (spent / limit) * 100
                    analytics["budget_utilization"][category] = utilization
            
        except Exception as e:
            logger.warning(f"Analytics calculation error: {e}")
        
        return analytics
    
    def format_financial_context_for_llm(self, financial_data: Dict[str, Any]) -> str:
        """Format financial data into LLM context"""
        context_parts = []
        
        # User profile
        profile = financial_data.get("profile")
        if profile:
            context_parts.append(f"""
## 👤 Your WeathWise Profile
- **Name**: {profile.get('name', 'User')}
- **Risk Tolerance**: {profile.get('riskProfile', {}).get('level', 'moderate')}
- **Investment Experience**: {profile.get('investmentExperience', 'Beginner')}
""")
        
        # Account status summary
        transactions = financial_data.get("transactions", [])
        goals = financial_data.get("goals", [])
        budgets = financial_data.get("budgets", [])
        investments = financial_data.get("investments", [])
        
        has_data = bool(transactions or goals or budgets or investments)
        
        if not has_data:
            context_parts.append(f"""
## 📊 WeathWise Account Status
- **Account Type**: New WeathWise user (getting started)
- **Connected Data**: Profile setup complete
- **Next Steps**: Ready to connect accounts and add financial data
- **Available Features**: Budgeting, goal tracking, investment monitoring, AI insights
""")
        else:
            context_parts.append(f"""
## 📊 WeathWise Account Status  
- **Account Type**: Active WeathWise user with financial data
- **Connected Data**: {len(transactions)} transactions, {len(goals)} goals, {len(budgets)} budgets, {len(investments)} investments
- **AI Insights**: Personalized recommendations based on your actual data
""")
        
        # Portfolio summary - show even if no value yet
        portfolio = financial_data.get("portfolio")
        analytics = financial_data.get("analytics", {})
        
        if portfolio:
            net_worth = analytics.get("total_net_worth", 0)
            if net_worth > 0:
                context_parts.append(f"""
## 💰 Portfolio Overview
- **Total Portfolio Value**: ${analytics['total_net_worth']:,.2f}
- **Investment Allocation**:""")
                
                for asset_type, percentage in analytics.get("investment_allocation", {}).items():
                    context_parts.append(f"  - {asset_type.title()}: {percentage:.1f}%")
            else:
                # Show portfolio status even if no investments yet
                context_parts.append(f"""
## 💰 WeathWise Portfolio
- **Current Status**: Ready to start investing
- **Portfolio Value**: No investments tracked yet
- **WeathWise Recommendation**: Use our investment tracking to add your current holdings and get AI-powered portfolio analysis
- **Suitable for**: Your moderate risk tolerance suggests diversified index funds or ETFs
""")
        
        # Financial health - show meaningful info even without transactions
        if analytics.get("monthly_income", 0) > 0:
            context_parts.append(f"""
## 📊 Financial Health
- **Monthly Income**: ${analytics['monthly_income']:,.2f}
- **Monthly Expenses**: ${analytics['monthly_expenses']:,.2f}
- **Savings Rate**: {analytics['savings_rate']:.1f}%
- **Monthly Surplus**: ${analytics['monthly_income'] - analytics['monthly_expenses']:,.2f}
""")
        elif not transactions:
            # No transaction data yet - provide helpful context
            context_parts.append(f"""
## 📊 WeathWise Financial Tracking
- **Transaction History**: No transactions imported yet
- **Getting Started**: Connect your bank accounts or manually add transactions in WeathWise
- **AI Insights Available**: Once you add transaction data, I can provide personalized spending analysis, budget recommendations, and financial health insights
- **WeathWise Features**: Automatic categorization, trend analysis, and smart budgeting tools
""")
        
        # Goals
        if goals:
            context_parts.append("## 🎯 Financial Goals")
            for goal in goals[:3]:  # Top 3 goals
                name = goal.get("name", "Unknown Goal")
                target = goal.get("targetAmount", 0)
                current = goal.get("currentAmount", 0)
                progress = (current / target * 100) if target > 0 else 0
                context_parts.append(f"- **{name}**: ${current:,.2f} / ${target:,.2f} ({progress:.1f}% complete)")
        else:
            # No goals set yet
            context_parts.append(f"""
## 🎯 WeathWise Financial Goals
- **Current Goals**: No financial goals created yet
- **WeathWise Feature**: Use our goal-setting tools to create emergency fund, retirement, or savings goals
- **AI Coaching**: I can help track progress and suggest adjustments to reach your goals faster
""")
        
        # Budgets
        if budgets:
            context_parts.append("## 💰 Budget Status")
            for budget in budgets[:3]:  # Top 3 budgets
                name = budget.get("name", "Budget")
                spent = budget.get("spent", 0)
                limit = budget.get("limit", 0)
                if limit > 0:
                    utilization = (spent / limit) * 100
                    context_parts.append(f"- **{name}**: ${spent:,.2f} / ${limit:,.2f} ({utilization:.1f}% used)")
        else:
            # No budgets set yet
            context_parts.append(f"""
## 💰 WeathWise Budget Management
- **Current Budgets**: No budgets created yet  
- **Smart Budgeting**: WeathWise can automatically categorize expenses and suggest budget amounts
- **AI Recommendations**: I can analyze your spending patterns and recommend optimal budget allocations
- **Getting Started**: Create budgets for housing, food, transportation, and entertainment in WeathWise
""")
        
        # Recent activity
        if transactions:
            recent_spending = sum(abs(t.get("amount", 0)) for t in transactions[:10] if t.get("amount", 0) < 0)
            context_parts.append(f"""
## 📈 Recent Activity
- **Recent Spending** (last 10 transactions): ${recent_spending:,.2f}
- **Transaction Count**: {len(transactions)} transactions
""")
        
        return "\n".join(context_parts) if context_parts else ""

# Global instance
backend_proxy = BackendProxyService()
