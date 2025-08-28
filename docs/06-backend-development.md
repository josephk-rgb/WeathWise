# Part 6: Backend API Development

## 6.1 RESTful API Architecture

### API Design Principles

```typescript
// server/src/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    pagination?: PaginationMeta;
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiRequest {
  userId?: string;
  query?: Record<string, any>;
  body?: Record<string, any>;
  params?: Record<string, any>;
  headers?: Record<string, any>;
}
```

### Base API Controller

```typescript
// server/src/controllers/baseController.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse, PaginationMeta } from '../types/api';
import { DatabaseService } from '../services/databaseService';
import { AuditService } from '../services/auditService';

export abstract class BaseController {
  protected db: DatabaseService;
  protected auditService: AuditService;

  constructor() {
    this.db = new DatabaseService();
    this.auditService = new AuditService();
  }

  protected successResponse<T>(
    data: T,
    res: Response,
    metadata?: any
  ): Response<ApiResponse<T>> {
    return res.json({
      success: true,
      data,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
        version: process.env.API_VERSION || '1.0.0'
      }
    });
  }

  protected errorResponse(
    error: string | Error,
    res: Response,
    statusCode: number = 500,
    code?: string
  ): Response<ApiResponse> {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorCode = code || 'INTERNAL_ERROR';

    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
        version: process.env.API_VERSION || '1.0.0'
      }
    });
  }

  protected paginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    res: Response
  ): Response<ApiResponse<T[]>> {
    const totalPages = Math.ceil(total / limit);
    
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };

    return this.successResponse(data, res, { pagination });
  }

  protected async logActivity(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: any,
    req?: Request
  ): Promise<void> {
    await this.auditService.logEvent({
      userId,
      action,
      resource,
      resourceId,
      metadata,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      outcome: 'success',
      timestamp: new Date()
    });
  }

  protected validatePagination(page?: string, limit?: string) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
    return { page: pageNum, limit: limitNum };
  }

  protected extractUserId(req: Request): string {
    const authReq = req as any;
    if (!authReq.user?.sub) {
      throw new Error('User ID not found in request');
    }
    return authReq.user.sub;
  }
}
```

### User Management API

```typescript
// server/src/controllers/userController.ts
import { Request, Response } from 'express';
import { BaseController } from './baseController';
import { UserService } from '../services/userService';
import { EncryptionService } from '../services/encryptionService';
import { validateUserUpdate } from '../middleware/validation';

export class UserController extends BaseController {
  private userService: UserService;
  private encryptionService: EncryptionService;

  constructor() {
    super();
    this.userService = new UserService();
    this.encryptionService = new EncryptionService();
  }

  // GET /api/users/profile
  getProfile = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const user = await this.userService.getUserProfile(userId);

      if (!user) {
        return this.errorResponse('User not found', res, 404, 'USER_NOT_FOUND');
      }

      // Remove sensitive data before sending
      const safeUser = {
        id: user._id,
        email: user.email,
        profile: user.profile,
        preferences: user.preferences,
        riskProfile: user.riskProfile,
        subscription: user.subscription,
        metadata: {
          lastLogin: user.metadata.lastLogin,
          onboardingCompleted: user.metadata.onboardingCompleted
        }
      };

      await this.logActivity(userId, 'profile_viewed', 'user', userId, null, req);
      
      return this.successResponse(safeUser, res);
    } catch (error) {
      console.error('Get profile error:', error);
      return this.errorResponse(error, res);
    }
  };

  // PUT /api/users/profile
  updateProfile = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const updates = req.body;

      // Validate and sanitize updates
      const allowedFields = ['firstName', 'lastName', 'dateOfBirth', 'phone', 'address'];
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {} as any);

      const updatedUser = await this.userService.updateUserProfile(userId, filteredUpdates);

      await this.logActivity(
        userId, 
        'profile_updated', 
        'user', 
        userId, 
        { fields: Object.keys(filteredUpdates) }, 
        req
      );

      return this.successResponse(updatedUser, res);
    } catch (error) {
      console.error('Update profile error:', error);
      return this.errorResponse(error, res);
    }
  };

  // PUT /api/users/preferences
  updatePreferences = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const preferences = req.body;

      const updatedUser = await this.userService.updateUserPreferences(userId, preferences);

      await this.logActivity(userId, 'preferences_updated', 'user', userId, preferences, req);

      return this.successResponse(updatedUser.preferences, res);
    } catch (error) {
      console.error('Update preferences error:', error);
      return this.errorResponse(error, res);
    }
  };

  // PUT /api/users/risk-profile
  updateRiskProfile = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const { level, questionnaire } = req.body;

      const riskProfile = {
        level,
        questionnaire: {
          ...questionnaire,
          completedAt: new Date()
        }
      };

      const updatedUser = await this.userService.updateRiskProfile(userId, riskProfile);

      await this.logActivity(userId, 'risk_profile_updated', 'user', userId, { level }, req);

      return this.successResponse(updatedUser.riskProfile, res);
    } catch (error) {
      console.error('Update risk profile error:', error);
      return this.errorResponse(error, res);
    }
  };

  // GET /api/users/activity
  getActivity = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const { page, limit } = this.validatePagination(req.query.page as string, req.query.limit as string);

      const activities = await this.auditService.getUserActivities(userId, page, limit);
      const total = await this.auditService.getUserActivityCount(userId);

      return this.paginatedResponse(activities, total, page, limit, res);
    } catch (error) {
      console.error('Get activity error:', error);
      return this.errorResponse(error, res);
    }
  };

  // DELETE /api/users/account
  deleteAccount = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const { confirmation } = req.body;

      if (confirmation !== 'DELETE_MY_ACCOUNT') {
        return this.errorResponse(
          'Invalid confirmation phrase', 
          res, 
          400, 
          'INVALID_CONFIRMATION'
        );
      }

      await this.userService.deleteUser(userId);

      await this.logActivity(userId, 'account_deleted', 'user', userId, null, req);

      return this.successResponse({ message: 'Account deleted successfully' }, res);
    } catch (error) {
      console.error('Delete account error:', error);
      return this.errorResponse(error, res);
    }
  };

  // GET /api/users/export
  exportData = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const exportData = await this.userService.exportUserData(userId);

      await this.logActivity(userId, 'data_exported', 'user', userId, null, req);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="wealthwise-data-${userId}.json"`);
      
      return res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
      console.error('Export data error:', error);
      return this.errorResponse(error, res);
    }
  };
}
```

### Investment Portfolio API

```typescript
// server/src/controllers/investmentController.ts
import { Request, Response } from 'express';
import { BaseController } from './baseController';
import { InvestmentService } from '../services/investmentService';
import { MarketDataService } from '../services/marketDataService';
import { PortfolioAnalysisService } from '../services/portfolioAnalysisService';

export class InvestmentController extends BaseController {
  private investmentService: InvestmentService;
  private marketDataService: MarketDataService;
  private portfolioAnalysisService: PortfolioAnalysisService;

  constructor() {
    super();
    this.investmentService = new InvestmentService();
    this.marketDataService = new MarketDataService();
    this.portfolioAnalysisService = new PortfolioAnalysisService();
  }

  // GET /api/investments
  getUserInvestments = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const { page, limit } = this.validatePagination(req.query.page as string, req.query.limit as string);
      const { type, sortBy, sortOrder } = req.query;

      const filters = {
        type: type as string,
        sortBy: sortBy as string || 'marketValue',
        sortOrder: sortOrder as 'asc' | 'desc' || 'desc'
      };

      const { investments, total } = await this.investmentService.getUserInvestments(
        userId, 
        page, 
        limit, 
        filters
      );

      // Update current prices
      const updatedInvestments = await this.marketDataService.updateInvestmentPrices(investments);

      return this.paginatedResponse(updatedInvestments, total, page, limit, res);
    } catch (error) {
      console.error('Get investments error:', error);
      return this.errorResponse(error, res);
    }
  };

  // POST /api/investments
  createInvestment = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const investmentData = {
        ...req.body,
        userId
      };

      // Validate symbol exists
      const marketData = await this.marketDataService.getSymbolInfo(investmentData.symbol);
      if (!marketData) {
        return this.errorResponse(
          'Invalid symbol or symbol not found', 
          res, 
          400, 
          'INVALID_SYMBOL'
        );
      }

      // Create investment with current market price
      investmentData.currentPrice = marketData.currentPrice;
      const investment = await this.investmentService.createInvestment(investmentData);

      await this.logActivity(
        userId, 
        'investment_created', 
        'investment', 
        investment._id.toString(), 
        { symbol: investment.securityInfo.symbol }, 
        req
      );

      return this.successResponse(investment, res, { status: 201 });
    } catch (error) {
      console.error('Create investment error:', error);
      return this.errorResponse(error, res);
    }
  };

  // PUT /api/investments/:id
  updateInvestment = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const investmentId = req.params.id;
      const updates = req.body;

      const investment = await this.investmentService.updateInvestment(
        investmentId, 
        userId, 
        updates
      );

      if (!investment) {
        return this.errorResponse(
          'Investment not found or unauthorized', 
          res, 
          404, 
          'INVESTMENT_NOT_FOUND'
        );
      }

      await this.logActivity(
        userId, 
        'investment_updated', 
        'investment', 
        investmentId, 
        { fields: Object.keys(updates) }, 
        req
      );

      return this.successResponse(investment, res);
    } catch (error) {
      console.error('Update investment error:', error);
      return this.errorResponse(error, res);
    }
  };

  // DELETE /api/investments/:id
  deleteInvestment = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const investmentId = req.params.id;

      const deleted = await this.investmentService.deleteInvestment(investmentId, userId);

      if (!deleted) {
        return this.errorResponse(
          'Investment not found or unauthorized', 
          res, 
          404, 
          'INVESTMENT_NOT_FOUND'
        );
      }

      await this.logActivity(
        userId, 
        'investment_deleted', 
        'investment', 
        investmentId, 
        null, 
        req
      );

      return this.successResponse({ message: 'Investment deleted successfully' }, res);
    } catch (error) {
      console.error('Delete investment error:', error);
      return this.errorResponse(error, res);
    }
  };

  // GET /api/investments/portfolio/summary
  getPortfolioSummary = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      
      const summary = await this.portfolioAnalysisService.getPortfolioSummary(userId);

      return this.successResponse(summary, res);
    } catch (error) {
      console.error('Get portfolio summary error:', error);
      return this.errorResponse(error, res);
    }
  };

  // GET /api/investments/portfolio/performance
  getPortfolioPerformance = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const { period } = req.query;

      const performance = await this.portfolioAnalysisService.getPortfolioPerformance(
        userId, 
        period as string
      );

      return this.successResponse(performance, res);
    } catch (error) {
      console.error('Get portfolio performance error:', error);
      return this.errorResponse(error, res);
    }
  };

  // GET /api/investments/portfolio/allocation
  getAssetAllocation = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      
      const allocation = await this.portfolioAnalysisService.getAssetAllocation(userId);

      return this.successResponse(allocation, res);
    } catch (error) {
      console.error('Get asset allocation error:', error);
      return this.errorResponse(error, res);
    }
  };

  // POST /api/investments/portfolio/rebalance
  rebalancePortfolio = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = this.extractUserId(req);
      const { targetAllocations, riskTolerance } = req.body;

      const rebalancePlan = await this.portfolioAnalysisService.generateRebalancePlan(
        userId,
        targetAllocations,
        riskTolerance
      );

      await this.logActivity(
        userId, 
        'portfolio_rebalance_calculated', 
        'portfolio', 
        userId, 
        { riskTolerance }, 
        req
      );

      return this.successResponse(rebalancePlan, res);
    } catch (error) {
      console.error('Portfolio rebalance error:', error);
      return this.errorResponse(error, res);
    }
  };

  // GET /api/investments/search/:query
  searchInvestments = async (req: Request, res: Response): Promise<Response> => {
    try {
      const query = req.params.query;
      const { type, limit } = req.query;

      const results = await this.marketDataService.searchSymbols(
        query,
        type as string,
        parseInt(limit as string) || 10
      );

      return this.successResponse(results, res);
    } catch (error) {
      console.error('Search investments error:', error);
      return this.errorResponse(error, res);
    }
  };
}
```

## 6.2 GraphQL Integration

### GraphQL Schema Definition

```typescript
// server/src/graphql/schema.ts
import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar Date
  scalar JSON

  type User {
    id: ID!
    email: String!
    profile: UserProfile!
    preferences: UserPreferences!
    riskProfile: RiskProfile!
    subscription: Subscription!
    createdAt: Date!
  }

  type UserProfile {
    firstName: String!
    lastName: String!
    avatar: String
    dateOfBirth: Date
    phone: String
  }

  type UserPreferences {
    currency: String!
    timezone: String!
    language: String!
    theme: String!
    notifications: NotificationSettings!
  }

  type NotificationSettings {
    email: Boolean!
    push: Boolean!
    sms: Boolean!
    trading: Boolean!
    news: Boolean!
  }

  type RiskProfile {
    level: RiskLevel!
    questionnaire: RiskQuestionnaire!
  }

  enum RiskLevel {
    CONSERVATIVE
    MODERATE
    AGGRESSIVE
  }

  type RiskQuestionnaire {
    age: Int!
    experience: String!
    timeline: String!
    riskTolerance: Int!
    completedAt: Date!
  }

  type Subscription {
    plan: SubscriptionPlan!
    startDate: Date!
    endDate: Date
    features: [String!]!
  }

  enum SubscriptionPlan {
    FREE
    PREMIUM
    ENTERPRISE
  }

  type Investment {
    id: ID!
    user: User!
    securityInfo: SecurityInfo!
    position: Position!
    acquisition: Acquisition!
    analytics: Analytics
    alerts: [Alert!]!
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  type SecurityInfo {
    symbol: String!
    name: String!
    type: SecurityType!
    exchange: String
    currency: String!
    isin: String
    cusip: String
  }

  enum SecurityType {
    STOCK
    ETF
    MUTUAL_FUND
    BOND
    CRYPTO
    REAL_ESTATE
    COMMODITY
  }

  type Position {
    shares: Float!
    averageCost: Float!
    totalCost: Float!
    currentPrice: Float!
    marketValue: Float!
    gainLoss: Float!
    gainLossPercent: Float!
    dayChange: Float!
    dayChangePercent: Float!
  }

  type Acquisition {
    purchaseDate: Date!
    purchaseMethod: String!
    purchasePrice: Float!
    fees: Float
    brokerage: String
  }

  type Analytics {
    beta: Float
    peRatio: Float
    dividendYield: Float
    expenseRatio: Float
    sector: String
    industry: String
    marketCap: Float
    lastAnalyzed: Date
  }

  type Alert {
    id: ID!
    type: AlertType!
    condition: AlertCondition!
    value: Float!
    isActive: Boolean!
    createdAt: Date!
  }

  enum AlertType {
    PRICE_TARGET
    PERCENTAGE_GAIN
    PERCENTAGE_LOSS
  }

  enum AlertCondition {
    ABOVE
    BELOW
  }

  type Transaction {
    id: ID!
    user: User!
    account: Account
    transactionInfo: TransactionInfo!
    categorization: Categorization!
    location: Location
    metadata: TransactionMetadata!
    audit: AuditInfo!
    createdAt: Date!
    updatedAt: Date!
  }

  type TransactionInfo {
    amount: Float!
    currency: String!
    originalAmount: Float
    originalCurrency: String
    exchangeRate: Float
    description: String!
    type: TransactionType!
    category: String!
    subcategory: String
    date: Date!
    processedDate: Date
  }

  enum TransactionType {
    INCOME
    EXPENSE
    TRANSFER
    INVESTMENT
  }

  type Categorization {
    automatic: Boolean!
    confidence: Float
    userOverridden: Boolean!
    suggestedCategories: [String!]
  }

  type PortfolioSummary {
    totalValue: Float!
    totalCost: Float!
    totalGainLoss: Float!
    totalGainLossPercent: Float!
    dayChange: Float!
    dayChangePercent: Float!
    cashBalance: Float!
    allocation: AssetAllocation!
    performance: PerformanceMetrics!
    riskMetrics: RiskMetrics!
  }

  type AssetAllocation {
    byAssetType: [AllocationItem!]!
    bySector: [AllocationItem!]!
    byRegion: [AllocationItem!]!
  }

  type AllocationItem {
    name: String!
    value: Float!
    percentage: Float!
    count: Int!
  }

  type PerformanceMetrics {
    oneDay: Float!
    oneWeek: Float!
    oneMonth: Float!
    threeMonth: Float!
    sixMonth: Float!
    oneYear: Float!
    inception: Float!
    benchmarkComparison: BenchmarkComparison
  }

  type BenchmarkComparison {
    spy: Float!
    qqq: Float!
    custom: Float
  }

  type RiskMetrics {
    beta: Float!
    sharpeRatio: Float!
    volatility: Float!
    maxDrawdown: Float!
    var95: Float!
    diversificationRatio: Float!
  }

  type Recommendation {
    id: ID!
    user: User!
    type: RecommendationType!
    priority: RecommendationPriority!
    title: String!
    description: String!
    reasoning: [String!]!
    actionItems: [String!]!
    expectedImpact: ExpectedImpact!
    targetSecurity: TargetSecurity
    mlModel: MLModel!
    userFeedback: UserFeedback
    status: RecommendationStatus!
    expiresAt: Date
    createdAt: Date!
  }

  enum RecommendationType {
    BUY
    SELL
    HOLD
    REBALANCE
    BUDGET
    GOAL
  }

  enum RecommendationPriority {
    LOW
    MEDIUM
    HIGH
    URGENT
  }

  type ExpectedImpact {
    metric: String!
    value: Float!
    unit: String!
  }

  type TargetSecurity {
    symbol: String!
    name: String!
    targetPrice: Float
    targetShares: Float
    targetAllocation: Float
  }

  type MLModel {
    modelName: String!
    version: String!
    confidence: Float!
    features: JSON!
    backtestResults: BacktestResults
  }

  type BacktestResults {
    sharpeRatio: Float!
    maxDrawdown: Float!
    winRate: Float!
  }

  type UserFeedback {
    rating: Int!
    implemented: Boolean!
    implementedAt: Date
    outcome: FeedbackOutcome
    comments: String
  }

  enum FeedbackOutcome {
    POSITIVE
    NEGATIVE
    NEUTRAL
  }

  enum RecommendationStatus {
    PENDING
    VIEWED
    DISMISSED
    IMPLEMENTED
  }

  # Queries
  type Query {
    # User queries
    me: User
    userActivity(page: Int, limit: Int): PaginatedActivityList

    # Investment queries
    investments(
      page: Int
      limit: Int
      type: SecurityType
      sortBy: String
      sortOrder: String
    ): PaginatedInvestmentList
    
    investment(id: ID!): Investment
    portfolioSummary: PortfolioSummary
    portfolioPerformance(period: String): PerformanceMetrics
    assetAllocation: AssetAllocation
    searchInvestments(query: String!, type: SecurityType, limit: Int): [SecurityInfo!]!

    # Transaction queries
    transactions(
      page: Int
      limit: Int
      type: TransactionType
      category: String
      startDate: Date
      endDate: Date
    ): PaginatedTransactionList
    
    transaction(id: ID!): Transaction
    transactionSummary(period: String): TransactionSummary

    # Recommendation queries
    recommendations(
      page: Int
      limit: Int
      type: RecommendationType
      status: RecommendationStatus
    ): PaginatedRecommendationList
    
    recommendation(id: ID!): Recommendation

    # Market data queries
    marketData(symbol: String!): MarketData
    marketSentiment(symbol: String!): SentimentAnalysis
  }

  # Mutations
  type Mutation {
    # User mutations
    updateProfile(input: UpdateProfileInput!): User
    updatePreferences(input: UpdatePreferencesInput!): User
    updateRiskProfile(input: UpdateRiskProfileInput!): User
    deleteAccount(confirmation: String!): DeleteAccountResult

    # Investment mutations
    createInvestment(input: CreateInvestmentInput!): Investment
    updateInvestment(id: ID!, input: UpdateInvestmentInput!): Investment
    deleteInvestment(id: ID!): DeleteInvestmentResult
    createAlert(investmentId: ID!, input: CreateAlertInput!): Alert
    updateAlert(id: ID!, input: UpdateAlertInput!): Alert
    deleteAlert(id: ID!): DeleteAlertResult

    # Transaction mutations
    createTransaction(input: CreateTransactionInput!): Transaction
    updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction
    deleteTransaction(id: ID!): DeleteTransactionResult
    categorizeTransaction(id: ID!, category: String!): Transaction

    # Recommendation mutations
    provideFeedback(id: ID!, input: RecommendationFeedbackInput!): Recommendation
    dismissRecommendation(id: ID!): Recommendation
    implementRecommendation(id: ID!): Recommendation

    # Portfolio mutations
    rebalancePortfolio(input: RebalancePortfolioInput!): RebalancePlan
  }

  # Subscriptions
  type Subscription {
    # Real-time price updates
    priceUpdates(symbols: [String!]!): PriceUpdate
    
    # Portfolio updates
    portfolioUpdates(userId: ID!): PortfolioUpdate
    
    # New recommendations
    newRecommendations(userId: ID!): Recommendation
    
    # Market alerts
    marketAlerts(userId: ID!): MarketAlert
  }

  # Input types
  input UpdateProfileInput {
    firstName: String
    lastName: String
    dateOfBirth: Date
    phone: String
  }

  input UpdatePreferencesInput {
    currency: String
    timezone: String
    language: String
    theme: String
    notifications: NotificationSettingsInput
  }

  input NotificationSettingsInput {
    email: Boolean
    push: Boolean
    sms: Boolean
    trading: Boolean
    news: Boolean
  }

  input UpdateRiskProfileInput {
    level: RiskLevel!
    questionnaire: RiskQuestionnaireInput!
  }

  input RiskQuestionnaireInput {
    age: Int!
    experience: String!
    timeline: String!
    riskTolerance: Int!
  }

  input CreateInvestmentInput {
    symbol: String!
    name: String!
    shares: Float!
    purchasePrice: Float!
    type: SecurityType!
    purchaseDate: Date!
    purchaseMethod: String!
    fees: Float
    brokerage: String
  }

  input UpdateInvestmentInput {
    shares: Float
    averageCost: Float
    notes: String
  }

  input CreateAlertInput {
    type: AlertType!
    condition: AlertCondition!
    value: Float!
  }

  input UpdateAlertInput {
    value: Float
    isActive: Boolean
  }

  input CreateTransactionInput {
    amount: Float!
    description: String!
    category: String!
    type: TransactionType!
    date: Date!
    accountId: ID
  }

  input UpdateTransactionInput {
    amount: Float
    description: String
    category: String
    date: Date
  }

  input RecommendationFeedbackInput {
    rating: Int!
    implemented: Boolean!
    outcome: FeedbackOutcome
    comments: String
  }

  input RebalancePortfolioInput {
    targetAllocations: JSON!
    riskTolerance: RiskLevel!
  }

  # Paginated result types
  type PaginatedInvestmentList {
    data: [Investment!]!
    pagination: PaginationInfo!
  }

  type PaginatedTransactionList {
    data: [Transaction!]!
    pagination: PaginationInfo!
  }

  type PaginatedRecommendationList {
    data: [Recommendation!]!
    pagination: PaginationInfo!
  }

  type PaginatedActivityList {
    data: [ActivityItem!]!
    pagination: PaginationInfo!
  }

  type PaginationInfo {
    page: Int!
    limit: Int!
    total: Int!
    totalPages: Int!
    hasNext: Boolean!
    hasPrev: Boolean!
  }

  # Additional types
  type DeleteAccountResult {
    success: Boolean!
    message: String!
  }

  type DeleteInvestmentResult {
    success: Boolean!
    message: String!
  }

  type DeleteAlertResult {
    success: Boolean!
    message: String!
  }

  type DeleteTransactionResult {
    success: Boolean!
    message: String!
  }

  type RebalancePlan {
    currentAllocation: [AllocationItem!]!
    targetAllocation: [AllocationItem!]!
    recommendedTrades: [RecommendedTrade!]!
    estimatedCosts: Float!
    expectedImpact: ExpectedImpact!
  }

  type RecommendedTrade {
    symbol: String!
    action: String!
    shares: Float!
    estimatedPrice: Float!
    estimatedValue: Float!
  }

  type ActivityItem {
    id: ID!
    action: String!
    resource: String!
    resourceId: String
    metadata: JSON
    timestamp: Date!
  }

  type TransactionSummary {
    totalIncome: Float!
    totalExpenses: Float!
    netCashFlow: Float!
    categoryBreakdown: [CategoryBreakdown!]!
    monthlyTrends: [MonthlyTrend!]!
  }

  type CategoryBreakdown {
    category: String!
    amount: Float!
    percentage: Float!
    transactionCount: Int!
  }

  type MonthlyTrend {
    month: String!
    income: Float!
    expenses: Float!
    netFlow: Float!
  }

  type MarketData {
    symbol: String!
    name: String!
    currentPrice: Float!
    change: Float!
    changePercent: Float!
    volume: Float!
    marketCap: Float
    peRatio: Float
    dividendYield: Float
    lastUpdated: Date!
  }

  type SentimentAnalysis {
    symbol: String!
    sentiment: String!
    confidence: Float!
    reasoning: [String!]!
    lastAnalyzed: Date!
  }

  type PriceUpdate {
    symbol: String!
    price: Float!
    change: Float!
    changePercent: Float!
    timestamp: Date!
  }

  type PortfolioUpdate {
    totalValue: Float!
    dayChange: Float!
    dayChangePercent: Float!
    timestamp: Date!
  }

  type MarketAlert {
    type: String!
    message: String!
    severity: String!
    timestamp: Date!
  }
`;
```

### GraphQL Resolvers

```typescript
// server/src/graphql/resolvers.ts
import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { UserService } from '../services/userService';
import { InvestmentService } from '../services/investmentService';
import { TransactionService } from '../services/transactionService';
import { RecommendationService } from '../services/recommendationService';
import { MarketDataService } from '../services/marketDataService';
import { PortfolioAnalysisService } from '../services/portfolioAnalysisService';

export const resolvers = {
  Query: {
    // User queries
    me: async (_, __, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      return await services.userService.getUserProfile(user.sub);
    },

    userActivity: async (_, { page = 1, limit = 20 }, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      
      const activities = await services.auditService.getUserActivities(user.sub, page, limit);
      const total = await services.auditService.getUserActivityCount(user.sub);
      
      return {
        data: activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    },

    // Investment queries
    investments: async (_, args, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      
      const { page = 1, limit = 20, type, sortBy, sortOrder } = args;
      const filters = { type, sortBy, sortOrder };
      
      const { investments, total } = await services.investmentService.getUserInvestments(
        user.sub, page, limit, filters
      );
      
      return {
        data: investments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    },

    investment: async (_, { id }, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      
      const investment = await services.investmentService.getInvestmentById(id, user.sub);
      if (!investment) throw new UserInputError('Investment not found');
      
      return investment;
    },

    portfolioSummary: async (_, __, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      return await services.portfolioAnalysisService.getPortfolioSummary(user.sub);
    },

    portfolioPerformance: async (_, { period }, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      return await services.portfolioAnalysisService.getPortfolioPerformance(user.sub, period);
    },

    assetAllocation: async (_, __, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      return await services.portfolioAnalysisService.getAssetAllocation(user.sub);
    },

    searchInvestments: async (_, { query, type, limit = 10 }, { services }: any) => {
      return await services.marketDataService.searchSymbols(query, type, limit);
    },

    // Market data queries
    marketData: async (_, { symbol }, { services }: any) => {
      return await services.marketDataService.getMarketData(symbol);
    },

    marketSentiment: async (_, { symbol }, { services }: any) => {
      return await services.marketDataService.getSentimentAnalysis(symbol);
    }
  },

  Mutation: {
    // User mutations
    updateProfile: async (_, { input }, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      return await services.userService.updateUserProfile(user.sub, input);
    },

    updatePreferences: async (_, { input }, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      return await services.userService.updateUserPreferences(user.sub, input);
    },

    updateRiskProfile: async (_, { input }, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      return await services.userService.updateRiskProfile(user.sub, input);
    },

    deleteAccount: async (_, { confirmation }, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      
      if (confirmation !== 'DELETE_MY_ACCOUNT') {
        throw new UserInputError('Invalid confirmation phrase');
      }
      
      await services.userService.deleteUser(user.sub);
      return { success: true, message: 'Account deleted successfully' };
    },

    // Investment mutations
    createInvestment: async (_, { input }, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      
      const investmentData = { ...input, userId: user.sub };
      return await services.investmentService.createInvestment(investmentData);
    },

    updateInvestment: async (_, { id, input }, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      
      const investment = await services.investmentService.updateInvestment(id, user.sub, input);
      if (!investment) throw new UserInputError('Investment not found or unauthorized');
      
      return investment;
    },

    deleteInvestment: async (_, { id }, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      
      const deleted = await services.investmentService.deleteInvestment(id, user.sub);
      if (!deleted) throw new UserInputError('Investment not found or unauthorized');
      
      return { success: true, message: 'Investment deleted successfully' };
    },

    // Portfolio mutations
    rebalancePortfolio: async (_, { input }, { user, services }: any) => {
      if (!user) throw new AuthenticationError('Authentication required');
      
      return await services.portfolioAnalysisService.generateRebalancePlan(
        user.sub,
        input.targetAllocations,
        input.riskTolerance
      );
    }
  },

  Subscription: {
    priceUpdates: {
      subscribe: (_, { symbols }, { pubsub }: any) => {
        return pubsub.asyncIterator(`PRICE_UPDATES_${symbols.join('_')}`);
      }
    },

    portfolioUpdates: {
      subscribe: (_, { userId }, { user, pubsub }: any) => {
        if (!user || user.sub !== userId) {
          throw new ForbiddenError('Unauthorized subscription');
        }
        return pubsub.asyncIterator(`PORTFOLIO_UPDATES_${userId}`);
      }
    },

    newRecommendations: {
      subscribe: (_, { userId }, { user, pubsub }: any) => {
        if (!user || user.sub !== userId) {
          throw new ForbiddenError('Unauthorized subscription');
        }
        return pubsub.asyncIterator(`NEW_RECOMMENDATIONS_${userId}`);
      }
    },

    marketAlerts: {
      subscribe: (_, { userId }, { user, pubsub }: any) => {
        if (!user || user.sub !== userId) {
          throw new ForbiddenError('Unauthorized subscription');
        }
        return pubsub.asyncIterator(`MARKET_ALERTS_${userId}`);
      }
    }
  },

  // Field resolvers
  Investment: {
    user: async (investment, _, { services }: any) => {
      return await services.userService.getUserById(investment.userId);
    }
  },

  Transaction: {
    user: async (transaction, _, { services }: any) => {
      return await services.userService.getUserById(transaction.userId);
    },
    account: async (transaction, _, { services }: any) => {
      if (transaction.accountId) {
        return await services.accountService.getAccountById(transaction.accountId);
      }
      return null;
    }
  },

  Recommendation: {
    user: async (recommendation, _, { services }: any) => {
      return await services.userService.getUserById(recommendation.userId);
    }
  },

  // Custom scalars
  Date: {
    serialize: (date: Date) => date.toISOString(),
    parseValue: (value: string) => new Date(value),
    parseLiteral: (ast: any) => new Date(ast.value)
  },

  JSON: {
    serialize: (value: any) => value,
    parseValue: (value: any) => value,
    parseLiteral: (ast: any) => JSON.parse(ast.value)
  }
};
```

## Next Steps

Part 7 will cover Frontend Implementation:
- React component architecture and optimization
- State management with Zustand
- Real-time UI updates with WebSockets
- Chart integration and data visualization
- Responsive design and accessibility
- Performance optimization techniques
