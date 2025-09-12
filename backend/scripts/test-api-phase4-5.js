#!/usr/bin/env node
const http = require('http');

const BASE_URL = 'http://localhost:3001';

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAPI() {
  console.log('🚀 Testing Phase 4 & 5 API Endpoints...\n');

  const testUserId = '507f1f77bcf86cd799439011'; // Example ObjectId

  const tests = [
    // Performance stats
    {
      name: 'Get Performance Stats',
      method: 'GET',
      path: '/api/enhanced-features/performance/stats'
    },
    
    // Stock search
    {
      name: 'Search Stocks',
      method: 'GET', 
      path: '/api/enhanced-features/stocks/search?q=apple&limit=3'
    },
    
    // Validate stock
    {
      name: 'Validate Stock',
      method: 'GET',
      path: '/api/enhanced-features/stocks/validate/AAPL'
    },
    
    // Portfolio performance
    {
      name: 'Get Portfolio Performance',
      method: 'GET',
      path: `/api/enhanced-features/portfolio/performance?userId=${testUserId}`
    },
    
    // Top movers
    {
      name: 'Get Top Movers',
      method: 'GET',
      path: `/api/enhanced-features/portfolio/top-movers?userId=${testUserId}`
    },
    
    // Asset revaluation suggestions
    {
      name: 'Get Asset Revaluation Suggestions',
      method: 'GET',
      path: `/api/enhanced-features/assets/revaluation-suggestions?userId=${testUserId}`
    },
    
    // Net worth trend (from analytics)
    {
      name: 'Get Net Worth Trend',
      method: 'GET',
      path: `/api/analytics/net-worth-trend-data?userId=${testUserId}&days=30`
    },
    
    // Create snapshot
    {
      name: 'Create Net Worth Snapshot',
      method: 'POST',
      path: `/api/analytics/create-snapshot?userId=${testUserId}`,
      data: { description: 'API test snapshot' }
    },
    
    // Update portfolio prices
    {
      name: 'Update Portfolio Prices',
      method: 'POST',
      path: '/api/enhanced-features/portfolio/update-prices'
    },
    
    // Enhanced dashboard stats
    {
      name: 'Get Enhanced Dashboard Stats',
      method: 'GET',
      path: `/api/analytics/enhanced-dashboard-stats?userId=${testUserId}`
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`🧪 Testing: ${test.name}`);
      const result = await makeRequest(test.method, test.path, test.data);
      
      if (result.status >= 200 && result.status < 400) {
        console.log(`✅ PASS (${result.status})`);
        if (result.data && typeof result.data === 'object' && result.data.success) {
          console.log(`   📊 Data preview:`, JSON.stringify(result.data, null, 2).slice(0, 200) + '...');
        }
        passed++;
      } else {
        console.log(`❌ FAIL (${result.status}): ${JSON.stringify(result.data)}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All API tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check server logs for details.');
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const result = await makeRequest('GET', '/');
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start the backend server first.');
    console.log('   Run: npm start (in the backend directory)');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testAPI();
  }
}

main().catch(console.error);
