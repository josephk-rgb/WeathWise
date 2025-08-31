// 🚀 NEW: Enhanced Market Data Types
export interface MarketData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  lastUpdated: Date;
}

// 🚀 NEW: Financial News Types
export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevance?: number;
}

export interface NewsResponse {
  articles: NewsArticle[];
  source: string;
  rateLimitInfo: {
    provider: string;
    remaining: number;
    isAvailable: boolean;
  };
}

// 🚀 NEW: Advanced Portfolio Analytics Types
export interface RiskMetrics {
  beta: number;
  volatility: number;
  sharpeRatio: number;
  valueAtRisk: number;
  correlation?: number;
}

export interface AdvancedPortfolioAnalytics {
  portfolioMetrics: RiskMetrics;
  individualAssets: Array<{
    symbol: string;
    analytics: RiskMetrics;
    weight: number;
  }>;
  composition: Array<{
    type: string;
    value: number;
    percentage: number;
  }>;
  riskAnalysis: {
    overall: 'low' | 'medium' | 'high';
    diversification: number;
    concentration: number;
  };
}

// 🚀 NEW: Real-time Portfolio Value
export interface RealtimePortfolioValue {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  lastUpdated: Date;
  marketData: Array<Investment & {
    currentPrice: number;
    value: number;
    cost: number;
    gainLoss: number;
    gainLossPercent: number;
    marketData: MarketData;
  }>;
}

// 🚀 NEW: WebSocket Message Types
export interface WebSocketMessage {
  type: 'market-data' | 'portfolio-update' | 'news-alert' | 'auth' | 'error';
  data?: any;
  timestamp: Date;
}

// 🚀 NEW: Provider Status Types
export interface NewsProvider {
  name: string;
  isAvailable: boolean;
  rateLimitRemaining: number;
  lastReset: Date;
  hasApiKey: boolean;
}

export interface ServiceStatus {
  websocket?: {
    totalClients: number;
    authenticatedClients: number;
  };
  aiService?: {
    circuitBreaker: {
      status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
      canMakeRequest: boolean;
    };
  };
  newsProviders?: Record<string, NewsProvider>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  currency: string;
  darkMode: boolean;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date: Date;
  currency: string;
  originalCurrency?: string;
  originalAmount?: number;
  receiptUrl?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly';
  tags?: string[];
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  allocated: number;
  spent: number;
  month: string;
  year: number;
  currency: string;
  originalCurrency?: string;
  originalAmount?: number;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  category: string;
  priority: 'low' | 'medium' | 'high';
  currency: string;
  originalCurrency?: string;
  originalAmount?: number;
}

export interface Investment {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  type: 'stock' | 'crypto' | 'etf' | 'bond' | 'real_estate' | '401k' | 'other';
  purchaseDate: Date;
  currency: string;
  originalCurrency?: string;
  originalPurchasePrice?: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUrl?: string;
  context?: any;
}

export interface Recommendation {
  id: string;
  userId: string;
  type: 'investment' | 'budget' | 'savings';
  title: string;
  description: string;
  confidence: number;
  reasoning: string[];
  actionItems: string[];
  createdAt: Date;
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  totalAmount: number;
  remainingBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: Date;
  type: 'credit_card' | 'loan' | 'mortgage' | 'student_loan' | 'other';
  currency: string;
  originalCurrency?: string;
  originalAmount?: number;
  createdAt: Date;
}

export interface ImportData {
  id: string;
  userId: string;
  type: 'bank' | 'broker' | 'mpesa';
  fileName: string;
  uploadDate: Date;
  status: 'processing' | 'completed' | 'failed';
  transactionsImported: number;
  errors?: string[];
}

export interface FinancialHealthScore {
  overall: number;
  emergencyFund: number;
  cashFlow: number;
  debtToIncome: number;
  savingsRate: number;
  diversification: number;
}
export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  paymentDate: Date;
  currency: string;
}