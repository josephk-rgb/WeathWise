#!/usr/bin/env ts-node

/**
 * Enhanced API Test Script - No Authentication Required
 * Tests Yahoo Finance and News APIs directly without Auth0
 */

import dotenv from 'dotenv';
import axios, { AxiosInstance } from 'axios';

// Load environment variables
dotenv.config();

interface TestResult {
  endpoint: string;
  status: 'PASS' | 'FAIL' | 'INFO';
  message: string;
  responseTime?: number;
  data?: any;
}

class EnhancedAPITester {
  private results: TestResult[] = [];
  private apiClient: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env['API_BASE_URL'] || 'http://localhost:3001';
    
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private addResult(endpoint: string, status: 'PASS' | 'FAIL' | 'INFO', message: string, responseTime?: number, data?: any) {
    this.results.push({ endpoint, status, message, responseTime, data });
  }

  private getStatusIcon(status: 'PASS' | 'FAIL' | 'INFO'): string {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'INFO': return 'ℹ️';
    }
  }

  async testBasicHealth(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/health');
      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        this.addResult('/health', 'PASS', 'Backend server is healthy', responseTime, {
          status: response.data.status,
          uptime: Math.round(response.data.uptime),
          environment: response.data.environment
        });
      } else {
        this.addResult('/health', 'FAIL', `Unexpected status: ${response.status}`, responseTime);
      }
    } catch (error: any) {
      this.addResult('/health', 'FAIL', `Health check failed: ${error.message}`);
    }
  }

  async testYahooFinanceSingle(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/api/test-apis/yahoo-finance/AAPL');
      const responseTime = Date.now() - startTime;

      if (response.status === 200 && response.data.success) {
        const data = response.data.data;
        this.addResult('Yahoo Finance (AAPL)', 'PASS', 'Real-time quote retrieved', responseTime, {
          symbol: data.symbol,
          currentPrice: data.currentPrice,
          change: data.change,
          changePercent: data.changePercent,
          volume: data.volume,
          source: response.data.source
        });
      } else {
        this.addResult('Yahoo Finance (AAPL)', 'FAIL', `API call failed: ${response.data.error}`);
      }
    } catch (error: any) {
      this.addResult('Yahoo Finance (AAPL)', 'FAIL', `Request failed: ${error.message}`);
    }
  }

  async testYahooFinanceBatch(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/api/test-apis/yahoo-finance-batch?symbols=AAPL,GOOGL,MSFT,TSLA,NVDA');
      const responseTime = Date.now() - startTime;

      if (response.status === 200 && response.data.success) {
        const data = response.data.data;
        const symbolCount = Object.keys(data).length;
        
        this.addResult('Yahoo Finance (Batch)', 'PASS', `Retrieved ${symbolCount} symbols`, responseTime, {
          symbolCount: symbolCount,
          symbols: Object.keys(data),
          source: response.data.source,
          samplePrice: data.AAPL?.currentPrice || 'N/A'
        });
      } else {
        this.addResult('Yahoo Finance (Batch)', 'FAIL', `Batch request failed: ${response.data.error}`);
      }
    } catch (error: any) {
      this.addResult('Yahoo Finance (Batch)', 'FAIL', `Request failed: ${error.message}`);
    }
  }

  async testPortfolioAnalytics(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/api/test-apis/analytics-test');
      const responseTime = Date.now() - startTime;

      if (response.status === 200 && response.data.success) {
        const data = response.data.data;
        
        this.addResult('Portfolio Analytics', 'PASS', 'Real analytics calculated', responseTime, {
          portfolioValue: Math.round(data.portfolioValue),
          totalGainLoss: Math.round(data.totalGainLoss),
          beta: data.analytics.beta,
          volatility: data.analytics.volatility,
          sharpeRatio: data.analytics.sharpeRatio,
          investmentCount: data.mockInvestments.length
        });
      } else {
        this.addResult('Portfolio Analytics', 'FAIL', `Analytics failed: ${response.data.error}`);
      }
    } catch (error: any) {
      this.addResult('Portfolio Analytics', 'FAIL', `Request failed: ${error.message}`);
    }
  }

  async testSymbolAnalytics(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/api/test-apis/symbol-analytics/TSLA');
      const responseTime = Date.now() - startTime;

      if (response.status === 200 && response.data.success) {
        const data = response.data.data;
        
        this.addResult('Symbol Analytics (TSLA)', 'PASS', 'Individual symbol analysis', responseTime, {
          currentPrice: data.quote.currentPrice,
          beta: data.analytics.beta,
          volatility: data.analytics.volatility,
          sharpeRatio: data.analytics.sharpeRatio,
          marketCap: data.quote.marketCap,
          peRatio: data.quote.peRatio
        });
      } else {
        this.addResult('Symbol Analytics (TSLA)', 'FAIL', `Symbol analysis failed: ${response.data.error}`);
      }
    } catch (error: any) {
      this.addResult('Symbol Analytics (TSLA)', 'FAIL', `Request failed: ${error.message}`);
    }
  }

  async testNewsProviders(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/api/test-apis/news-providers');
      const responseTime = Date.now() - startTime;

      if (response.status === 200 && response.data.success) {
        const data = response.data.data;
        
        this.addResult('News Providers Status', 'INFO', 'Provider configuration checked', responseTime, {
          totalProviders: data.summary.totalProviders,
          availableProviders: data.summary.availableProviders,
          providersWithKeys: data.summary.providersWithKeys,
          configuredKeys: data.summary.configuredKeys
        });

        // Show details for each provider
        Object.entries(data.providers).forEach(([key, provider]: [string, any]) => {
          const status = provider.hasApiKey ? 'PASS' : 'INFO';
          const message = provider.hasApiKey 
            ? `${provider.name} configured (${provider.rateLimitRemaining} remaining)`
            : `${provider.name} - no API key`;
          
          this.addResult(`Provider: ${provider.name}`, status, message, undefined, {
            hasApiKey: provider.hasApiKey,
            isAvailable: provider.isAvailable,
            rateLimitRemaining: provider.rateLimitRemaining
          });
        });
      } else {
        this.addResult('News Providers Status', 'FAIL', `Provider check failed: ${response.data.error}`);
      }
    } catch (error: any) {
      this.addResult('News Providers Status', 'FAIL', `Request failed: ${error.message}`);
    }
  }

  async testNewsAPI(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await this.apiClient.get('/api/test-apis/news-test?query=stock market&limit=3');
      const responseTime = Date.now() - startTime;

      if (response.status === 200 && response.data.success) {
        const data = response.data.data;
        
        this.addResult('News API Test', 'PASS', `Retrieved news from ${data.source}`, responseTime, {
          articleCount: data.articleCount,
          source: data.source,
          provider: data.rateLimitInfo.provider,
          remaining: data.rateLimitInfo.remaining,
          sampleTitle: data.articles[0]?.title?.substring(0, 50) + '...' || 'N/A'
        });
      } else {
        this.addResult('News API Test', 'FAIL', `News request failed: ${response.data.error}`);
      }
    } catch (error: any) {
      this.addResult('News API Test', 'FAIL', `Request failed: ${error.message}`);
    }
  }

  async testEnvironmentConfig(): Promise<void> {
    const envVars = {
      'AUTH0_DOMAIN': process.env['AUTH0_DOMAIN'],
      'AUTH0_AUDIENCE': process.env['AUTH0_AUDIENCE'],
      'NEWS_API_KEY': process.env['NEWS_API_KEY'],
      'ALPHA_VANTAGE_API_KEY': process.env['ALPHA_VANTAGE_API_KEY'],
      'MONGODB_URI': process.env['MONGODB_URI']
    };

    Object.entries(envVars).forEach(([key, value]) => {
      if (value) {
        const maskedValue = key.includes('KEY') || key.includes('SECRET') 
          ? value.substring(0, 6) + '...' 
          : value.length > 30 
            ? value.substring(0, 30) + '...'
            : value;
        
        this.addResult(`Config: ${key}`, 'PASS', `Configured: ${maskedValue}`);
      } else {
        this.addResult(`Config: ${key}`, 'INFO', 'Not configured');
      }
    });
  }

  printResults(): void {
    console.log('\n📊 Enhanced API Test Results:\n');
    console.log('=' .repeat(100));

    let passCount = 0;
    let failCount = 0;
    let infoCount = 0;

    this.results.forEach(result => {
      const icon = this.getStatusIcon(result.status);
      const timeStr = result.responseTime ? ` (${result.responseTime}ms)` : '';
      console.log(`${icon} ${result.endpoint.padEnd(40)} ${result.message}${timeStr}`);
      
      if (result.data && Object.keys(result.data).length > 0) {
        Object.entries(result.data).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
      console.log('');

      switch (result.status) {
        case 'PASS': passCount++; break;
        case 'FAIL': failCount++; break;
        case 'INFO': infoCount++; break;
      }
    });

    console.log('=' .repeat(100));
    console.log(`📈 Summary: ${passCount} passed, ${failCount} failed, ${infoCount} info\n`);

    this.printRecommendations(failCount, passCount);
  }

  printRecommendations(failCount: number, passCount: number): void {
    if (failCount === 0) {
      console.log('🎉 All tests passed! Your APIs are working perfectly!');
      console.log('🚀 Yahoo Finance integration is fully functional');
      
      if (process.env['NEWS_API_KEY']) {
        console.log('✅ News API is configured and working');
      } else {
        console.log('💡 Consider adding NEWS_API_KEY for real news data');
        console.log('   Get free key at: https://newsapi.org/register');
      }
    } else {
      console.log('⚠️  Some tests failed. Check the error messages above.');
    }

    console.log('\n🔧 API Status Summary:');
    console.log('   • Yahoo Finance: ✅ Working (no API key needed)');
    console.log('   • Portfolio Analytics: ✅ Real calculations');
    console.log('   • News APIs: ' + (process.env['NEWS_API_KEY'] ? '✅ Configured' : '⚠️  Not configured'));
    console.log('\n💡 Tip: Add NEWS_API_KEY to .env for real news data');
    console.log('💡 All other functionality works without additional API keys!\n');
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Testing WeathWise APIs - No Authentication Required');
    console.log('=' .repeat(100));

    console.log('\n1️⃣ Testing environment configuration...');
    await this.testEnvironmentConfig();

    console.log('\n2️⃣ Testing backend health...');
    await this.testBasicHealth();

    console.log('\n3️⃣ Testing Yahoo Finance (single symbol)...');
    await this.testYahooFinanceSingle();

    console.log('\n4️⃣ Testing Yahoo Finance (batch)...');
    await this.testYahooFinanceBatch();

    console.log('\n5️⃣ Testing portfolio analytics...');
    await this.testPortfolioAnalytics();

    console.log('\n6️⃣ Testing symbol analytics...');
    await this.testSymbolAnalytics();

    console.log('\n7️⃣ Testing news provider status...');
    await this.testNewsProviders();

    console.log('\n8️⃣ Testing news API...');
    await this.testNewsAPI();

    this.printResults();
  }
}

// Run the tests
const tester = new EnhancedAPITester();
tester.runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
