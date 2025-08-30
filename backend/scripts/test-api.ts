import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

// Mock JWT token for testing (in production, this would come from Auth0)
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdXRoMHxtb2NrLXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MzQ1Njc4NzQsImV4cCI6MTYzNDY1NDI3NH0.mock-signature';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${MOCK_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Health check passed:', response.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
}

async function testAuthEndpoints() {
  console.log('\n🔍 Testing Auth Endpoints...');
  
  try {
    // Test get current user (with mock token)
    const userResponse = await api.get('/auth/me');
    console.log('✅ Get current user:', userResponse.data);
  } catch (error) {
    console.log('❌ Get current user failed:', error.response?.data || error.message);
  }

  try {
    // Test update profile
    const profileData = {
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890'
    };
    const profileResponse = await api.put('/auth/profile', profileData);
    console.log('✅ Update profile:', profileResponse.data);
  } catch (error) {
    console.log('❌ Update profile failed:', error.response?.data || error.message);
  }

  try {
    // Test update preferences
    const preferencesData = {
      currency: 'USD',
      timezone: 'America/New_York',
      notifications: {
        email: true,
        push: false
      }
    };
    const preferencesResponse = await api.put('/auth/preferences', preferencesData);
    console.log('✅ Update preferences:', preferencesResponse.data);
  } catch (error) {
    console.log('❌ Update preferences failed:', error.response?.data || error.message);
  }
}

async function testMarketEndpoints() {
  console.log('\n🔍 Testing Market Endpoints...');
  
  try {
    // Test get market data for a symbol
    const quoteResponse = await api.get('/market/data/AAPL');
    console.log('✅ Get quote for AAPL:', quoteResponse.data);
  } catch (error) {
    console.log('❌ Get quote failed:', error.response?.data || error.message);
  }

  try {
    // Test get multiple quotes
    const quotesResponse = await api.get('/market/data?symbols=AAPL,GOOGL,MSFT');
    console.log('✅ Get multiple quotes:', quotesResponse.data);
  } catch (error) {
    console.log('❌ Get multiple quotes failed:', error.response?.data || error.message);
  }

  try {
    // Test search symbols
    const searchResponse = await api.get('/market/search?query=Apple&limit=5');
    console.log('✅ Search symbols:', searchResponse.data);
  } catch (error) {
    console.log('❌ Search symbols failed:', error.response?.data || error.message);
  }

  try {
    // Test get market summary
    const summaryResponse = await api.get('/market/summary');
    console.log('✅ Get market summary:', summaryResponse.data);
  } catch (error) {
    console.log('❌ Get market summary failed:', error.response?.data || error.message);
  }

  try {
    // Test get market news
    const newsResponse = await api.get('/market/news?query=stock market&limit=5');
    console.log('✅ Get market news:', newsResponse.data);
  } catch (error) {
    console.log('❌ Get market news failed:', error.response?.data || error.message);
  }

  try {
    // Test get news for specific symbol
    const symbolNewsResponse = await api.get('/market/news/AAPL?limit=3');
    console.log('✅ Get symbol news:', symbolNewsResponse.data);
  } catch (error) {
    console.log('❌ Get symbol news failed:', error.response?.data || error.message);
  }
}

async function testPortfolioEndpoints() {
  console.log('\n🔍 Testing Portfolio Endpoints...');
  
  try {
    // Test get portfolio
    const portfolioResponse = await api.get('/portfolio');
    console.log('✅ Get portfolio:', portfolioResponse.data);
  } catch (error) {
    console.log('❌ Get portfolio failed:', error.response?.data || error.message);
  }

  try {
    // Test get portfolio metrics
    const metricsResponse = await api.get('/portfolio/metrics');
    console.log('✅ Get portfolio metrics:', metricsResponse.data);
  } catch (error) {
    console.log('❌ Get portfolio metrics failed:', error.response?.data || error.message);
  }
}

async function testTransactionEndpoints() {
  console.log('\n🔍 Testing Transaction Endpoints...');
  
  try {
    // Test get transactions
    const transactionsResponse = await api.get('/transactions');
    console.log('✅ Get transactions:', transactionsResponse.data);
  } catch (error) {
    console.log('❌ Get transactions failed:', error.response?.data || error.message);
  }

  try {
    // Test create transaction
    const transactionData = {
      amount: -50.00,
      description: 'Test transaction',
      category: 'Food & Dining',
      type: 'expense',
      date: new Date().toISOString()
    };
    const createResponse = await api.post('/transactions', transactionData);
    console.log('✅ Create transaction:', createResponse.data);
  } catch (error) {
    console.log('❌ Create transaction failed:', error.response?.data || error.message);
  }
}

async function testInvestmentEndpoints() {
  console.log('\n🔍 Testing Investment Endpoints...');
  
  try {
    // Test get investments
    const investmentsResponse = await api.get('/investments');
    console.log('✅ Get investments:', investmentsResponse.data);
  } catch (error) {
    console.log('❌ Get investments failed:', error.response?.data || error.message);
  }

  try {
    // Test create investment
    const investmentData = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      shares: 10,
      purchasePrice: 150.00,
      type: 'stock',
      purchaseDate: new Date().toISOString()
    };
    const createResponse = await api.post('/investments', investmentData);
    console.log('✅ Create investment:', createResponse.data);
  } catch (error) {
    console.log('❌ Create investment failed:', error.response?.data || error.message);
  }
}

async function testAIEndpoints() {
  console.log('\n🔍 Testing AI Endpoints...');
  
  try {
    // Test get recommendations
    const recommendationsResponse = await api.get('/ai/recommendations');
    console.log('✅ Get recommendations:', recommendationsResponse.data);
  } catch (error) {
    console.log('❌ Get recommendations failed:', error.response?.data || error.message);
  }

  try {
    // Test chat
    const chatData = {
      message: 'How should I invest $10,000?',
      context: { riskProfile: 'moderate' }
    };
    const chatResponse = await api.post('/ai/chat', chatData);
    console.log('✅ Chat with AI:', chatResponse.data);
  } catch (error) {
    console.log('❌ Chat failed:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Tests...\n');
  
  await testHealthCheck();
  await testAuthEndpoints();
  await testMarketEndpoints();
  await testPortfolioEndpoints();
  await testTransactionEndpoints();
  await testInvestmentEndpoints();
  await testAIEndpoints();
  
  console.log('\n✨ API Testing Complete!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };
