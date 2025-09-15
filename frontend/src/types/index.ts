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

// Legacy Mock Data Types (DEPRECATED - Use Persona System Instead)
// The old mock data system has been completely replaced by the persona-based system.
// Use the PersonaManagement types below for all data generation needs.

// Persona Management Types
export interface PersonaInfo {
  name: string;
  description: string;
  financialStory: string;
  netWorthJourney: string;
  timeframe: string;
  keyEvents: string[];
}

export interface PersonaTemplate {
  personaInfo: PersonaInfo;
  userProfile: any;
  accounts: any[];
  investments: any[];
  debts: any[];
  budgets: any[];
  goals: any[];
  physicalAssets: any[];
  netWorthProgression: any[];
  accountBalanceProgression: any;
  investmentPriceProgression: any;
  transactionPatterns: any;
}

export interface PersonaLoadOptions {
  clearExistingData?: boolean;
  generateHistoricalData?: boolean;
  batchSize?: number;
  validateData?: boolean;
}

export interface PersonaLoadResult {
  success: boolean;
  personaName: string;
  userId?: string;
  recordsCreated: {
    user: number;
    accounts: number;
    transactions: number;
    investments: number;
    debts: number;
    budgets: number;
    goals: number;
    physicalAssets: number;
    netWorthMilestones: number;
    accountBalanceHistory: number;
    dailyPrices: number;
  };
  processingTime: number;
  errors: string[];
}

export interface PersonaValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: PersonaValidationIssue[];
  warnings: PersonaValidationWarning[];
  summary: {
    totalRecords: number;
    recordsValidated: number;
    validationTime: number;
  };
}

export interface PersonaValidationIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  recordId?: string;
  recordType?: string;
  suggestedFix?: string;
}

export interface PersonaValidationWarning {
  category: string;
  message: string;
  recordId?: string;
  recordType?: string;
}

export interface PersonaStatus {
  userId: string;
  recordCounts: {
    accounts: number;
    transactions: number;
    investments: number;
    debts: number;
    budgets: number;
    goals: number;
    physicalAssets: number;
    netWorthMilestones: number;
    accountBalanceHistory: number;
  };
  totalRecords: number;
  hasData: boolean;
}

export interface PersonaSummary {
  summary: Array<{
    userId: string;
    email: string;
    recordCounts: {
      accounts: number;
      transactions: number;
      investments: number;
      debts: number;
      budgets: number;
      goals: number;
      physicalAssets: number;
      netWorthMilestones: number;
    };
    totalRecords: number;
    hasData: boolean;
  }>;
  total: number;
  limit: number;
  offset: number;
}

export interface PersonaBackup {
  backupName: string;
  timestamp: string;
  userId?: string;
  personaName?: string;
  includeHistoricalData: boolean;
}

export interface PersonaSystemHealth {
  database: {
    users: number;
    accounts: number;
    transactions: number;
    investments: number;
    netWorthMilestones: number;
  };
  snapshots: {
    totalSnapshots: number;
    snapshotsToday: number;
    snapshotsThisWeek: number;
    snapshotsThisMonth: number;
    averageSnapshotsPerUser: number;
    dataQualityMetrics: {
      complete: number;
      partial: number;
      estimated: number;
    };
  };
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    nodeVersion: string;
  };
}

export interface PersonaAnalytics {
  timeframe: string;
  personaName?: string;
  analytics: {
    totalUsers: number;
    activeUsers: number;
    dataLoaded: number;
    averageRecordsPerUser: number;
    mostPopularPersona: string;
    usageTrends: any[];
  };
}

export interface HistoricalDataConfig {
  startDate: Date;
  endDate: Date;
  accountBalanceGranularity: 'daily' | 'weekly' | 'monthly';
  investmentPriceGranularity: 'daily' | 'weekly';
  netWorthSnapshotFrequency: 'daily' | 'weekly' | 'monthly';
  includeMarketVolatility: boolean;
  includeSeasonalVariations: boolean;
  generateTransactionHistory: boolean;
}

export interface HistoricalDataResult {
  accountBalanceHistory: {
    totalRecords: number;
    accountsProcessed: number;
    dateRange: { start: Date; end: Date };
  };
  investmentPriceHistory: {
    totalRecords: number;
    symbolsProcessed: string[];
    dateRange: { start: Date; end: Date };
  };
  netWorthMilestones: {
    totalRecords: number;
    dateRange: { start: Date; end: Date };
  };
  processingTime: number;
  errors: string[];
}

export interface SnapshotStatus {
  statistics: {
    totalSnapshots: number;
    snapshotsToday: number;
    snapshotsThisWeek: number;
    snapshotsThisMonth: number;
    averageSnapshotsPerUser: number;
    dataQualityMetrics: {
      complete: number;
      partial: number;
      estimated: number;
    };
  };
  scheduler: {
    isInitialized: boolean;
    jobs: Array<{
      name: string;
      running: boolean;
      schedule: string;
      timezone: string;
    }>;
    configuration: {
      enabled: boolean;
      schedule: string;
      timezone: string;
      maxRetries: number;
      retryDelay: number;
      batchSize: number;
      cleanupSchedule: string;
    };
  };
}

export interface PersonaExportResult {
  userId: string;
  format: string;
  includeHistoricalData: boolean;
  downloadUrl: string;
}

export interface PersonaImportResult {
  userId: string;
  format: string;
  recordsImported: number;
  errors: string[];
}

export interface Transaction {
  id: string;
  userId: string;
  accountId?: string; // Link to specific account
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