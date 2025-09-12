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

// Provider Status Types
export interface NewsProvider {
  name: string;
  isAvailable: boolean;
  rateLimitRemaining: number;
  lastReset: Date;
  hasApiKey: boolean;
}

export interface ServiceStatus {
  aiService?: {
    circuitBreaker: {
      status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
      canMakeRequest: boolean;
    };
  };
  newsProviders?: Record<string, NewsProvider>;
}

export type RiskProfileType =
  | 'conservative'
  | 'moderate'
  | 'aggressive'
  | { level: 'conservative' | 'moderate' | 'aggressive'; [key: string]: any };

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  dateOfBirth?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin';
  riskProfile: RiskProfileType;
  currency: string;
  darkMode: boolean;
  createdAt: Date;
  profile?: UserProfile;
}

// Mock Data Types for Admin
export interface MockDataConfig {
  accounts?: number;
  transactionsPerMonth?: number;
  monthsOfHistory?: number;
  includeInvestments?: boolean;
  includeBudgets?: boolean;
  includeGoals?: boolean;
  includeDebts?: boolean;
}

export interface MockDataSummary {
  accounts: number;
  transactions: number;
  investments: number;
  budgets: number;
  goals: number;
  debts: number;
}

export interface MockDataResponse {
  success: boolean;
  message: string;
  summary: MockDataSummary;
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

// Account Management Types
export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'checking' | 'savings' | 'money_market' | 'cd' | 'credit_card' | 'loan' | 'investment' | 'retirement' | 'other';
  institution: string;
  balance: number;
  currency: string;
  interestRate?: number;
  lastSynced?: Date;
  isActive: boolean;
  accountNumber?: string; // Masked for security
  routingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Physical Asset Types
export interface LoanInfo {
  loanAmount: number;
  interestRate: number;
  loanTerm: number; // in years
  monthlyPayment: number;
  remainingBalance: number;
  lender?: string;
  startDate: Date;
}

export interface PhysicalAsset {
  id: string;
  userId: string;
  name: string;
  type: 'real_estate' | 'vehicle' | 'jewelry' | 'art' | 'collectibles' | 'electronics' | 'furniture' | 'other';
  currentValue: number;
  purchasePrice?: number;
  purchaseDate?: Date;
  currency: string;
  hasLoan: boolean;
  loanInfo?: LoanInfo;
  equity?: number; // Calculated: currentValue - remainingBalance
  description?: string;
  location?: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  images?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}