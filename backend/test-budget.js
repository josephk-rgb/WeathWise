const axios = require('axios');

const baseUrl = 'http://localhost:3001/api';

// Test budget creation with correct format
async function testBudgetCreation() {
  console.log('🧪 Testing Budget Creation...\n');
  
  // Mock user token (would normally come from Auth0)
  const testToken = 'mock_token_123';
  
  const budgetData = {
    category: 'Food',
    allocated: 500,
    month: '2024-09', // Correct format: YYYY-MM
    year: 2024,
    currency: 'USD'
  };
  
  try {
    console.log('📡 Testing POST /api/budgets...');
    console.log('Request data:', budgetData);
    
    const response = await axios({
      method: 'POST',
      url: `${baseUrl}/budgets`,
      data: budgetData,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      timeout: 5000,
      validateStatus: () => true // Don't throw on any status code
    });
    
    console.log(`Response status: ${response.status}`);
    console.log('Response data:', response.data);
    
    if (response.status === 401) {
      console.log('✅ Authentication required (expected for protected route)');
      console.log('💡 This confirms the endpoint exists and requires auth');
    } else if (response.status === 201) {
      console.log('✅ Budget created successfully!');
    } else {
      console.log(`⚠️ Unexpected status: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
  
  console.log('\n🎯 Budget endpoint test complete');
  console.log('💡 Next: Test with real authentication in the frontend');
}

testBudgetCreation().catch(console.error);
