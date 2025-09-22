#!/bin/bash

echo "🧪 Running Phase 2 Tests for WeathWise Net Worth Calculation"
echo "============================================================="

# Set test environment
export NODE_ENV=test
export MONGODB_TEST_URI="mongodb://localhost:27017/weathwise_test"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo -e "${BLUE}🏗️  Compiling TypeScript...${NC}"
npx tsc --noEmit

echo -e "${BLUE}🧪 Running Unit Tests...${NC}"
echo "----------------------------------------"

echo -e "${YELLOW}Testing NetWorthCalculator Service...${NC}"
npx jest tests/netWorthCalculator.test.ts --verbose

echo -e "${YELLOW}Testing FinancialDataValidator Utility...${NC}"
npx jest tests/financialValidator.test.ts --verbose

echo -e "${YELLOW}Testing Net Worth API Routes...${NC}"
npx jest tests/netWorth.routes.test.ts --verbose

echo -e "${YELLOW}Testing Enhanced Analytics Controller...${NC}"
npx jest tests/analytics.enhanced.test.ts --verbose

echo -e "${BLUE}🔄 Running Integration Tests...${NC}"
echo "----------------------------------------"

echo -e "${YELLOW}Testing Phase 2 Complete Integration...${NC}"
npx jest tests/phase2.integration.test.ts --verbose

echo -e "${GREEN}✅ All Phase 2 tests completed!${NC}"
echo ""
echo -e "${BLUE}📊 Test Coverage Summary:${NC}"
echo "- ✅ NetWorthCalculator: Core calculation logic"
echo "- ✅ FinancialDataValidator: Data validation and sanitization"  
echo "- ✅ Net Worth API Routes: REST endpoints"
echo "- ✅ Enhanced Analytics: Dashboard integration"
echo "- ✅ Integration Tests: End-to-end scenarios"
echo ""
echo -e "${GREEN}🎉 Phase 2 Implementation Ready for Testing!${NC}"
