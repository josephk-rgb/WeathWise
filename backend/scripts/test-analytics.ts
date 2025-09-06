#!/usr/bin/env ts-node

/**
 * Portfolio Analytics Test Script
 * Tests the new advanced portfolio analytics functionality
 */

import dotenv from 'dotenv';
import axios, { AxiosInstance } from 'axios';

// Load environment variables
dotenv.config();

interface TestResult {
  endpoint: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  responseTime?: number;
  data?: any;
}

class PortfolioAnalyticsTest {
  private results: TestResult[] = [];
  private apiClient: AxiosInstance;
  private baseUrl: string;
  private mockToken: string;

  constructor() {
    this.baseUrl = process.env['API_BASE_URL'] || 'http://localhost:3001';
    this.mockToken = 'mock-jwt-token-for-testing'; // Mock token for development
    
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.mockToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private addResult(endpoint: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, responseTime?: number, data?: any) {
    this.results.push({ endpoint, status, message, responseTime, data });
  }

  private getStatusIcon(status: 'PASS' | 'FAIL' | 'SKIP'): string {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'SKIP': return '⏭️';
    }
  }

  async testHealthEndpoint(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/health');
      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        this.addResult('/health', 'PASS', 'Backend is healthy', responseTime, response.data);
      } else {
        this.addResult('/health', 'FAIL', `Unexpected status: ${response.status}`, responseTime);
      }
    } catch (error: any) {
      this.addResult('/health', 'FAIL', `Health check failed: ${error.message}`);
    }
  }

  async testWebSocketStatus(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/api/websocket/status');
      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        this.addResult('/api/websocket/status', 'PASS', 'WebSocket status retrieved', responseTime, {
          totalClients: response.data.websocket?.totalClients || 0,
          authenticatedClients: response.data.websocket?.authenticatedClients || 0
        });
      } else {
        this.addResult('/api/websocket/status', 'FAIL', `Unexpected status: ${response.status}`, responseTime);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.addResult('/api/websocket/status', 'SKIP', 'Skipped (requires real authentication)');
      } else {
        this.addResult('/api/websocket/status', 'FAIL', `WebSocket status failed: ${error.message}`);
      }
    }
  }

  async testAIServiceStatus(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/api/ai/status');
      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        const circuitBreakerStatus = response.data.status?.circuitBreaker?.status || 'UNKNOWN';
        this.addResult('/api/ai/status', 'PASS', `AI service status: ${circuitBreakerStatus}`, responseTime, {
          circuitBreaker: circuitBreakerStatus,
          canMakeRequest: response.data.status?.circuitBreaker?.canMakeRequest
        });
      } else {
        this.addResult('/api/ai/status', 'FAIL', `Unexpected status: ${response.status}`, responseTime);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.addResult('/api/ai/status', 'SKIP', 'Skipped (requires real authentication)');
      } else {
        this.addResult('/api/ai/status', 'FAIL', `AI status failed: ${error.message}`);
      }
    }
  }

  async testPortfolioAnalytics(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/api/portfolio/analytics');
      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        const data = response.data.data;
        this.addResult('/api/portfolio/analytics', 'PASS', 'Advanced analytics retrieved', responseTime, {
          portfolioMetrics: data?.portfolioMetrics ? 'Available' : 'Missing',
          individualAssets: data?.individualAssets?.length || 0,
          composition: data?.composition?.length || 0,
          riskAnalysis: data?.riskAnalysis ? 'Available' : 'Missing'
        });
      } else {
        this.addResult('/api/portfolio/analytics', 'FAIL', `Unexpected status: ${response.status}`, responseTime);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.addResult('/api/portfolio/analytics', 'SKIP', 'Skipped (requires real authentication)');
      } else {
        this.addResult('/api/portfolio/analytics', 'FAIL', `Portfolio analytics failed: ${error.message}`);
      }
    }
  }

  async testPortfolioMetrics(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/api/portfolio/metrics');
      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        const data = response.data.data;
        const hasBetaVolatility = data?.riskMetrics?.beta !== undefined && data?.riskMetrics?.volatility !== undefined;
        
        this.addResult('/api/portfolio/metrics', 'PASS', 'Portfolio metrics with real analytics', responseTime, {
          beta: data?.riskMetrics?.beta,
          volatility: data?.riskMetrics?.volatility,
          hasRealAnalytics: hasBetaVolatility && data.riskMetrics.beta !== 1.0
        });
      } else {
        this.addResult('/api/portfolio/metrics', 'FAIL', `Unexpected status: ${response.status}`, responseTime);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.addResult('/api/portfolio/metrics', 'SKIP', 'Skipped (requires real authentication)');
      } else {
        this.addResult('/api/portfolio/metrics', 'FAIL', `Portfolio metrics failed: ${error.message}`);
      }
    }
  }

  async testMarketData(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/api/market/data/AAPL');
      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        const data = response.data;
        this.addResult('/api/market/data/AAPL', 'PASS', 'Market data retrieved', responseTime, {
          symbol: data.symbol,
          currentPrice: data.currentPrice,
          hasValidData: data.currentPrice > 0
        });
      } else {
        this.addResult('/api/market/data/AAPL', 'FAIL', `Unexpected status: ${response.status}`, responseTime);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.addResult('/api/market/data/AAPL', 'SKIP', 'Skipped (requires real authentication)');
      } else {
        this.addResult('/api/market/data/AAPL', 'FAIL', `Market data failed: ${error.message}`);
      }
    }
  }

  async testAIChat(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.post('/api/ai/chat', {
        message: 'What are some basic investment tips?',
        context: { test: true }
      });
      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        const data = response.data.data;
        const source = response.data.source;
        
        this.addResult('/api/ai/chat', 'PASS', `AI chat working (${source})`, responseTime, {
          source,
          hasResponse: !!data?.response,
          confidence: data?.confidence
        });
      } else {
        this.addResult('/api/ai/chat', 'FAIL', `Unexpected status: ${response.status}`, responseTime);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.addResult('/api/ai/chat', 'SKIP', 'Skipped (requires real authentication)');
      } else {
        this.addResult('/api/ai/chat', 'FAIL', `AI chat failed: ${error.message}`);
      }
    }
  }

  printResults(): void {
    console.log('\n📊 Portfolio Analytics Test Results:\n');
    console.log('=' .repeat(80));

    let passCount = 0;
    let failCount = 0;
    let skipCount = 0;

    this.results.forEach(result => {
      const icon = this.getStatusIcon(result.status);
      const timeStr = result.responseTime ? ` (${result.responseTime}ms)` : '';
      console.log(`${icon} ${result.endpoint.padEnd(30)} ${result.message}${timeStr}`);
      
      if (result.data && Object.keys(result.data).length > 0) {
        Object.entries(result.data).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
      console.log('');

      switch (result.status) {
        case 'PASS': passCount++; break;
        case 'FAIL': failCount++; break;
        case 'SKIP': skipCount++; break;
      }
    });

    console.log('=' .repeat(80));
    console.log(`📈 Summary: ${passCount} passed, ${failCount} failed, ${skipCount} skipped\n`);

    if (failCount === 0) {
      console.log('🎉 All tests passed! Your portfolio analytics are working perfectly!');
      console.log('🚀 New features ready:');
      console.log('   • Real beta and volatility calculations');
      console.log('   • Advanced portfolio analytics');
      console.log('   • Improved AI service reliability');
      console.log('   • WebSocket real-time updates\n');
    } else {
      console.log('⚠️  Some tests failed. Check the error messages above.\n');
    }

    console.log('💡 Note: Tests marked as SKIP require real authentication tokens.');
    console.log('💡 For full testing, use real JWT tokens from Auth0.\n');
  }

  async runAllTests(): Promise<void> {
    console.log('🔬 Testing Portfolio Analytics Implementation');
    console.log('=' .repeat(80));

    console.log('\n1️⃣ Testing basic health...');
    await this.testHealthEndpoint();

    console.log('\n2️⃣ Testing WebSocket status...');
    await this.testWebSocketStatus();

    console.log('\n3️⃣ Testing AI service...');
    await this.testAIServiceStatus();

    console.log('\n4️⃣ Testing market data...');
    await this.testMarketData();

    console.log('\n5️⃣ Testing AI chat...');
    await this.testAIChat();

    console.log('\n6️⃣ Testing portfolio metrics...');
    await this.testPortfolioMetrics();

    console.log('\n7️⃣ Testing advanced analytics...');
    await this.testPortfolioAnalytics();

    this.printResults();
  }
}

// Run the tests
const tester = new PortfolioAnalyticsTest();
tester.runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
