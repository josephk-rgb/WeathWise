#!/bin/bash

# Script to add sample financial data for testing personalized AI

echo "🎯 Adding sample financial data for WeathWise AI testing..."

# Get the auth token (you'll need to replace this with your actual token)
# You can get this from the browser's developer tools after logging in
AUTH_TOKEN="your_token_here"

if [ "$AUTH_TOKEN" = "your_token_here" ]; then
    echo "❌ Please update the AUTH_TOKEN variable with your actual JWT token"
    echo "   1. Login to WeathWise frontend"
    echo "   2. Open browser developer tools (F12)"
    echo "   3. Go to Application/Storage tab"
    echo "   4. Find the auth token in localStorage or sessionStorage"
    echo "   5. Copy the token and update this script"
    exit 1
fi

BACKEND_URL="http://localhost:3001/api"
HEADERS="Authorization: Bearer $AUTH_TOKEN"

echo "📊 Adding sample transactions..."

# Sample income transaction
curl -X POST "$BACKEND_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "$HEADERS" \
  -d '{
    "amount": 4500.00,
    "type": "income",
    "category": "salary",
    "description": "Monthly salary",
    "date": "2025-08-15T00:00:00Z",
    "account": "checking"
  }'

# Sample expense transactions
curl -X POST "$BACKEND_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "$HEADERS" \
  -d '{
    "amount": -1200.00,
    "type": "expense",
    "category": "housing",
    "description": "Monthly rent",
    "date": "2025-08-01T00:00:00Z",
    "account": "checking"
  }'

curl -X POST "$BACKEND_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "$HEADERS" \
  -d '{
    "amount": -300.00,
    "type": "expense",
    "category": "food",
    "description": "Groceries and dining",
    "date": "2025-08-10T00:00:00Z",
    "account": "checking"
  }'

echo "💰 Adding sample budget..."

curl -X POST "$BACKEND_URL/budgets" \
  -H "Content-Type: application/json" \
  -H "$HEADERS" \
  -d '{
    "name": "Monthly Budget",
    "totalBudget": 4000.00,
    "period": "monthly",
    "categories": [
      {
        "name": "housing",
        "budgetAmount": 1200.00,
        "spent": 1200.00
      },
      {
        "name": "food",
        "budgetAmount": 400.00,
        "spent": 300.00
      },
      {
        "name": "transportation",
        "budgetAmount": 200.00,
        "spent": 0.00
      }
    ]
  }'

echo "🎯 Adding sample financial goal..."

curl -X POST "$BACKEND_URL/goals" \
  -H "Content-Type: application/json" \
  -H "$HEADERS" \
  -d '{
    "name": "Emergency Fund",
    "targetAmount": 10000.00,
    "currentAmount": 2500.00,
    "targetDate": "2026-08-01T00:00:00Z",
    "category": "savings",
    "description": "Build 6-month emergency fund"
  }'

echo "📈 Adding sample investment..."

curl -X POST "$BACKEND_URL/investments" \
  -H "Content-Type: application/json" \
  -H "$HEADERS" \
  -d '{
    "symbol": "VTI",
    "name": "Vanguard Total Stock Market ETF",
    "shares": 10.5,
    "averageCost": 220.00,
    "currentPrice": 235.00,
    "type": "etf",
    "account": "investment"
  }'

echo "✅ Sample data added! Now try asking the AI:"
echo "   - 'How much did I make last month?'"
echo "   - 'What's my current budget status?'"
echo "   - 'How am I doing with my emergency fund goal?'"
echo "   - 'Should I invest more in VTI?'"
echo ""
echo "🔄 The AI will now have your actual financial context for personalized advice!"
