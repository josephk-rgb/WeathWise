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
        
        # Use consistent keys expected elsewhere; maintain backward-compat shadow keys after fetch
        financial_data = {
            "profile": None,
            "portfolio": None,
            "transactions": [],
            "budgets": [],
            "goals": [],
            "investments": [],
            "accounts": [],
            "debts": [],
            "physical_assets": [],
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
                    "investments": self._get_investments(client, user_id, headers),
                    "accounts": self._get_accounts(client, user_id, headers),
                    "debts": self._get_debts(client, user_id, headers),
                    "physical_assets": self._get_physical_assets(client, user_id, headers)
                }
                
                # Execute all requests in parallel
                results = await asyncio.gather(*tasks.values(), return_exceptions=True)
                
                # Process results
                for key, result in zip(tasks.keys(), results):
                    if isinstance(result, Exception):
                        logger.warning(f"❌ Failed to fetch {key} for user {user_id}: {result}")
                        continue
                    
                    # Normalize profile response shape from /auth/me
                    if key == "profile" and isinstance(result, dict):
                        normalized = self._normalize_profile_response(result)
                        financial_data[key] = normalized
                    else:
                        financial_data[key] = result
                    logger.info(f"✅ Successfully fetched {key} for user {user_id}: {type(result)} with {len(result) if isinstance(result, (list, dict)) else 'N/A'} items")
                
                # Calculate analytics
                financial_data["analytics"] = self._calculate_analytics(financial_data)

                # If portfolio endpoint returned nothing, synthesize minimal portfolio from investments
                try:
                    if not financial_data.get("portfolio") and isinstance(financial_data.get("investments"), list) and financial_data["investments"]:
                        total_value = 0
                        holdings = []
                        for inv in financial_data["investments"]:
                            current_value = (
                                (inv.get("position") or {}).get("marketValue")
                                if isinstance(inv, dict) else 0
                            ) or inv.get("currentValue", 0)
                            total_value += current_value or 0
                            if isinstance(inv, dict):
                                holdings.append({
                                    "symbol": ((inv.get("securityInfo") or {}).get("symbol") if isinstance(inv.get("securityInfo"), dict) else inv.get("symbol")),
                                    "type": ((inv.get("securityInfo") or {}).get("type") if isinstance(inv.get("securityInfo"), dict) else inv.get("type")),
                                    "currentValue": current_value or 0
                                })
                        financial_data["portfolio"] = {
                            "totalValue": total_value,
                            "holdings": holdings
                        }
                        # Recompute analytics with synthesized portfolio
                        financial_data["analytics"] = self._calculate_analytics(financial_data)
                        logger.info(f"ℹ️ Synthesized portfolio from investments: totalValue={total_value:,.2f}, holdings={len(holdings)}")
                    elif financial_data.get("portfolio") is not None:
                        # If portfolio exists but has no holdings, enrich from investments
                        portfolio_obj = financial_data.get("portfolio")
                        has_holdings = isinstance(portfolio_obj, dict) and portfolio_obj.get("holdings") and len(portfolio_obj.get("holdings")) > 0
                        if not has_holdings and isinstance(financial_data.get("investments"), list) and financial_data["investments"]:
                            holdings = []
                            total_value = 0
                            for inv in financial_data["investments"]:
                                if isinstance(inv, dict):
                                    info = inv.get("securityInfo") if isinstance(inv.get("securityInfo"), dict) else {}
                                    current_value = ((inv.get("position") or {}).get("marketValue") if isinstance(inv.get("position"), dict) else None)
                                    if current_value is None:
                                        current_value = inv.get("currentValue")
                                    try:
                                        cv = float(current_value) if current_value is not None else 0
                                    except Exception:
                                        cv = 0
                                    total_value += cv
                                    holdings.append({
                                        "symbol": info.get("symbol") or inv.get("symbol"),
                                        "type": info.get("type") or inv.get("type"),
                                        "currentValue": cv
                                    })
                            if isinstance(portfolio_obj, dict):
                                if portfolio_obj.get("totalValue") in (None, 0):
                                    portfolio_obj["totalValue"] = total_value
                                portfolio_obj["holdings"] = holdings
                                financial_data["portfolio"] = portfolio_obj
                                # Recompute analytics with enriched holdings
                                financial_data["analytics"] = self._calculate_analytics(financial_data)
                                logger.info(f"ℹ️ Enriched portfolio with holdings from investments: holdings={len(holdings)}")
                except Exception as e:
                    logger.warning(f"Failed to synthesize portfolio from investments: {e}")

                # Backward compatibility keys for older consumers/logs
                # Mirror profile and transactions under legacy names
                financial_data["user_profile"] = financial_data.get("profile")
                financial_data["recent_transactions"] = financial_data.get("transactions", [])
                
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

    def _normalize_profile_response(self, user_obj: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize /auth/me full user object into a concise profile shape for LLM context.
        Keeps important fields and derives a display name.
        """
        try:
            # Nested user profile if present
            nested = user_obj.get("profile") if isinstance(user_obj, dict) else None

            first_name = None
            last_name = None
            email = None
            role = None
            risk_profile = None
            investment_experience = None

            if isinstance(nested, dict):
                first_name = nested.get("firstName") or nested.get("given_name")
                last_name = nested.get("lastName") or nested.get("family_name")
                risk_profile = nested.get("riskProfile") or nested.get("risk_profile")
                investment_experience = nested.get("investmentExperience") or nested.get("investment_experience")

            email = user_obj.get("email") if isinstance(user_obj, dict) else None
            role = user_obj.get("role") if isinstance(user_obj, dict) else None

            # Build display name preference: first+last -> nested name -> user name -> email -> "User"
            display_name = None
            if first_name or last_name:
                display_name = f"{first_name or ''} {last_name or ''}".strip()
            if not display_name:
                display_name = (nested or {}).get("name") if isinstance(nested, dict) else None
            if not display_name:
                display_name = user_obj.get("name") if isinstance(user_obj, dict) else None
            if not display_name:
                display_name = email
            if not display_name:
                display_name = "User"

            # Risk tolerance string
            risk_level = None
            if isinstance(risk_profile, dict):
                risk_level = risk_profile.get("level") or risk_profile.get("riskLevel")
            if not risk_level and isinstance(nested, dict):
                risk_level = nested.get("riskTolerance") or nested.get("riskToleranceLevel")

            normalized: Dict[str, Any] = {
                "name": display_name,
                "email": email,
                "role": role,
                "riskProfile": {"level": risk_level or "moderate"},
                "investmentExperience": investment_experience or "Beginner",
                "firstName": first_name,
                "lastName": last_name,
            }

            return normalized
        except Exception as e:
            logger.warning(f"Failed to normalize profile response: {e}")
            # Fallback minimal profile
            return {
                "name": user_obj.get("email") if isinstance(user_obj, dict) else "User",
                "riskProfile": {"level": "moderate"},
                "investmentExperience": "Beginner",
            }
    
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
                    body = response.json()
                    # Most backend endpoints wrap payload in { success, data }
                    if isinstance(body, dict) and 'data' in body:
                        return body.get('data')
                    return body
                else:
                    logger.warning(f"❌ Portfolio request failed for {endpoint}: {response.status_code}")
                    
        except Exception as e:
            logger.warning(f"Failed to get portfolio data: {e}")
        return None
    
    async def _get_transactions(self, client: httpx.AsyncClient, user_id: str, headers: Dict) -> List[Dict]:
        """Get recent transactions"""
        try:
            # The backend routes don't use user_id in path - they get it from JWT token
            # Fetch last 30 days by default to compute monthly metrics correctly
            from datetime import datetime, timedelta
            end_date = datetime.utcnow().date()
            start_date = (end_date - timedelta(days=30))
            start_str = start_date.isoformat()
            end_str = end_date.isoformat()

            endpoints = [
                f"{self.backend_url}/transactions?startDate={start_str}&endDate={end_str}&limit=500",
                f"{self.backend_url}/transactions?limit=100",
                f"{self.backend_url}/transactions"
            ]
            
            for endpoint in endpoints:
                response = await client.get(endpoint, headers=headers)
                if response.status_code == 200:
                    logger.info(f"✅ Got transactions data from {endpoint}: {response.status_code}")
                    body = response.json()
                    if isinstance(body, list):
                        return body
                    if isinstance(body, dict):
                        # Prefer standard {success, data}
                        if 'data' in body and isinstance(body['data'], list):
                            return body['data']
                        # Fallback to legacy key
                        if 'transactions' in body and isinstance(body['transactions'], list):
                            return body['transactions']
                    return []
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
                    body = response.json()
                    if isinstance(body, list):
                        return body
                    if isinstance(body, dict):
                        if 'data' in body and isinstance(body['data'], list):
                            return body['data']
                        if 'budgets' in body and isinstance(body['budgets'], list):
                            return body['budgets']
                    return []
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
                    body = response.json()
                    if isinstance(body, list):
                        return body
                    if isinstance(body, dict):
                        if 'data' in body and isinstance(body['data'], list):
                            return body['data']
                        if 'goals' in body and isinstance(body['goals'], list):
                            return body['goals']
                    return []
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
                    body = response.json()
                    if isinstance(body, list):
                        return body
                    if isinstance(body, dict):
                        if 'data' in body and isinstance(body['data'], list):
                            return body['data']
                        if 'investments' in body and isinstance(body['investments'], list):
                            return body['investments']
                    return []
                else:
                    logger.warning(f"❌ Investments request failed for {endpoint}: {response.status_code}")
                    
        except Exception as e:
            logger.warning(f"Failed to get investments: {e}")
        return []

    async def _get_accounts(self, client: httpx.AsyncClient, user_id: str, headers: Dict) -> List[Dict]:
        """Get accounts data"""
        try:
            endpoints = [
                f"{self.backend_url}/accounts"
            ]
            for endpoint in endpoints:
                response = await client.get(endpoint, headers=headers)
                if response.status_code == 200:
                    logger.info(f"✅ Got accounts data from {endpoint}: {response.status_code}")
                    body = response.json()
                    if isinstance(body, list):
                        return body
                    if isinstance(body, dict):
                        if 'data' in body and isinstance(body['data'], list):
                            return body['data']
                        if 'accounts' in body and isinstance(body['accounts'], list):
                            return body['accounts']
                    return []
                else:
                    logger.warning(f"❌ Accounts request failed for {endpoint}: {response.status_code}")
        except Exception as e:
            logger.warning(f"Failed to get accounts: {e}")
        return []

    async def _get_debts(self, client: httpx.AsyncClient, user_id: str, headers: Dict) -> List[Dict]:
        """Get debts data"""
        try:
            endpoints = [
                f"{self.backend_url}/debts"
            ]
            for endpoint in endpoints:
                response = await client.get(endpoint, headers=headers)
                if response.status_code == 200:
                    logger.info(f"✅ Got debts data from {endpoint}: {response.status_code}")
                    body = response.json()
                    if isinstance(body, list):
                        return body
                    if isinstance(body, dict):
                        if 'data' in body and isinstance(body['data'], list):
                            return body['data']
                        if 'debts' in body and isinstance(body['debts'], list):
                            return body['debts']
                    return []
                else:
                    logger.warning(f"❌ Debts request failed for {endpoint}: {response.status_code}")
        except Exception as e:
            logger.warning(f"Failed to get debts: {e}")
        return []

    async def _get_physical_assets(self, client: httpx.AsyncClient, user_id: str, headers: Dict) -> List[Dict]:
        """Get physical assets data"""
        try:
            endpoints = [
                f"{self.backend_url}/physicalAssets"
            ]
            for endpoint in endpoints:
                response = await client.get(endpoint, headers=headers)
                if response.status_code == 200:
                    logger.info(f"✅ Got physical assets data from {endpoint}: {response.status_code}")
                    body = response.json()
                    if isinstance(body, list):
                        return body
                    if isinstance(body, dict):
                        if 'data' in body and isinstance(body['data'], list):
                            return body['data']
                        if 'assets' in body and isinstance(body['assets'], list):
                            return body['assets']
                    return []
                else:
                    logger.warning(f"❌ Physical assets request failed for {endpoint}: {response.status_code}")
        except Exception as e:
            logger.warning(f"Failed to get physical assets: {e}")
        return []
    
    def _calculate_analytics(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate financial analytics from the data"""
        analytics = {
            "total_net_worth": 0,
            "liabilities_total": 0,
            "assets_total": 0,
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
            # Accounts/Assets/Debts totals
            try:
                accounts = financial_data.get("accounts", []) or []
                assets = financial_data.get("physical_assets", []) or []
                debts = financial_data.get("debts", []) or []

                accounts_total = 0
                for acc in accounts:
                    if isinstance(acc, dict):
                        bal = acc.get("balance") or (acc.get("currentBalance") if isinstance(acc.get("currentBalance"), (int, float)) else None)
                        try:
                            accounts_total += float(bal) if bal is not None else 0
                        except Exception:
                            pass

                assets_total = 0
                for a in assets:
                    if isinstance(a, dict):
                        val = a.get("valuation") or a.get("currentValue") or a.get("value")
                        try:
                            assets_total += float(val) if val is not None else 0
                        except Exception:
                            pass

                debts_total = 0
                for d in debts:
                    if isinstance(d, dict):
                        bal = d.get("currentBalance") or d.get("balance") or d.get("principalRemaining")
                        try:
                            debts_total += float(bal) if bal is not None else 0
                        except Exception:
                            pass

                analytics["assets_total"] = accounts_total + assets_total
                analytics["liabilities_total"] = debts_total
            except Exception as e:
                logger.warning(f"Accounts/assets/debts aggregation error: {e}")
                
                # Investment allocation
                holdings = portfolio.get("holdings", [])
                total_value = sum(h.get("currentValue", 0) for h in holdings)
                if total_value > 0:
                    for holding in holdings:
                        asset_type = holding.get("type", "unknown")
                        value = holding.get("currentValue", 0)
                        percentage = (value / total_value) * 100
                        analytics["investment_allocation"][asset_type] = analytics["investment_allocation"].get(asset_type, 0) + percentage
            
            # Transaction analytics (tolerate nested transactionInfo)
            transactions = financial_data.get("transactions", [])
            if transactions:
                income = 0
                expenses = 0
                for t in transactions:
                    if isinstance(t, dict):
                        info = t.get("transactionInfo") if isinstance(t.get("transactionInfo"), dict) else None
                        amount = None
                        ttype = None
                        if info:
                            amount = info.get("amount")
                            ttype = info.get("type")
                        else:
                            amount = t.get("amount")
                            ttype = t.get("type")
                        try:
                            val = float(amount) if amount is not None else 0
                        except Exception:
                            val = 0
                        if ttype == 'income':
                            income += max(0, val)
                        elif ttype == 'expense':
                            expenses += abs(val)

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
        # Tolerate both shapes
        profile = financial_data.get("profile") or financial_data.get("user_profile")
        if profile:
            context_parts.append(f"""
## 👤 Your WeathWise Profile
- **Name**: {profile.get('name') or ((profile.get('firstName', '') + ' ' + profile.get('lastName', '')).strip()) or profile.get('email') or 'User'}
- **Risk Tolerance**: {((profile.get('riskProfile') or {}).get('level')) or 'moderate'}
- **Investment Experience**: {profile.get('investmentExperience', 'Beginner')}
""")
        
        # Account status summary
        transactions = financial_data.get("transactions") or financial_data.get("recent_transactions") or []
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
            holdings = portfolio.get("holdings", []) if isinstance(portfolio, dict) else []
            if net_worth > 0:
                context_parts.append(f"""
## 💰 Portfolio Overview
- **Total Portfolio Value**: ${analytics['total_net_worth']:,.2f}
- **Holdings Tracked**: {len(holdings)}
- **Investment Allocation**:""")
                
                for asset_type, percentage in analytics.get("investment_allocation", {}).items():
                    context_parts.append(f"  - {asset_type.title()}: {percentage:.1f}%")
                # Add top holdings list if available
                if holdings:
                    # Attempt to sort by currentValue desc
                    try:
                        sorted_holdings = sorted(holdings, key=lambda h: h.get('currentValue', 0) or 0, reverse=True)
                    except Exception:
                        sorted_holdings = holdings
                    top = [h.get('symbol') or h.get('name') or '—' for h in sorted_holdings[:5]]
                    context_parts.append(f"- **Top Holdings**: {', '.join([str(x) for x in top if x])}")
            else:
                # If we have holdings but computed value is zero, still show count
                if holdings:
                    context_parts.append(f"""
## 💰 WeathWise Portfolio
- **Holdings Tracked**: {len(holdings)}
- **Portfolio Value**: ${sum(h.get('currentValue', 0) for h in holdings):,.2f}
""")
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

        # Assets and Debts summary if available
        if analytics.get("assets_total", 0) > 0 or analytics.get("liabilities_total", 0) > 0:
            net = (analytics.get("assets_total", 0) or 0) - (analytics.get("liabilities_total", 0) or 0)
            context_parts.append(f"""
## 🧾 Balance Sheet Snapshot
- **Total Assets**: ${analytics.get('assets_total', 0):,.2f}
- **Total Liabilities**: ${analytics.get('liabilities_total', 0):,.2f}
- **Net Worth (approx.)**: ${net:,.2f}
""")

        # Accounts summary
        accounts = financial_data.get("accounts", []) or []
        if accounts:
            try:
                accounts_total = 0
                institutions = {}
                for acc in accounts:
                    if isinstance(acc, dict):
                        bal = acc.get("balance") or acc.get("currentBalance")
                        inst = acc.get("institution") or acc.get("name") or acc.get("type")
                        try:
                            accounts_total += float(bal) if bal is not None else 0
                        except Exception:
                            pass
                        if inst:
                            institutions[inst] = institutions.get(inst, 0) + 1
                top_insts = ", ".join([f"{k} ({v})" for k, v in list(institutions.items())[:3]])
                context_parts.append(f"""
## 🏦 Accounts Summary
- **Cash & Bank Balances**: ${accounts_total:,.2f}
- **Institutions**: {top_insts}
""")
            except Exception:
                pass

        # Debts summary
        debts = financial_data.get("debts", []) or []
        if debts:
            try:
                debts_total = 0
                for d in debts:
                    if isinstance(d, dict):
                        bal = d.get("currentBalance") or d.get("balance") or d.get("principalRemaining")
                        try:
                            debts_total += float(bal) if bal is not None else 0
                        except Exception:
                            pass
                context_parts.append(f"""
## 💳 Debts Overview
- **Total Debt**: ${debts_total:,.2f}
""")
            except Exception:
                pass

        # Physical assets summary
        phys_assets = financial_data.get("physical_assets", []) or []
        if phys_assets:
            try:
                phys_total = 0
                for a in phys_assets:
                    if isinstance(a, dict):
                        val = a.get("valuation") or a.get("currentValue") or a.get("value")
                        try:
                            phys_total += float(val) if val is not None else 0
                        except Exception:
                            pass
                context_parts.append(f"""
## 🏠 Physical Assets
- **Asset Value**: ${phys_total:,.2f}
""")
            except Exception:
                pass
        
        # Goals (use backend field names: title/currentAmount/targetAmount)
        if goals:
            context_parts.append("## 🎯 Financial Goals")
            for goal in goals[:3]:  # Top 3 goals
                name = goal.get("title") or goal.get("name") or "Unknown Goal"
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
        
        # Recent activity (derive from nested transactionInfo)
        if transactions:
            recent_spending = 0
            for t in transactions[:10]:
                if isinstance(t, dict):
                    info = t.get("transactionInfo") if isinstance(t.get("transactionInfo"), dict) else None
                    amount = None
                    ttype = None
                    if info:
                        amount = info.get("amount")
                        ttype = info.get("type")
                    else:
                        amount = t.get("amount")
                        ttype = t.get("type")
                    try:
                        val = float(amount) if amount is not None else 0
                    except Exception:
                        val = 0
                    if ttype == 'expense':
                        recent_spending += abs(val)
            context_parts.append(f"""
## 📈 Recent Activity
- **Recent Spending** (last 10 transactions): ${recent_spending:,.2f}
- **Transaction Count**: {len(transactions)} transactions
""")
        
        return "\n".join(context_parts) if context_parts else ""

# Global instance
backend_proxy = BackendProxyService()
