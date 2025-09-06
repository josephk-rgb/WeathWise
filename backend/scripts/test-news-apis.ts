#!/usr/bin/env ts-node

/**
 * News API Integration Test Script
 * Tests all news providers and validates API key configuration
 */

import dotenv from 'dotenv';
import axios from 'axios';
import { EnhancedNewsService } from '../src/services/enhancedNewsService';

// Load environment variables
dotenv.config();

interface TestResult {
  provider: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'CONFIG';
  message: string;
  responseTime?: number;
  articlesCount?: number;
  rateLimitRemaining?: number;
}

class NewsAPITester {
  private results: TestResult[] = [];
  private newsService: EnhancedNewsService;

  constructor() {
    this.newsService = new EnhancedNewsService();
  }

  private addResult(provider: string, status: 'PASS' | 'FAIL' | 'SKIP' | 'CONFIG', message: string, responseTime?: number, articlesCount?: number, rateLimitRemaining?: number) {
    this.results.push({ provider, status, message, responseTime, articlesCount, rateLimitRemaining });
  }

  private getStatusIcon(status: 'PASS' | 'FAIL' | 'SKIP' | 'CONFIG'): string {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'SKIP': return '⏭️';
      case 'CONFIG': return '🔧';
    }
  }

  async testEnvironmentConfiguration(): Promise<void> {
    console.log('🔧 Testing API Key Configuration...\n');

    const apiKeys = {
      'NewsAPI.org': process.env['NEWS_API_KEY'],
      'Alpha Vantage': process.env['ALPHA_VANTAGE_API_KEY'],
      'Polygon.io': process.env['POLYGON_API_KEY'],
      'Financial Modeling Prep': process.env['FINANCIAL_MODELING_PREP_API_KEY']
    };

    Object.entries(apiKeys).forEach(([name, key]) => {
      if (key) {
        this.addResult(name, 'CONFIG', `API key configured (${key.substring(0, 6)}...)`);
      } else {
        this.addResult(name, 'CONFIG', 'API key not configured');
      }
    });
  }

  async testNewsService(): Promise<void> {
    console.log('📰 Testing Enhanced News Service...\n');

    try {
      const startTime = Date.now();
      const result = await this.newsService.getNews('technology stocks', 5);
      const responseTime = Date.now() - startTime;

      this.addResult(
        'Enhanced News Service',
        'PASS',
        `Retrieved ${result.articles.length} articles from ${result.source}`,
        responseTime,
        result.articles.length,
        result.rateLimitInfo.rateLimitRemaining
      );

      // Test provider status
      const providerStatus = this.newsService.getProviderStatus();
      Object.entries(providerStatus).forEach(([key, provider]) => {
        const status = provider.hasApiKey ? (provider.isAvailable ? 'PASS' : 'FAIL') : 'SKIP';
        const message = provider.hasApiKey 
          ? `Available (${provider.rateLimitRemaining} requests remaining)`
          : 'No API key configured';
        
        this.addResult(
          `Provider: ${provider.name}`,
          status,
          message,
          undefined,
          undefined,
          provider.rateLimitRemaining
        );
      });

    } catch (error: any) {
      this.addResult('Enhanced News Service', 'FAIL', `Service failed: ${error.message}`);
    }
  }

  async testDirectAPIConnections(): Promise<void> {
    console.log('🌐 Testing Direct API Connections...\n');

    // Test NewsAPI.org directly
    if (process.env['NEWS_API_KEY']) {
      try {
        const startTime = Date.now();
        const response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: 'stocks',
            language: 'en',
            pageSize: 3,
            apiKey: process.env['NEWS_API_KEY']
          },
          timeout: 10000
        });
        const responseTime = Date.now() - startTime;

        if (response.data.status === 'ok') {
          this.addResult(
            'NewsAPI.org Direct',
            'PASS',
            `Direct connection successful`,
            responseTime,
            response.data.articles?.length || 0,
            parseInt(response.headers['x-ratelimit-remaining'] || '0')
          );
        } else {
          this.addResult('NewsAPI.org Direct', 'FAIL', `API returned status: ${response.data.status}`);
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          this.addResult('NewsAPI.org Direct', 'FAIL', 'Invalid API key (401 Unauthorized)');
        } else if (error.response?.status === 429) {
          this.addResult('NewsAPI.org Direct', 'FAIL', 'Rate limit exceeded (429)');
        } else {
          this.addResult('NewsAPI.org Direct', 'FAIL', `Connection failed: ${error.message}`);
        }
      }
    } else {
      this.addResult('NewsAPI.org Direct', 'SKIP', 'No API key configured');
    }

    // Test Alpha Vantage directly
    if (process.env['ALPHA_VANTAGE_API_KEY']) {
      try {
        const startTime = Date.now();
        const response = await axios.get('https://www.alphavantage.co/query', {
          params: {
            function: 'NEWS_SENTIMENT',
            topics: 'financial_markets',
            limit: 3,
            apikey: process.env['ALPHA_VANTAGE_API_KEY']
          },
          timeout: 10000
        });
        const responseTime = Date.now() - startTime;

        if (response.data && !response.data['Error Message']) {
          this.addResult(
            'Alpha Vantage Direct',
            'PASS',
            `Direct connection successful`,
            responseTime,
            response.data.feed?.length || 0
          );
        } else {
          this.addResult('Alpha Vantage Direct', 'FAIL', `API error: ${response.data['Error Message'] || 'Unknown error'}`);
        }
      } catch (error: any) {
        this.addResult('Alpha Vantage Direct', 'FAIL', `Connection failed: ${error.message}`);
      }
    } else {
      this.addResult('Alpha Vantage Direct', 'SKIP', 'No API key configured');
    }
  }

  async testBackendEndpoints(): Promise<void> {
    console.log('🔗 Testing Backend Endpoints...\n');

    const baseUrl = process.env['API_BASE_URL'] || 'http://localhost:3001';
    const mockToken = 'mock-jwt-token-for-testing';

    const endpoints = [
      { path: '/api/market/news', name: 'General Market News' },
      { path: '/api/market/news/AAPL', name: 'Symbol-Specific News' },
      { path: '/api/market/news/status/providers', name: 'Provider Status' }
    ];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${baseUrl}${endpoint.path}`, {
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
        const responseTime = Date.now() - startTime;

        if (response.status === 200) {
          const articlesCount = endpoint.path.includes('status') 
            ? Object.keys(response.data.data?.providers || {}).length
            : response.data.data?.articles?.length || 0;

          this.addResult(
            endpoint.name,
            'PASS',
            `Endpoint working`,
            responseTime,
            articlesCount
          );
        } else {
          this.addResult(endpoint.name, 'FAIL', `Unexpected status: ${response.status}`);
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          this.addResult(endpoint.name, 'SKIP', 'Requires authentication (use real JWT token)');
        } else {
          this.addResult(endpoint.name, 'FAIL', `Request failed: ${error.message}`);
        }
      }
    }
  }

  printResults(): void {
    console.log('\n📊 News API Integration Test Results:\n');
    console.log('=' .repeat(100));

    let passCount = 0;
    let failCount = 0;
    let skipCount = 0;
    let configCount = 0;

    this.results.forEach(result => {
      const icon = this.getStatusIcon(result.status);
      const timeStr = result.responseTime ? ` (${result.responseTime}ms)` : '';
      const articlesStr = result.articlesCount !== undefined ? ` - ${result.articlesCount} articles` : '';
      const rateLimitStr = result.rateLimitRemaining !== undefined ? ` - ${result.rateLimitRemaining} remaining` : '';
      
      console.log(`${icon} ${result.provider.padEnd(35)} ${result.message}${timeStr}${articlesStr}${rateLimitStr}`);

      switch (result.status) {
        case 'PASS': passCount++; break;
        case 'FAIL': failCount++; break;
        case 'SKIP': skipCount++; break;
        case 'CONFIG': configCount++; break;
      }
    });

    console.log('=' .repeat(100));
    console.log(`📈 Summary: ${passCount} passed, ${failCount} failed, ${skipCount} skipped, ${configCount} configured\n`);

    // Provide recommendations
    this.printRecommendations();
  }

  printRecommendations(): void {
    const hasNewsApiKey = !!process.env['NEWS_API_KEY'];
    const hasAnyApiKey = !!(process.env['NEWS_API_KEY'] || process.env['ALPHA_VANTAGE_API_KEY'] || process.env['POLYGON_API_KEY'] || process.env['FINANCIAL_MODELING_PREP_API_KEY']);

    console.log('🎯 Recommendations:\n');

    if (!hasNewsApiKey) {
      console.log('📰 Get NewsAPI.org key (Recommended):');
      console.log('   1. Visit: https://newsapi.org/register');
      console.log('   2. Free tier: 1,000 requests/day');
      console.log('   3. Add to .env: NEWS_API_KEY=your-key-here\n');
    }

    if (!hasAnyApiKey) {
      console.log('⚠️  No API keys configured - using fallback data only');
      console.log('💡 Consider getting at least one API key for real news data\n');
    } else {
      console.log('✅ You have API keys configured!');
      console.log('🚀 Your news service will automatically use the best available provider\n');
    }

    console.log('📚 API Options Summary:');
    console.log('   • NewsAPI.org: 1,000 free requests/day (Best for general news)');
    console.log('   • Alpha Vantage: 25 free requests/day (Financial focused)');
    console.log('   • Polygon.io: 5 requests/minute free (Market data + news)');
    console.log('   • Financial Modeling Prep: 250 free requests/day (Financial data)');
    console.log('\n💰 All have paid tiers for production use');
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 News API Integration Test Suite');
    console.log('=' .repeat(100));

    await this.testEnvironmentConfiguration();
    await this.testNewsService();
    await this.testDirectAPIConnections();
    await this.testBackendEndpoints();

    this.printResults();
  }
}

// Run the tests
const tester = new NewsAPITester();
tester.runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
