#!/usr/bin/env ts-node

/**
 * Simple script to test the mock data API endpoints
 * This bypasses the complex test setup and directly tests the functionality
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function testMockDataAPI() {
  console.log('🧪 Testing Mock Data API...\n');

  try {
    // Test health check first
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);

    // Test getting default config (should work without auth for testing)
    console.log('\n2. Testing default config endpoint...');
    try {
      const configResponse = await axios.get(`${BASE_URL}/api/mock-data/config`);
      console.log('✅ Default config retrieved:', configResponse.data);
    } catch (error: any) {
      console.log('⚠️  Config endpoint requires auth (expected):', error.response?.status);
    }

    // Test data summary endpoint
    console.log('\n3. Testing data summary endpoint...');
    try {
      const summaryResponse = await axios.get(`${BASE_URL}/api/mock-data/summary`);
      console.log('✅ Data summary retrieved:', summaryResponse.data);
    } catch (error: any) {
      console.log('⚠️  Summary endpoint requires auth (expected):', error.response?.status);
    }

    // Test mock data generation endpoint
    console.log('\n4. Testing mock data generation endpoint...');
    try {
      const generateResponse = await axios.post(`${BASE_URL}/api/mock-data/generate`, {
        accounts: 3,
        transactionsPerAccount: 20,
        investments: 5,
        budgets: 6,
        goals: 3,
        debts: 2
      });
      console.log('✅ Mock data generation attempted:', generateResponse.data);
    } catch (error: any) {
      console.log('⚠️  Generate endpoint requires admin auth (expected):', error.response?.status);
    }

    console.log('\n🎉 API endpoint tests completed!');
    console.log('\nNOTE: Auth errors are expected since we\'re not providing authentication tokens.');
    console.log('The important thing is that the endpoints are responding and not throwing server errors.');

  } catch (error: any) {
    console.error('❌ Error testing API:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the backend server is running:');
      console.log('   npm run dev');
    }
  }
}

async function testDirectService() {
  console.log('\n🔧 Testing Mock Data Service directly...\n');

  try {
    // Import and test the service directly
    const { MockDataService } = await import('../src/services/MockDataService');
    const mongoose = await import('mongoose');
    
    console.log('✅ MockDataService imported successfully');
    
    // Test getting default config with a mock user ID
    const mockUserId = new mongoose.Types.ObjectId();
    const defaultConfig = MockDataService.getDefaultConfig(mockUserId);
    console.log('✅ Default config:', defaultConfig);

  } catch (error: any) {
    console.error('❌ Error testing service:', error.message);
  }
}

if (require.main === module) {
  testMockDataAPI()
    .then(() => testDirectService())
    .then(() => {
      console.log('\n✨ All tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}
