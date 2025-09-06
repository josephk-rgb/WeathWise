import { 
  User, 
  Transaction, 
  Budget, 
  Goal, 
  Investment, 
  Recommendation,
  MarketData,
  NewsResponse,
  RealtimePortfolioValue,
  AdvancedPortfolioAnalytics,
  NewsProvider
} from '../types';

// Enhanced API service - stateless authentication
class ApiService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  private pendingRequests: Map<string, Promise<any>> = new Map(); // For request deduplication
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map(); // Response cache with TTL
  private requestTimestamps: Map<string, number> = new Map(); // For rate limiting
  private cacheCleanupInterval: NodeJS.Timeout | null = null;
  private debugMode = import.meta.env.DEV; // Enable debug mode in development
  
  // Token management - no longer stored, always fetched fresh
  private currentToken: string | null = null;

  constructor() {
    // Clean up expired cache entries every 2 minutes
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanExpiredCache();
    }, 120000);
    
    if (this.debugMode) {
      console.log('🔧 API Service initialized');
    }
  }

  // Set authentication token
  setToken(token: string) {
    this.currentToken = token;
  }

  // Get current token
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  // Clear authentication token
  clearToken() {
    this.currentToken = null;
    this.clearCache();
  }

  // Cache management methods
  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
    this.requestTimestamps.clear();
    if (this.debugMode) {
      console.log('🧹 API cache cleared');
    }
  }

  // Clean expired cache entries
  private cleanExpiredCache() {
    const now = Date.now();
    const initialSize = this.cache.size;
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
    const removed = initialSize - this.cache.size;
    if (removed > 0 && this.debugMode) {
      console.log(`🗑️ Cleaned ${removed} expired cache entries`);
    }
  }

  // Destroy the API service instance
  destroy() {
    this.clearCache();
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
  }

  // Debug methods
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      recentRequests: this.requestTimestamps.size,
      debugMode: this.debugMode
    };
  }

  logCacheContents() {
    if (!this.debugMode) return;
    console.log('📊 Cache contents:', Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
      ttl: value.ttl,
      expired: (Date.now() - value.timestamp) > value.ttl
    })));
  }

  // Expose debugging utilities to global scope in development
  enableGlobalDebug() {
    if (this.debugMode && typeof window !== 'undefined') {
      (window as any).apiDebug = {
        stats: () => this.getCacheStats(),
        cache: () => this.logCacheContents(),
        clear: () => this.clearCache()
      };
      console.log('🛠️ API debug tools available at window.apiDebug');
    }
  }

  // Helper method to make authenticated requests with retry logic, caching, and enhanced deduplication
  // Default cache TTL increased from 1 minute to 3 minutes for better performance
  private async makeRequest(endpoint: string, options: RequestInit = {}, retryCount = 0, cacheTTL: number = 180000): Promise<any> {
    const token = this.currentToken;
    const url = `${this.baseUrl}${endpoint}`;
    
    // DEBUG: Add comprehensive logging
    console.log('🔧 [DEBUG] makeRequest called');
    console.log('🔧 [DEBUG] endpoint:', endpoint);
    console.log('🔧 [DEBUG] baseUrl:', this.baseUrl);
    console.log('🔧 [DEBUG] full URL:', url);
    console.log('🔧 [DEBUG] method:', options.method || 'GET');
    console.log('🔧 [DEBUG] has token:', !!token);
    
    // Create a request key for deduplication and caching
    const method = options.method || 'GET';
    const requestKey = `${method}:${endpoint}`;
    const body = options.body ? JSON.stringify(JSON.parse(options.body as string)) : '';
    const cacheKey = `${requestKey}:${body}`;
    
    // Check cache first for GET requests
    if (method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
        if (this.debugMode) {
          console.log('✅ Returning cached response for:', requestKey);
        }
        return cached.data;
      }
    }
    
    // Enhanced rate limiting - simplified for better reliability
    const isAuthEndpoint = endpoint.includes('/auth/');
    const minInterval = isAuthEndpoint ? 200 : 100;
    const lastRequestTime = this.requestTimestamps.get(requestKey) || 0;
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    
    if (timeSinceLastRequest < minInterval) {
      if (this.debugMode) {
        console.log('⏳ Request throttled:', requestKey, 'Time since last:', timeSinceLastRequest + 'ms');
      }
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
    }
    
    // For GET requests, check if the same request is already pending
    if (method === 'GET' && this.pendingRequests.has(requestKey)) {
      if (this.debugMode) {
        console.log('🔄 Deduplicating request:', requestKey);
      }
      return this.pendingRequests.get(requestKey);
    }
    
    // Update request timestamp
    this.requestTimestamps.set(requestKey, Date.now());
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (this.debugMode) {
      console.log('🚀 Making API request:', {
        url,
        method,
        hasToken: !!token,
        tokenPrefix: token ? token.substring(0, 30) + '...' : 'none',
        retryAttempt: retryCount,
        cached: method === 'GET' ? this.cache.has(cacheKey) : false,
        rateLimited: timeSinceLastRequest < 100,
        pendingRequest: method === 'GET' ? this.pendingRequests.has(requestKey) : false
      });
    }

    const requestPromise = this.executeRequest(url, config, endpoint, options, retryCount, cacheKey, cacheTTL);
    
    // Store the promise for deduplication (only for GET requests)
    if (method === 'GET') {
      this.pendingRequests.set(requestKey, requestPromise);
      
      // Clean up after request completes
      requestPromise.finally(() => {
        this.pendingRequests.delete(requestKey);
      });
    }
    
    return requestPromise;
  }

  private async executeRequest(url: string, config: RequestInit, endpoint: string, options: RequestInit, retryCount: number, cacheKey?: string, cacheTTL?: number): Promise<any> {
    try {
      const response = await fetch(url, config);
      
      if (this.debugMode) {
        console.log('📡 API response status:', response.status);
      }

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔐 Authentication failed');
          this.clearToken();
          throw new Error('Authentication failed');
        }
        
        // Handle rate limiting with exponential backoff - REDUCED delays for auth endpoints
        if (response.status === 429 && retryCount < 3) {
          const retryAfter = response.headers.get('Retry-After');
          const isAuthEndpoint = endpoint.includes('/auth/');
          const baseDelay = retryAfter ? parseInt(retryAfter) * 1000 : (isAuthEndpoint ? 1000 : 2000); // Reduced delay for auth
          const delay = Math.min(baseDelay * Math.pow(2, retryCount), 15000); // Reduced max to 15 seconds
          
          console.log(`⏱️ Rate limited, retrying in ${delay}ms... (${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        
        if (response.status >= 500 && retryCount < 3) {
          console.log(`🔄 Server error, retrying... (${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = await response.json();
      
      if (this.debugMode) {
        console.log('📦 API response data received:', !!result);
      }
      
      // Cache successful GET responses
      if (cacheKey && cacheTTL && (options.method || 'GET') === 'GET') {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          ttl: cacheTTL
        });
        if (this.debugMode) {
          console.log('💾 Cached response for:', cacheKey, 'TTL:', cacheTTL + 'ms');
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw error;
    }
  }

  // Public method for testing authentication
  async testAuth(): Promise<any> {
    return this.makeRequest('/auth-test/test');
  }

  // Authentication methods
  async logout(): Promise<void> {
    this.clearToken();
  }

  // User profile methods
  async getCurrentUser(): Promise<User> {
    console.log('📡 Calling getCurrentUser API...');
    try {
      // Cache user profile for 10 minutes since it rarely changes
      const result = await this.makeRequest('/auth/me', {}, 0, 600000);
      console.log('✅ getCurrentUser successful:', !!result);
      return result;
    } catch (error) {
      console.error('❌ getCurrentUser failed:', error);
      throw error;
    }
  }

  async updateProfile(profileData: Partial<User>): Promise<User> {
    return this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async completeProfile(profileData: Partial<User>): Promise<User> {
    return this.makeRequest('/auth/complete-profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async updatePreferences(preferences: any): Promise<any> {
    return this.makeRequest('/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async updateRiskProfile(riskProfile: any): Promise<any> {
    return this.makeRequest('/auth/risk-profile', {
      method: 'PUT',
      body: JSON.stringify(riskProfile),
    });
  }

  // Transaction methods
  async getTransactions(_userId: string, filters?: any): Promise<Transaction[]> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const endpoint = `/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest(endpoint);
  }

  async createTransaction(transactionData: Omit<Transaction, 'id'>): Promise<Transaction> {
    return this.makeRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  async updateTransaction(id: string, transactionData: Partial<Transaction>): Promise<Transaction> {
    return this.makeRequest(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transactionData),
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    return this.makeRequest(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Budget methods
  async getBudgets(_userId: string): Promise<Budget[]> {
    return this.makeRequest('/budgets');
  }

  async createBudget(budgetData: Omit<Budget, 'id'>): Promise<Budget> {
    return this.makeRequest('/budgets', {
      method: 'POST',
      body: JSON.stringify(budgetData),
    });
  }

  async updateBudget(id: string, budgetData: Partial<Budget>): Promise<Budget> {
    return this.makeRequest(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(budgetData),
    });
  }

  async deleteBudget(id: string): Promise<void> {
    return this.makeRequest(`/budgets/${id}`, {
      method: 'DELETE',
    });
  }

  // Goal methods
  async getGoals(_userId: string): Promise<Goal[]> {
    return this.makeRequest('/goals');
  }

  async createGoal(goalData: Omit<Goal, 'id'>): Promise<Goal> {
    return this.makeRequest('/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  }

  async updateGoal(id: string, goalData: Partial<Goal>): Promise<Goal> {
    return this.makeRequest(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(goalData),
    });
  }

  async deleteGoal(id: string): Promise<void> {
    return this.makeRequest(`/goals/${id}`, {
      method: 'DELETE',
    });
  }

  // Debt methods
  async getDebts(_userId: string): Promise<any[]> {
    return this.makeRequest('/debts');
  }

  async createDebt(debtData: any): Promise<any> {
    return this.makeRequest('/debts', {
      method: 'POST',
      body: JSON.stringify(debtData),
    });
  }

  async updateDebt(id: string, debtData: any): Promise<any> {
    return this.makeRequest(`/debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(debtData),
    });
  }

  async deleteDebt(id: string): Promise<void> {
    return this.makeRequest(`/debts/${id}`, {
      method: 'DELETE',
    });
  }

  async addDebtPayment(debtId: string, paymentData: any): Promise<any> {
    return this.makeRequest(`/debts/${debtId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Investment methods
  async getInvestments(_userId: string): Promise<Investment[]> {
    const response = await this.makeRequest('/investments');
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  }

  async createInvestment(investmentData: Omit<Investment, 'id'>): Promise<Investment> {
    return this.makeRequest('/investments', {
      method: 'POST',
      body: JSON.stringify(investmentData),
    });
  }

  async updateInvestment(id: string, investmentData: Partial<Investment>): Promise<Investment> {
    return this.makeRequest(`/investments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(investmentData),
    });
  }

  async deleteInvestment(id: string): Promise<void> {
    return this.makeRequest(`/investments/${id}`, {
      method: 'DELETE',
    });
  }

  // Portfolio methods
  async getPortfolio(): Promise<any> {
    const response = await this.makeRequest('/portfolio/overview');
    return response.success ? response.data : response;
  }

  async getPortfolioMetrics(): Promise<any> {
    const response = await this.makeRequest('/portfolio/metrics');
    return response.success ? response.data : response;
  }

  async getPortfolioInsights(): Promise<any> {
    const response = await this.makeRequest('/portfolio/insights');
    return response.success ? response.data : response;
  }

  async getPortfolioPerformance(): Promise<any> {
    const response = await this.makeRequest('/portfolio/performance');
    return response.success ? response.data : response;
  }

  // Market data methods
  async getMarketData(symbols: string[]): Promise<any> {
    const queryParams = new URLSearchParams();
    symbols.forEach(symbol => queryParams.append('symbols', symbol));
    return this.makeRequest(`/market/data?${queryParams.toString()}`);
  }

  async searchStocks(query: string): Promise<any> {
    return this.makeRequest(`/market/search?q=${encodeURIComponent(query)}`);
  }

  // Enhanced Yahoo Finance Market Data Methods
  async getYahooMarketData(symbols: string[]): Promise<MarketData[]> {
    const response = await this.makeRequest('/market/yahoo-data', {
      method: 'POST',
      body: JSON.stringify({ symbols }),
    });
    return response.data || response;
  }

  async getYahooQuote(symbol: string): Promise<MarketData> {
    const response = await this.makeRequest(`/market/yahoo-quote/${symbol}`);
    return response.data || response;
  }

  async getMarketSummary(): Promise<MarketData[]> {
    const response = await this.makeRequest('/market/yahoo-summary');
    return response.data || response;
  }

  // Real-time Portfolio Value with Yahoo Finance
  async getRealtimePortfolioValue(): Promise<RealtimePortfolioValue> {
    const response = await this.makeRequest('/investments/portfolio/summary');
    return response.data || response;
  }

  // Advanced Portfolio Analytics
  async getAdvancedPortfolioAnalytics(): Promise<AdvancedPortfolioAnalytics> {
    // Cache analytics for 5 minutes - increased from default 3 minutes
    const response = await this.makeRequest('/portfolio/analytics', {}, 0, 300000);
    // Extract the nested data
    return response.data?.data || response.data || response;
  }

  // Financial News Methods with caching
  async getFinancialNews(limit: number = 20): Promise<NewsResponse> {
    // Cache news for 15 minutes (900000ms) - increased from 5 minutes for better cache reuse
    const response = await this.makeRequest(`/market/news?limit=${limit}`, {}, 0, 900000);
    return response.data || response;
  }

  async getSymbolNews(symbol: string, limit: number = 10): Promise<NewsResponse> {
    // Cache symbol-specific news for 10 minutes - increased from 3 minutes
    const response = await this.makeRequest(`/market/news/${symbol}?limit=${limit}`, {}, 0, 600000);
    return response.data || response;
  }

  async getNewsProviders(): Promise<NewsProvider[]> {
    const response = await this.makeRequest('/market/news-providers');
    return response.data || response;
  }

  // AI/Recommendation methods
  async getRecommendations(_userId: string): Promise<Recommendation[]> {
    return this.makeRequest('/ai/recommendations');
  }

  async sendChatMessage(message: string, context?: any): Promise<string> {
    const response = await this.makeRequest('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
    
    // Handle the response structure from backend: { success: true, data: { response: "...", confidence: 0.85 } }
    if (response.success && response.data && response.data.response) {
      return response.data.response;
    }
    
    // Fallback if response structure is different
    return response.response || response.data || response || 'No response received';
  }

  // NEW: ML-powered chat with personalized financial context via backend proxy
  async sendMLChatMessage(message: string, model: string = "llama3.1:8b", includeFinancialData: boolean = true): Promise<any> {
    console.log('🔧 [DEBUG] sendMLChatMessage called');
    console.log('🔧 [DEBUG] Base URL:', this.baseUrl);
    console.log('🔧 [DEBUG] Full URL will be:', `${this.baseUrl}/ml/chat`);
    console.log('🔧 [DEBUG] Current token:', this.currentToken ? this.currentToken.substring(0, 30) + '...' : 'none');
    
    const response = await this.makeRequest('/ml/chat', {
      method: 'POST',
      body: JSON.stringify({ 
        message, 
        model,
        include_financial_data: includeFinancialData
      }),
    });
    
    console.log('🔧 [DEBUG] sendMLChatMessage response:', response);
    return response;
  }

  async getMLChatHistory(sessionId: string, limit: number = 50): Promise<any> {
    return this.makeRequest(`/ml/chat/history/${sessionId}?limit=${limit}`);
  }

  async checkMLServiceHealth(): Promise<any> {
    return this.makeRequest('/ml/health');
  }

  async getFinancialInsights(): Promise<any> {
    return this.makeRequest('/ai/insights');
  }

  async getRiskAssessment(): Promise<any> {
    return this.makeRequest('/ai/risk-assessment');
  }

  // Analytics methods
  async getAnalytics(period: string = '30d'): Promise<any> {
    return this.makeRequest(`/analytics?period=${period}`);
  }

  async getSpendingAnalysis(): Promise<any> {
    return this.makeRequest('/analytics/spending');
  }

  async getInvestmentPerformance(): Promise<any> {
    return this.makeRequest('/analytics/investment-performance');
  }

  async getNetWorthTrend(period: string = '6m', interval: string = 'weekly'): Promise<any> {
    return this.makeRequest(`/analytics/net-worth-trend?period=${period}&interval=${interval}`);
  }

  async getDashboardStats(): Promise<any> {
    // Cache dashboard stats for 5 minutes - increased from default 3 minutes
    return this.makeRequest('/analytics/dashboard-stats', {}, 0, 300000);
  }

  async getFinancialHealth(): Promise<any> {
    // Cache financial health for 10 minutes since it changes infrequently
    return this.makeRequest('/analytics/financial-health', {}, 0, 600000);
  }

  // Profile completion methods
  async completeOnboarding(): Promise<any> {
    return this.makeRequest('/auth/complete-onboarding', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Export methods
  async exportTransactions(format: 'csv' | 'pdf' = 'csv'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/transactions/export?format=${format}`, {
      headers: {
        Authorization: `Bearer ${this.currentToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    
    return response.blob();
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.makeRequest('/health');
  }

  // Public method for making authenticated requests (used by polling manager)
  async makeAuthenticatedRequest(endpoint: string, cacheTTL?: number): Promise<any> {
    return this.makeRequest(endpoint, {}, 0, cacheTTL);
  }

  // Mock Data Methods for Admin Users
  async generateMockData(config: any): Promise<any> {
    return this.makeRequest('/mock-data/generate', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getMockDataSummary(): Promise<any> {
    return this.makeRequest('/mock-data/summary');
  }

  async clearMockData(): Promise<any> {
    return this.makeRequest('/mock-data/clear', {
      method: 'DELETE',
    });
  }

  async getMockDataConfig(): Promise<any> {
    return this.makeRequest('/mock-data/config');
  }
}

export const apiService = new ApiService();

// Enable global debugging in development
if (import.meta.env.DEV) {
  apiService.enableGlobalDebug();
}

export default apiService;
