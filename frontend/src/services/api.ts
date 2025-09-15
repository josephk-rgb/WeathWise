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
  NewsProvider,
  Account,
  PhysicalAsset
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
    console.log('🔧 [DEBUG] token preview:', token ? token.substring(0, 30) + '...' : 'null');
    console.log('🔧 [DEBUG] token value:', token ? `${token.substring(0, 20)}...` : 'null/undefined');
    console.log('🔧 [DEBUG] token preview:', token ? `${token.substring(0, 20)}...` : 'null');
    
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
    
    // Build headers explicitly to avoid spread issues
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add any custom headers from options
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          headers[key] = value as string;
        }
      });
    }
    
    // Always add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      // Debug: Log token details for news endpoints
      if (endpoint.includes('/market/news')) {
        console.log('🔧 [NEWS DEBUG] Token details:', {
          hasToken: !!token,
          tokenType: typeof token,
          tokenLength: token.length,
          tokenStart: token.substring(0, 20),
          tokenEnd: token.substring(token.length - 20),
          isJWTFormat: token.split('.').length === 3
        });
      }
    }

    const config: RequestInit = {
      headers,
      ...options,
    };

    // Debug: Log authorization header for polling endpoints
    if (endpoint.includes('/portfolio/summary') || endpoint.includes('/investments')) {
      console.log('🔧 [DEBUG] Polling request headers:', {
        endpoint,
        hasToken: !!token,
        tokenType: typeof token,
        tokenValue: token ? token.substring(0, 50) + '...' : 'null',
        hasAuthHeader: !!config.headers && 'Authorization' in config.headers,
        authHeaderValue: config.headers && 'Authorization' in config.headers ? 
          (config.headers as any).Authorization.substring(0, 30) + '...' : 'none',
        allHeaders: Object.keys(config.headers || {}),
        headerConstruction: token ? `Bearer ${token}`.substring(0, 30) + '...' : 'no token'
      });
    }

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
      // Set timeout for long-running operations (like clear data)
      const timeoutMs = endpoint.includes('/clear/') || endpoint.includes('/backup') ? 300000 : 30000; // 5 minutes for clear/backup, 30 seconds for others
      
      // Enhanced debugging for clear operations
      if (endpoint.includes('/clear/') || endpoint.includes('/backup')) {
        console.log('🔧 [DEBUG] Long-running operation detected:', {
          endpoint,
          timeoutMs,
          url,
          method: config.method,
          hasBody: !!config.body,
          bodySize: config.body ? JSON.stringify(config.body).length : 0,
          timestamp: new Date().toISOString()
        });
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ [DEBUG] Request timeout triggered:', {
          endpoint,
          timeoutMs,
          elapsed: timeoutMs,
          timestamp: new Date().toISOString()
        });
        controller.abort();
      }, timeoutMs);
      
      const startTime = Date.now();
      console.log('🚀 [DEBUG] Starting request:', {
        endpoint,
        url,
        method: config.method,
        timeoutMs,
        timestamp: new Date().toISOString()
      });
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      clearTimeout(timeoutId);
      
      console.log('📡 [DEBUG] Request completed:', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      if (this.debugMode) {
        console.log('📡 API response status:', response.status);
      }

      // Handle 304 Not Modified - return cached data if available
      if (response.status === 304) {
        if (this.debugMode) {
          console.log('📋 304 Not Modified - using cached data');
        }
        
        // Return cached data if available, otherwise return null
        if (cacheKey) {
          const cached = this.cache.get(cacheKey);
          if (cached) {
            return cached.data;
          }
        }
        
        // If no cached data available, return null (data hasn't changed)
        return null;
      }

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔐 Authentication failed');
          this.clearToken();
          
          // Dispatch a custom event to notify auth system
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth-token-cleared'));
          }
          
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
      
      // Enhanced debugging for clear operations
      if (endpoint.includes('/clear/') || endpoint.includes('/backup')) {
        console.log('📋 [DEBUG] Response data received:', {
          endpoint,
          success: result.success,
          message: result.message,
          dataKeys: result.data ? Object.keys(result.data) : [],
          recordsDeleted: result.data?.recordsDeleted,
          backupCreated: result.data?.backupCreated,
          timestamp: new Date().toISOString()
        });
      }
      
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
    } catch (error: any) {
      console.error('❌ API request failed:', error);
      
      // Handle timeout errors
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${endpoint.includes('/clear/') || endpoint.includes('/backup') ? '5 minutes' : '30 seconds'}. The operation may still be running on the server.`);
      }
      
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
  async getCurrentUser(auth0UserData?: { email?: string; given_name?: string; family_name?: string; name?: string }): Promise<User> {
    console.log('📡 Calling getCurrentUser API...');
    console.log('🔧 [FRONTEND] Sending Auth0 user data:', auth0UserData);
    
    try {
      // Send Auth0 user data in the request body to help backend create/update user
      const requestOptions: RequestInit = auth0UserData ? {
        method: 'POST',
        body: JSON.stringify({ auth0UserData })
      } : {};
      
      // Cache user profile for 10 minutes since it rarely changes
      const result = await this.makeRequest('/auth/me', requestOptions, 0, 600000);
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

  // Data transformation helper methods
  private transformBackendInvestment(backendInvestment: any): Investment {
    return {
      id: backendInvestment._id || backendInvestment.id,
      userId: backendInvestment.userId || '',
      symbol: backendInvestment.securityInfo?.symbol || '',
      name: backendInvestment.securityInfo?.name || '',
      shares: backendInvestment.position?.shares || 0,
      purchasePrice: backendInvestment.acquisition?.purchasePrice || backendInvestment.position?.averageCost || 0,
      currentPrice: backendInvestment.position?.currentPrice || 0,
      type: backendInvestment.securityInfo?.type || 'other',
      purchaseDate: backendInvestment.acquisition?.purchaseDate ? new Date(backendInvestment.acquisition.purchaseDate) : new Date(),
      currency: backendInvestment.securityInfo?.currency || 'USD',
      originalCurrency: backendInvestment.securityInfo?.currency,
      originalPurchasePrice: backendInvestment.acquisition?.purchasePrice
    };
  }

  private transformBackendInvestments(backendInvestments: any[]): Investment[] {
    if (!Array.isArray(backendInvestments)) {
      return [];
    }
    return backendInvestments.map(inv => this.transformBackendInvestment(inv));
  }

  // Investment methods
  async getInvestments(_userId: string): Promise<Investment[]> {
    const response = await this.makeRequest('/investments');
    if (response && response.success && Array.isArray(response.data)) {
      return this.transformBackendInvestments(response.data);
    }
    if (Array.isArray(response)) {
      return this.transformBackendInvestments(response);
    }
    return [];
  }

  async createInvestment(investmentData: Omit<Investment, 'id'>): Promise<Investment> {
    const response = await this.makeRequest('/investments', {
      method: 'POST',
      body: JSON.stringify(investmentData),
    });
    
    if (response && response.success && response.data) {
      return this.transformBackendInvestment(response.data);
    }
    return response;
  }

  async updateInvestment(id: string, investmentData: Partial<Investment>): Promise<Investment> {
    const response = await this.makeRequest(`/investments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(investmentData),
    });
    
    if (response && response.success && response.data) {
      return this.transformBackendInvestment(response.data);
    }
    return response;
  }

  async deleteInvestment(id: string): Promise<void> {
    return this.makeRequest(`/investments/${id}`, {
      method: 'DELETE',
    });
  }

  // Account methods
  async getAccounts(): Promise<Account[]> {
    const response = await this.makeRequest('/accounts');
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  }

  async createAccount(accountData: Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    return this.makeRequest('/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
  }

  async updateAccount(id: string, accountData: Partial<Account>): Promise<Account> {
    return this.makeRequest(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(accountData),
    });
  }

  async deleteAccount(id: string): Promise<void> {
    return this.makeRequest(`/accounts/${id}`, {
      method: 'DELETE',
    });
  }

  // Physical Asset methods
  async getAssets(): Promise<PhysicalAsset[]> {
    const response = await this.makeRequest('/physical-assets');
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  }

  async createAsset(assetData: Omit<PhysicalAsset, 'id' | 'userId' | 'equity' | 'createdAt' | 'updatedAt'>): Promise<PhysicalAsset> {
    return this.makeRequest('/physical-assets', {
      method: 'POST',
      body: JSON.stringify(assetData),
    });
  }

  async updateAsset(id: string, assetData: Partial<PhysicalAsset>): Promise<PhysicalAsset> {
    return this.makeRequest(`/physical-assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assetData),
    });
  }

  async deleteAsset(id: string): Promise<void> {
    return this.makeRequest(`/physical-assets/${id}`, {
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
    
    // Handle both response formats: wrapped {success, data} and direct data
    let backendData;
    if (response && response.success && response.data) {
      // Standard wrapped response format
      backendData = response.data;
    } else if (response && (response.historicalPerformance || response.investments)) {
      // Direct data format (what we're actually receiving)
      backendData = response;
    } else {
      // No valid data
      return response;
    }
    
    return {
      ...backendData,
      // Transform historical performance data if it exists
      historicalPerformance: backendData.historicalPerformance || [],
      // Transform investments data if it exists
      investments: backendData.investments ? backendData.investments.map((inv: any) => ({
        symbol: inv.symbol,
        name: inv.name,
        type: inv.type,
        shares: inv.shares,
        currentPrice: inv.currentPrice,
        averageCost: inv.averageCost,
        currentValue: inv.currentValue,
        costBasis: inv.costBasis,
        gainLoss: inv.gainLoss,
        gainLossPercent: inv.gainLossPercent
      })) : []
    };
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
  const response = await this.makeRequest(`/market/data/${symbol}`);
    return response.data || response;
  }

  async getMarketSummary(): Promise<MarketData[]> {
    const response = await this.makeRequest('/market/yahoo-summary');
    return response.data || response;
  }

  // Real-time Portfolio Value with Yahoo Finance
  async getRealtimePortfolioValue(): Promise<RealtimePortfolioValue> {
    const response = await this.makeRequest('/investments/portfolio/summary');
    
    if (response && response.success && response.data) {
      // Transform the backend portfolio summary to match frontend expectations
      const backendData = response.data;
      return {
        totalValue: backendData.totalValue || 0,
        totalCost: backendData.totalCost || 0,
        totalGainLoss: backendData.totalGainLoss || 0,
        totalGainLossPercent: backendData.totalGainLossPercent || 0,
        lastUpdated: backendData.lastUpdated ? new Date(backendData.lastUpdated) : new Date(),
        marketData: backendData.topHoldings ? backendData.topHoldings.map((holding: any) => ({
          id: holding.symbol,
          userId: '',
          symbol: holding.symbol,
          name: holding.name,
          shares: 0, // Not provided in summary
          purchasePrice: 0, // Not provided in summary
          currentPrice: holding.value || 0,
          type: 'stock' as const,
          purchaseDate: new Date(),
          currency: 'USD',
          value: holding.value || 0,
          cost: 0,
          gainLoss: holding.gainLoss || 0,
          gainLossPercent: holding.gainLossPercent || 0,
          marketData: {
            symbol: holding.symbol,
            name: holding.name,
            currentPrice: holding.value || 0,
            change: 0,
            changePercent: 0,
            volume: 0,
            high: holding.value || 0,
            low: holding.value || 0,
            open: holding.value || 0,
            previousClose: holding.value || 0,
            lastUpdated: new Date()
          }
        })) : []
      };
    }
    
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
    const response = await this.makeRequest('/ai/recommendations');
    if (response && response.success && Array.isArray(response.recommendations)) {
      return response.recommendations;
    }
    return Array.isArray(response) ? response : [];
  }

  // New: Trigger recommendation generation for a scope (dashboard | portfolio)
  async refreshRecommendations(scope: 'dashboard' | 'portfolio', max: number = 5, portfolio?: any): Promise<{ success: boolean; accepted: boolean; scope: string; max: number }> {
    const params = new URLSearchParams();
    params.append('scope', scope);
    if (max) params.append('max', String(max));

    const response = await this.makeRequest(`/ai/recommendations/refresh?${params.toString()}`, {
      method: 'POST',
      body: JSON.stringify({ max, portfolio })
    });

    return response;
  }

  // New: Poll recommendations by scope (dashboard | portfolio)
  async getRecommendationsByScope(scope: 'dashboard' | 'portfolio', limit: number = 5): Promise<Recommendation[]> {
    const params = new URLSearchParams();
    params.append('scope', scope);
    params.append('limit', String(limit));

    const response = await this.makeRequest(`/ai/recommendations?${params.toString()}`);
    if (response && response.success && Array.isArray(response.recommendations)) {
      return response.recommendations;
    }
    return Array.isArray(response) ? response : [];
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

  // Enhanced chat session management
  async getChatSessions(limit: number = 20, offset: number = 0): Promise<any> {
    return this.makeRequest(`/ml/chat/sessions?limit=${limit}&offset=${offset}`);
  }

  async getChatSessionById(sessionId: string): Promise<any> {
    return this.makeRequest(`/ml/chat/sessions/${sessionId}`);
  }

  async createChatSession(title?: string): Promise<any> {
    return this.makeRequest('/ml/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async updateChatSession(sessionId: string, updates: any): Promise<any> {
    return this.makeRequest(`/ml/chat/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteChatSession(sessionId: string): Promise<any> {
    return this.makeRequest(`/ml/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async searchChatHistory(query: string, limit: number = 20): Promise<any> {
    return this.makeRequest(`/ml/chat/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async exportChatSession(sessionId: string, format: 'json' | 'txt' = 'json'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/ml/chat/sessions/${sessionId}/export?format=${format}`, {
      headers: {
        Authorization: `Bearer ${this.currentToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    
    return response.blob();
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

  async getEnhancedDashboardStats(): Promise<any> {
    // Use enhanced dashboard stats with true net worth calculation
    return this.makeRequest('/analytics/enhanced-dashboard-stats', {}, 0, 300000);
  }

  // 🚀 PERFORMANCE OPTIMIZATION: Single dashboard endpoint
  // Combines all dashboard data into one optimized API call
  async getCompleteDashboardData(period: string = 'current_month'): Promise<any> {
    console.log('🚀 Calling optimized dashboard endpoint with period:', period);
    // Cache complete dashboard data for 5 minutes (longer than individual endpoints)
    // This replaces 9 separate API calls with a single optimized call
    const result = await this.makeRequest(`/analytics/dashboard-complete?period=${period}`, {}, 0, 300000);
    console.log('🚀 Optimized dashboard endpoint response:', {
      success: result?.success,
      hasData: !!result?.data,
      dataKeys: result?.data ? Object.keys(result.data) : [],
      period: period
    });
    return result;
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
  async makeAuthenticatedRequest(endpoint: string, cacheTTL?: number, forceRefresh?: boolean): Promise<any> {
    const options: RequestInit = {};
    
    // If forceRefresh is true, add a cache-busting header to prevent 304 responses
    if (forceRefresh) {
      options.headers = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };
    }
    
    return this.makeRequest(endpoint, options, 0, cacheTTL);
  }

  // Persona Management Methods for Admin Users
  
  // Get available personas
  async getAvailablePersonas(): Promise<any> {
    return this.makeRequest('/admin/persona/available');
  }

  // Get persona information
  async getPersonaInfo(personaName: string): Promise<any> {
    return this.makeRequest(`/admin/persona/info/${personaName}`);
  }

  // Load persona data for a user
  async loadPersonaData(userId: string, personaName: string, options?: any): Promise<any> {
    return this.makeRequest(`/admin/persona/load/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ personaName, options }),
    });
  }

  // Load persona data for multiple users
  async loadPersonaDataBulk(userIds: string[], personaName: string, options?: any): Promise<any> {
    return this.makeRequest('/admin/persona/load-bulk', {
      method: 'POST',
      body: JSON.stringify({ userIds, personaName, options }),
    });
  }

  // Validate persona data for a user
  async validatePersonaData(userId: string, config?: any): Promise<any> {
    const params = config ? `?config=${encodeURIComponent(JSON.stringify(config))}` : '';
    return this.makeRequest(`/admin/persona/validate/${userId}${params}`);
  }

  // Generate historical data for a user
  async generateHistoricalData(userId: string, config?: any): Promise<any> {
    return this.makeRequest(`/admin/persona/generate-historical/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  }

  // Clear all persona data for a user
  async clearPersonaData(userId: string, confirm: boolean = false, backup: boolean = true): Promise<any> {
    return this.makeRequest(`/admin/persona/clear/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm, backup }),
    });
  }

  // Get persona data status for a user
  async getPersonaStatus(userId: string): Promise<any> {
    return this.makeRequest(`/admin/persona/status/${userId}`);
  }

  // Get summary of all persona data
  async getPersonaSummary(personaName?: string, limit?: number, offset?: number): Promise<any> {
    const params = new URLSearchParams();
    if (personaName) params.append('personaName', personaName);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const queryString = params.toString();
    return this.makeRequest(`/admin/persona/summary${queryString ? `?${queryString}` : ''}`);
  }

  // Create backup of persona data
  async createPersonaBackup(userId?: string, personaName?: string, includeHistoricalData: boolean = true): Promise<any> {
    return this.makeRequest('/admin/persona/backup', {
      method: 'POST',
      body: JSON.stringify({ userId, personaName, includeHistoricalData }),
    });
  }

  // Restore persona data from backup
  async restorePersonaBackup(backupName: string, userId?: string, confirm: boolean = false): Promise<any> {
    return this.makeRequest('/admin/persona/restore', {
      method: 'POST',
      body: JSON.stringify({ backupName, userId, confirm }),
    });
  }

  // List available backups
  async listPersonaBackups(limit?: number): Promise<any> {
    const params = limit ? `?limit=${limit}` : '';
    return this.makeRequest(`/admin/persona/backups${params}`);
  }

  // Delete a backup
  async deletePersonaBackup(backupName: string, confirm: boolean = false): Promise<any> {
    return this.makeRequest(`/admin/persona/backup/${backupName}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm }),
    });
  }

  // Get persona system health status
  async getPersonaSystemHealth(): Promise<any> {
    return this.makeRequest('/admin/persona/health');
  }

  // Test persona loading without saving to database
  async testPersonaLoading(personaName: string, options?: any): Promise<any> {
    return this.makeRequest(`/admin/persona/test/${personaName}`, {
      method: 'POST',
      body: JSON.stringify({ options }),
    });
  }

  // Get persona usage analytics
  async getPersonaAnalytics(timeframe?: string, personaName?: string): Promise<any> {
    const params = new URLSearchParams();
    if (timeframe) params.append('timeframe', timeframe);
    if (personaName) params.append('personaName', personaName);
    
    const queryString = params.toString();
    return this.makeRequest(`/admin/persona/analytics${queryString ? `?${queryString}` : ''}`);
  }

  // Export persona data for a user
  async exportPersonaData(userId: string, format: string = 'json', includeHistoricalData: boolean = true): Promise<any> {
    return this.makeRequest(`/admin/persona/export/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ format, includeHistoricalData }),
    });
  }

  // Import persona data from file
  async importPersonaData(userId: string, format: string, data: string, options?: any): Promise<any> {
    return this.makeRequest('/admin/persona/import', {
      method: 'POST',
      body: JSON.stringify({ userId, format, data, options }),
    });
  }

  // Get persona template information
  async getPersonaTemplates(personaName?: string): Promise<any> {
    const params = personaName ? `?personaName=${personaName}` : '';
    return this.makeRequest(`/admin/persona/templates${params}`);
  }

  // Update persona template
  async updatePersonaTemplate(personaName: string, template: any): Promise<any> {
    return this.makeRequest(`/admin/persona/template/${personaName}`, {
      method: 'PUT',
      body: JSON.stringify({ template }),
    });
  }

  // Create new persona template
  async createPersonaTemplate(personaName: string, template: any): Promise<any> {
    return this.makeRequest('/admin/persona/template', {
      method: 'POST',
      body: JSON.stringify({ personaName, template }),
    });
  }

  // Delete persona template
  async deletePersonaTemplate(personaName: string, confirm: boolean = false): Promise<any> {
    return this.makeRequest(`/admin/persona/template/${personaName}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm }),
    });
  }

  // Snapshot Management Methods
  
  // Manually trigger snapshot creation
  async createSnapshot(userId?: string, type: string = 'all'): Promise<any> {
    return this.makeRequest('/admin/persona/snapshot/create', {
      method: 'POST',
      body: JSON.stringify({ userId, type }),
    });
  }

  // Get snapshot system status
  async getSnapshotStatus(): Promise<any> {
    return this.makeRequest('/admin/persona/snapshot/status');
  }

  // Clean up old snapshots
  async cleanupSnapshots(daysToKeep: number = 365): Promise<any> {
    return this.makeRequest('/admin/persona/snapshot/cleanup', {
      method: 'POST',
      body: JSON.stringify({ daysToKeep }),
    });
  }

  // Legacy Mock Data Methods (REMOVED - Use Persona System Instead)
  // The old mock data system has been completely replaced by the persona-based system.
  // Use the persona management methods above for all data generation needs.
}

export const apiService = new ApiService();

// Enable global debugging in development
if (import.meta.env.DEV) {
  apiService.enableGlobalDebug();
}

export default apiService;
