import { 
  User, 
  Transaction, 
  Budget, 
  Goal, 
  Investment, 
  Recommendation,
  MarketData,
  NewsArticle,
  NewsResponse,
  RealtimePortfolioValue,
  AdvancedPortfolioAnalytics,
  WebSocketMessage,
  NewsProvider
} from '../types';

// Enhanced API service with Yahoo Finance and News integration
class EnhancedApiService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  private token: string | null = null;
  private ws: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private wsListeners: Map<string, Function[]> = new Map();

  // Set authentication token
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    this.initializeWebSocket();
  }

  // Get authentication token
  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  // Clear authentication token
  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    this.disconnectWebSocket();
  }

  // Helper method to make authenticated requests with retry logic
  private async makeRequest(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const maxRetries = 2;
    const token = this.getToken();
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    console.log('Making API request:', {
      url,
      method: options.method || 'GET',
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 30) + '...' : 'none',
      retryAttempt: retryCount
    });

    try {
      const response = await fetch(url, config);
      
      console.log('API response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Authentication failed');
          this.clearToken();
          // Don't retry on auth failures
          throw new Error('Authentication failed');
        }
        
        // Retry logic for other 4xx errors only if enabled
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        
        // For 5xx errors, retry
        if (response.status >= 500 && retryCount < maxRetries) {
          console.log(`Server error, retrying... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('API response data:', result);
      return result;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // 🚀 NEW: WebSocket Management
  private initializeWebSocket() {
    if (!this.token) return;

    const wsUrl = this.baseUrl.replace('http', 'ws').replace('/api', '/ws');
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.wsReconnectAttempts = 0;
      
      // Authenticate WebSocket connection
      this.ws?.send(JSON.stringify({
        type: 'auth',
        token: this.token
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private attemptReconnect() {
    if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
      this.wsReconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting WebSocket reconnection (${this.wsReconnectAttempts}/${this.maxReconnectAttempts})`);
        this.initializeWebSocket();
      }, 1000 * this.wsReconnectAttempts);
    }
  }

  private handleWebSocketMessage(message: WebSocketMessage) {
    const listeners = this.wsListeners.get(message.type) || [];
    listeners.forEach(listener => listener(message.data));
  }

  public onWebSocketMessage(type: string, callback: Function) {
    if (!this.wsListeners.has(type)) {
      this.wsListeners.set(type, []);
    }
    this.wsListeners.get(type)!.push(callback);
  }

  public offWebSocketMessage(type: string, callback: Function) {
    const listeners = this.wsListeners.get(type) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsListeners.clear();
  }

  // Public method for testing authentication
  async testAuth(): Promise<any> {
    return this.makeRequest('/auth-test/test');
  }

  // Authentication methods
  async logout(): Promise<void> {
    this.clearToken();
    // In a real implementation, you would also call Auth0's logout
  }

  // User profile methods
  async getCurrentUser(): Promise<User> {
    return this.makeRequest('/auth/me');
  }

  async updateProfile(profileData: Partial<User>): Promise<User> {
    return this.makeRequest('/auth/profile', {
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

  // Investment methods
  async getInvestments(_userId: string): Promise<Investment[]> {
    const response = await this.makeRequest('/investments');
    // Handle the API response structure - backend returns { success: true, data: Investment[] }
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }
    // Fallback if response is already an array
    if (Array.isArray(response)) {
      return response;
    }
    // If no valid data, return empty array
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

  // 🚀 NEW: Enhanced Yahoo Finance Market Data Methods
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

  // 🚀 NEW: Real-time Portfolio Value with Yahoo Finance
  async getRealtimePortfolioValue(): Promise<RealtimePortfolioValue> {
    const response = await this.makeRequest('/portfolio/realtime-value');
    return response.data || response;
  }

  // 🚀 NEW: Advanced Portfolio Analytics
  async getAdvancedPortfolioAnalytics(): Promise<AdvancedPortfolioAnalytics> {
    const response = await this.makeRequest('/portfolio/analytics');
    // Backend returns { success: true, data: { portfolioMetrics, ... } }
    // Extract the nested data
    return response.data?.data || response.data || response;
  }

  // 🚀 NEW: Financial News Methods
  async getFinancialNews(limit: number = 20): Promise<NewsResponse> {
    const response = await this.makeRequest(`/market/news?limit=${limit}`);
    return response;
  }

  async getSymbolNews(symbol: string, limit: number = 10): Promise<NewsResponse> {
    const response = await this.makeRequest(`/market/news/${symbol}?limit=${limit}`);
    return response;
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
    return response.response;
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

  // Get dashboard statistics with change calculations
  async getDashboardStats(): Promise<any> {
    return this.makeRequest('/analytics/dashboard-stats');
  }

  async getFinancialHealth(): Promise<any> {
    return this.makeRequest('/analytics/financial-health');
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
        Authorization: `Bearer ${this.getToken()}`,
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

  // 🚀 NEW: WebSocket Status
  getWebSocketStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.ws) return 'disconnected';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      default:
        return 'disconnected';
    }
  }
}

export const apiService = new EnhancedApiService();
export default apiService;

// Enhanced API service with Yahoo Finance and News integration
class EnhancedApiService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  private token: string | null = null;
  private wsConnection: WebSocket | null = null;

  // Set authentication token
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  // Get authentication token
  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  // Clear authentication token
  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  // Helper method to make authenticated requests with retry logic
  private async makeRequest(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const maxRetries = 2;
    const token = this.getToken();
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    console.log('Making API request:', {
      url,
      method: options.method || 'GET',
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 30) + '...' : 'none',
      retryAttempt: retryCount
    });

    try {
      const response = await fetch(url, config);
      
      console.log('API response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid - try to refresh if we haven't retried yet
          if (retryCount < maxRetries) {
            console.log('Token seems invalid, attempting to refresh...');
            this.clearToken();
            // Wait a bit for the auth hook to refresh the token
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.makeRequest(endpoint, options, retryCount + 1);
          } else {
            console.error('Authentication failed after retries - clearing token');
            this.clearToken();
            throw new Error('Authentication required');
          }
        }
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
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
    // In a real implementation, you would also call Auth0's logout
  }

  // User profile methods
  async getCurrentUser(): Promise<User> {
    return this.makeRequest('/auth/me');
  }

  async updateProfile(profileData: Partial<User>): Promise<User> {
    return this.makeRequest('/auth/profile', {
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

  // Investment methods
  async getInvestments(_userId: string): Promise<Investment[]> {
    const response = await this.makeRequest('/investments');
    // Handle the API response structure - backend returns { success: true, data: Investment[] }
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }
    // Fallback if response is already an array
    if (Array.isArray(response)) {
      return response;
    }
    // If no valid data, return empty array
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

  // 🚀 NEW: Enhanced Portfolio Analytics with Yahoo Finance
  async getAdvancedPortfolioAnalytics(): Promise<any> {
    const response = await this.makeRequest('/portfolio/analytics');
    return response.success ? response.data : response;
  }

  // 🚀 NEW: Real-time Market Data Methods (Yahoo Finance)
  async getRealtimeQuote(symbol: string): Promise<any> {
    const response = await this.makeRequest(`/market/data/${symbol}`);
    return response.success ? response.data : response;
  }

  async getBatchQuotes(symbols: string[]): Promise<any> {
    const symbolsParam = symbols.join(',');
    const response = await this.makeRequest(`/market/data?symbols=${symbolsParam}`);
    return response.success ? response.data : response;
  }

  async refreshPortfolioValues(investments: Investment[]): Promise<any> {
    const symbols = [...new Set(investments.map(inv => inv.symbol))]; // Remove duplicates
    return this.getBatchQuotes(symbols);
  }

  // Legacy market data method - updated to use new backend
  async getMarketData(symbols: string[]): Promise<any> {
    return this.getBatchQuotes(symbols);
  }

  async searchStocks(query: string): Promise<any> {
    return this.makeRequest(`/market/search?q=${encodeURIComponent(query)}`);
  }

  // 🚀 NEW: Financial News Integration
  async getMarketNews(query?: string, limit?: number): Promise<any> {
    let endpoint = '/market/news';
    const params = new URLSearchParams();
    
    if (query) params.append('query', query);
    if (limit) params.append('limit', limit.toString());
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    const response = await this.makeRequest(endpoint);
    return response.success ? response.data : response;
  }

  async getSymbolNews(symbol: string, limit?: number): Promise<any> {
    let endpoint = `/market/news/${symbol}`;
    if (limit) {
      endpoint += `?limit=${limit}`;
    }
    
    const response = await this.makeRequest(endpoint);
    return response.success ? response.data : response;
  }

  async getNewsProviderStatus(): Promise<any> {
    const response = await this.makeRequest('/market/news/status/providers');
    return response.success ? response.data : response;
  }

  // 🚀 NEW: WebSocket Integration for Real-time Updates
  connectWebSocket(): WebSocket | null {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      return this.wsConnection;
    }

    const token = this.getToken();
    if (!token) {
      console.warn('Cannot connect WebSocket: No authentication token');
      return null;
    }

    const wsUrl = `${this.baseUrl.replace('http', 'ws')}/websocket`;
    
    try {
      this.wsConnection = new WebSocket(wsUrl);
      
      this.wsConnection.onopen = () => {
        console.log('WebSocket connected');
        // Send authentication
        this.wsConnection?.send(JSON.stringify({
          type: 'auth',
          token: token
        }));
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data);
          
          // Dispatch custom events for different message types
          window.dispatchEvent(new CustomEvent('websocket-message', { detail: data }));
          
          if (data.type === 'market-data') {
            window.dispatchEvent(new CustomEvent('market-data-update', { detail: data.data }));
          } else if (data.type === 'portfolio-update') {
            window.dispatchEvent(new CustomEvent('portfolio-update', { detail: data.data }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('WebSocket disconnected');
        this.wsConnection = null;
      };

      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return this.wsConnection;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      return null;
    }
  }

  subscribeToMarketData(symbols: string[]): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        type: 'subscribe-market-data',
        symbols: symbols
      }));
    }
  }

  subscribeToPortfolioUpdates(): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        type: 'subscribe-portfolio-updates'
      }));
    }
  }

  // 🚀 NEW: WebSocket Status
  async getWebSocketStatus(): Promise<any> {
    const response = await this.makeRequest('/websocket/status');
    return response.success ? response.data : response;
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
    return response.response;
  }

  async getFinancialInsights(): Promise<any> {
    return this.makeRequest('/ai/insights');
  }

  async getRiskAssessment(): Promise<any> {
    return this.makeRequest('/ai/risk-assessment');
  }

  // 🚀 NEW: AI Service Status
  async getAIServiceStatus(): Promise<any> {
    const response = await this.makeRequest('/ai/status');
    return response.success ? response.data : response;
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

  // Get dashboard statistics with change calculations
  async getDashboardStats(): Promise<any> {
    return this.makeRequest('/analytics/dashboard-stats');
  }

  async getFinancialHealth(): Promise<any> {
    return this.makeRequest('/analytics/financial-health');
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
        Authorization: `Bearer ${this.getToken()}`,
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

  // 🚀 NEW: Utility Methods for Enhanced Features
  
  // Calculate real-time portfolio value using Yahoo Finance data
  async calculateRealtimePortfolioValue(investments: Investment[]): Promise<{
    totalValue: number;
    totalCost: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    lastUpdated: Date;
    marketData: any[];
  }> {
    const marketData = await this.refreshPortfolioValues(investments);
    
    let totalValue = 0;
    let totalCost = 0;
    
    const enrichedData = investments.map(investment => {
      const currentMarketData = marketData[investment.symbol];
      const currentPrice = currentMarketData?.currentPrice || investment.currentPrice;
      const value = investment.shares * currentPrice;
      const cost = investment.shares * investment.purchasePrice;
      
      totalValue += value;
      totalCost += cost;
      
      return {
        ...investment,
        currentPrice,
        value,
        cost,
        gainLoss: value - cost,
        gainLossPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
        marketData: currentMarketData
      };
    });
    
    return {
      totalValue,
      totalCost,
      totalGainLoss: totalValue - totalCost,
      totalGainLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      lastUpdated: new Date(),
      marketData: enrichedData
    };
  }
}

export const apiService = new EnhancedApiService();
