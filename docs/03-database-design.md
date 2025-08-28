# Part 3: Database Design & MongoDB Integration

## 3.1 Database Architecture Overview

### Design Principles
- **Document-Oriented Design** - Leverage MongoDB's flexible schema
- **Data Denormalization** - Optimize for read performance
- **Encryption by Design** - Sensitive financial data encryption
- **Audit Trail** - Complete transaction history tracking
- **Scalability** - Horizontal scaling through sharding

### Database Structure
```
WeathWise Database
├── users                    # User profiles and preferences
├── accounts                # Financial accounts (bank, investment)
├── transactions            # All financial transactions
├── investments             # Investment holdings and history
├── portfolios              # Portfolio snapshots and performance
├── budgets                 # Budget plans and tracking
├── goals                   # Financial goals and progress
├── recommendations         # AI-generated recommendations
├── chat_sessions          # AI chat history and context
├── market_data            # Cached market data
├── audit_logs             # Security and activity logs
└── system_config          # Application configuration
```

## 3.2 Collection Schemas

### Users Collection

```typescript
interface UserDocument {
  _id: ObjectId;
  auth0Id: string;                    // Auth0 user identifier
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    avatar?: string;
    dateOfBirth?: Date;               // Encrypted
    phone?: string;                   // Encrypted
    address?: {
      street: string;                 // Encrypted
      city: string;
      state: string;
      zipCode: string;                // Encrypted
      country: string;
    };
  };
  preferences: {
    currency: string;                 // Default: 'USD'
    timezone: string;                 // Default: 'America/New_York'
    language: string;                 // Default: 'en'
    theme: 'light' | 'dark' | 'auto'; // Default: 'auto'
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      trading: boolean;
      news: boolean;
    };
  };
  riskProfile: {
    level: 'conservative' | 'moderate' | 'aggressive';
    questionnaire: {
      age: number;
      experience: string;
      timeline: string;
      riskTolerance: number;          // 1-10 scale
      completedAt: Date;
    };
  };
  subscription: {
    plan: 'free' | 'premium' | 'enterprise';
    startDate: Date;
    endDate?: Date;
    features: string[];
  };
  encryption: {
    keyId: string;                    // Reference to encryption key
    algorithm: string;                // 'AES-256-GCM'
    version: number;
  };
  metadata: {
    lastLogin: Date;
    loginCount: number;
    ipAddress?: string;               // Last known IP
    userAgent?: string;               // Last known user agent
    onboardingCompleted: boolean;
    tosAcceptedAt?: Date;
    privacyPolicyAcceptedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Accounts Collection

```typescript
interface AccountDocument {
  _id: ObjectId;
  userId: ObjectId;
  type: 'checking' | 'savings' | 'investment' | 'retirement' | 'credit' | 'loan';
  provider: {
    name: string;                     // Bank/Institution name
    id?: string;                      // Provider-specific account ID
    logo?: string;                    // Institution logo URL
  };
  accountInfo: {
    name: string;                     // User-defined account name
    accountNumber: string;            // Encrypted
    routingNumber?: string;           // Encrypted
    balance: number;                  // Encrypted
    currency: string;
    lastSyncedAt?: Date;
  };
  connectionStatus: {
    isConnected: boolean;
    lastConnected?: Date;
    errorMessage?: string;
    provider: 'plaid' | 'yodlee' | 'manual';
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Transactions Collection

```typescript
interface TransactionDocument {
  _id: ObjectId;
  userId: ObjectId;
  accountId?: ObjectId;               // Reference to account
  externalId?: string;                // Provider transaction ID
  
  transactionInfo: {
    amount: number;                   // Encrypted
    currency: string;
    originalAmount?: number;          // Encrypted (for currency conversion)
    originalCurrency?: string;
    exchangeRate?: number;
    description: string;
    type: 'income' | 'expense' | 'transfer' | 'investment';
    category: string;
    subcategory?: string;
    date: Date;
    processedDate?: Date;
  };
  
  categorization: {
    automatic: boolean;               // Was auto-categorized
    confidence?: number;              // ML confidence score
    userOverridden: boolean;
    suggestedCategories?: string[];
  };
  
  location?: {
    merchant: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  metadata: {
    tags: string[];
    notes?: string;
    receiptUrl?: string;              // Link to receipt image
    isRecurring: boolean;
    recurringPattern?: {
      frequency: 'weekly' | 'monthly' | 'yearly';
      nextDate?: Date;
    };
    budgetId?: ObjectId;              // Link to budget category
  };
  
  audit: {
    source: 'manual' | 'import' | 'api' | 'csv';
    importBatchId?: string;
    modifiedBy?: ObjectId;
    modifiedAt?: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Investments Collection

```typescript
interface InvestmentDocument {
  _id: ObjectId;
  userId: ObjectId;
  accountId?: ObjectId;
  
  securityInfo: {
    symbol: string;
    name: string;
    type: 'stock' | 'etf' | 'mutual_fund' | 'bond' | 'crypto' | 'real_estate' | 'commodity';
    exchange?: string;
    currency: string;
    isin?: string;                    // International Securities Identification Number
    cusip?: string;                   // Committee on Uniform Securities Identification Procedures
  };
  
  position: {
    shares: number;                   // Encrypted
    averageCost: number;              // Encrypted
    totalCost: number;                // Encrypted (shares * averageCost)
    currentPrice: number;
    marketValue: number;              // Encrypted (shares * currentPrice)
    gainLoss: number;                 // Encrypted
    gainLossPercent: number;
    dayChange: number;
    dayChangePercent: number;
  };
  
  acquisition: {
    purchaseDate: Date;
    purchaseMethod: 'buy' | 'transfer' | 'dividend_reinvestment' | 'split';
    purchasePrice: number;            // Encrypted
    fees?: number;                    // Encrypted
    brokerage?: string;
  };
  
  analytics: {
    beta?: number;
    pe_ratio?: number;
    dividend_yield?: number;
    expense_ratio?: number;           // For ETFs/Mutual Funds
    sector?: string;
    industry?: string;
    marketCap?: number;
    lastAnalyzed?: Date;
  };
  
  alerts: {
    priceTargets: Array<{
      type: 'above' | 'below';
      price: number;
      isActive: boolean;
      createdAt: Date;
    }>;
    percentageTargets: Array<{
      type: 'gain' | 'loss';
      percentage: number;
      isActive: boolean;
      createdAt: Date;
    }>;
  };
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Portfolio Snapshots Collection

```typescript
interface PortfolioSnapshotDocument {
  _id: ObjectId;
  userId: ObjectId;
  snapshotDate: Date;
  
  portfolio: {
    totalValue: number;               // Encrypted
    totalCost: number;                // Encrypted
    totalGainLoss: number;           // Encrypted
    totalGainLossPercent: number;
    dayChange: number;                // Encrypted
    dayChangePercent: number;
    cashBalance: number;              // Encrypted
  };
  
  allocation: {
    byAssetType: Array<{
      type: string;
      value: number;                  // Encrypted
      percentage: number;
      count: number;
    }>;
    bySector: Array<{
      sector: string;
      value: number;                  // Encrypted
      percentage: number;
      count: number;
    }>;
    byRegion: Array<{
      region: string;
      value: number;                  // Encrypted
      percentage: number;
      count: number;
    }>;
  };
  
  performance: {
    oneDay: number;
    oneWeek: number;
    oneMonth: number;
    threeMonth: number;
    sixMonth: number;
    oneYear: number;
    inception: number;
    benchmarkComparison?: {
      spy: number;                    // S&P 500 comparison
      qqq: number;                    // NASDAQ comparison
      custom?: number;
    };
  };
  
  riskMetrics: {
    beta: number;
    sharpeRatio: number;
    volatility: number;
    maxDrawdown: number;
    var95: number;                    // 95% Value at Risk
    diversificationRatio: number;
  };
  
  createdAt: Date;
}
```

### Recommendations Collection

```typescript
interface RecommendationDocument {
  _id: ObjectId;
  userId: ObjectId;
  
  recommendation: {
    type: 'buy' | 'sell' | 'hold' | 'rebalance' | 'budget' | 'goal';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    title: string;
    description: string;
    reasoning: string[];
    actionItems: string[];
    expectedImpact: {
      metric: string;                 // e.g., 'portfolio_return', 'risk_reduction'
      value: number;
      unit: string;                   // e.g., '%', '$'
    };
  };
  
  targetSecurity?: {
    symbol: string;
    name: string;
    targetPrice?: number;
    targetShares?: number;
    targetAllocation?: number;        // Percentage of portfolio
  };
  
  mlModel: {
    modelName: string;
    version: string;
    confidence: number;               // 0-1 scale
    features: Record<string, number>; // Feature importance
    backtestResults?: {
      sharpeRatio: number;
      maxDrawdown: number;
      winRate: number;
    };
  };
  
  userFeedback?: {
    rating: number;                   // 1-5 scale
    implemented: boolean;
    implementedAt?: Date;
    outcome?: 'positive' | 'negative' | 'neutral';
    comments?: string;
  };
  
  status: 'pending' | 'viewed' | 'dismissed' | 'implemented';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Chat Sessions Collection

```typescript
interface ChatSessionDocument {
  _id: ObjectId;
  userId: ObjectId;
  sessionId: string;                  // Unique session identifier
  
  sessionInfo: {
    title?: string;                   // Auto-generated or user-defined
    startedAt: Date;
    lastMessageAt: Date;
    messageCount: number;
    isActive: boolean;
  };
  
  context: {
    portfolioSnapshot?: ObjectId;     // Reference to portfolio state
    focusArea?: 'portfolio' | 'budgeting' | 'goals' | 'general';
    userIntent?: string;              // Detected user intent
    entities: Record<string, any>;    // Extracted entities (stocks, amounts, etc.)
  };
  
  messages: Array<{
    id: string;
    content: string;                  // Encrypted
    sender: 'user' | 'ai';
    timestamp: Date;
    metadata?: {
      imageUrl?: string;
      attachments?: string[];
      confidence?: number;            // AI confidence in response
      modelUsed?: string;             // Which AI model generated response
      processingTime?: number;        // Response generation time
    };
  }>;
  
  privacy: {
    dataRetentionDays: number;        // Auto-delete after X days
    shareWithSupport: boolean;
    encryptionLevel: 'standard' | 'enhanced';
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

## 3.3 Database Indexes

### Performance Optimization Indexes

```javascript
// Core user operations
db.users.createIndex({ "auth0Id": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": -1 });

// Transaction queries
db.transactions.createIndex({ "userId": 1, "transactionInfo.date": -1 });
db.transactions.createIndex({ "userId": 1, "transactionInfo.category": 1 });
db.transactions.createIndex({ "userId": 1, "transactionInfo.type": 1, "transactionInfo.date": -1 });
db.transactions.createIndex({ "accountId": 1, "transactionInfo.date": -1 });
db.transactions.createIndex({ "externalId": 1 }, { sparse: true });

// Investment portfolio queries
db.investments.createIndex({ "userId": 1, "securityInfo.symbol": 1 });
db.investments.createIndex({ "userId": 1, "isActive": 1 });
db.investments.createIndex({ "securityInfo.type": 1, "userId": 1 });
db.investments.createIndex({ "acquisition.purchaseDate": -1 });

// Portfolio snapshots for performance tracking
db.portfolioSnapshots.createIndex({ "userId": 1, "snapshotDate": -1 });
db.portfolioSnapshots.createIndex({ "snapshotDate": -1 });

// Recommendations for timely delivery
db.recommendations.createIndex({ "userId": 1, "status": 1 });
db.recommendations.createIndex({ "userId": 1, "recommendation.priority": -1, "createdAt": -1 });
db.recommendations.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

// Chat sessions for quick retrieval
db.chatSessions.createIndex({ "userId": 1, "sessionInfo.lastMessageAt": -1 });
db.chatSessions.createIndex({ "sessionId": 1 }, { unique: true });

// Market data caching
db.marketData.createIndex({ "symbol": 1, "timestamp": -1 });
db.marketData.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 86400 }); // 24 hours

// Compound indexes for complex queries
db.transactions.createIndex({ 
  "userId": 1, 
  "transactionInfo.type": 1, 
  "transactionInfo.date": -1,
  "transactionInfo.category": 1 
});

db.investments.createIndex({ 
  "userId": 1, 
  "securityInfo.type": 1, 
  "isActive": 1,
  "position.marketValue": -1 
});
```

### Text Search Indexes

```javascript
// Full-text search capabilities
db.transactions.createIndex({
  "transactionInfo.description": "text",
  "location.merchant": "text",
  "metadata.notes": "text"
});

db.investments.createIndex({
  "securityInfo.name": "text",
  "securityInfo.symbol": "text"
});

db.chatSessions.createIndex({
  "sessionInfo.title": "text",
  "messages.content": "text"
});
```

## 3.4 Data Encryption Strategy

### Field-Level Encryption

```typescript
// Encryption service for sensitive financial data
class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  
  async encryptField(data: any, userId: string): Promise<EncryptedField> {
    const key = await this.getUserEncryptionKey(userId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.algorithm,
      version: 1
    };
  }
  
  async decryptField(encryptedField: EncryptedField, userId: string): Promise<any> {
    const key = await this.getUserEncryptionKey(userId);
    const decipher = crypto.createDecipher(
      encryptedField.algorithm, 
      key, 
      Buffer.from(encryptedField.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedField.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedField.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}

interface EncryptedField {
  data: string;
  iv: string;
  authTag: string;
  algorithm: string;
  version: number;
}
```

### Encryption Configuration

```javascript
// MongoDB Client-Side Field Level Encryption
const clientEncryption = new ClientEncryption(client, {
  keyVaultNamespace: 'wealthwise.dataKeys',
  kmsProviders: {
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    }
  }
});

// Schema for encrypted collections
const transactionSchema = {
  bsonType: 'object',
  properties: {
    'transactionInfo.amount': {
      encrypt: {
        keyId: '/dataKeyAlias',
        bsonType: 'double',
        algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
      }
    },
    'transactionInfo.originalAmount': {
      encrypt: {
        keyId: '/dataKeyAlias',
        bsonType: 'double',
        algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
      }
    }
  }
};
```

## 3.5 Data Validation and Business Rules

### Schema Validation

```javascript
// Users collection validation
db.runCommand({
  collMod: 'users',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['auth0Id', 'email', 'createdAt'],
      properties: {
        auth0Id: {
          bsonType: 'string',
          pattern: '^auth0\\|[a-zA-Z0-9]{24}$'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        'profile.firstName': {
          bsonType: 'string',
          minLength: 1,
          maxLength: 50
        },
        'riskProfile.level': {
          enum: ['conservative', 'moderate', 'aggressive']
        },
        'preferences.currency': {
          bsonType: 'string',
          pattern: '^[A-Z]{3}$'
        }
      }
    }
  },
  validationLevel: 'strict',
  validationAction: 'error'
});

// Transactions validation
db.runCommand({
  collMod: 'transactions',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'transactionInfo'],
      properties: {
        'transactionInfo.amount': {
          bsonType: 'double',
          minimum: -1000000,
          maximum: 1000000
        },
        'transactionInfo.type': {
          enum: ['income', 'expense', 'transfer', 'investment']
        },
        'transactionInfo.currency': {
          bsonType: 'string',
          pattern: '^[A-Z]{3}$'
        },
        'transactionInfo.date': {
          bsonType: 'date'
        }
      }
    }
  }
});
```

### Business Logic Constraints

```typescript
// Database middleware for business rules
class DatabaseMiddleware {
  // Prevent duplicate transactions
  static async preventDuplicateTransaction(transaction: TransactionDocument): Promise<void> {
    const existing = await db.collection('transactions').findOne({
      userId: transaction.userId,
      externalId: transaction.externalId,
      'transactionInfo.date': transaction.transactionInfo.date,
      'transactionInfo.amount': transaction.transactionInfo.amount
    });
    
    if (existing) {
      throw new Error('Duplicate transaction detected');
    }
  }
  
  // Validate investment position consistency
  static async validateInvestmentPosition(investment: InvestmentDocument): Promise<void> {
    if (investment.position.shares <= 0) {
      throw new Error('Investment shares must be positive');
    }
    
    if (investment.position.averageCost <= 0) {
      throw new Error('Average cost must be positive');
    }
    
    const calculatedTotal = investment.position.shares * investment.position.averageCost;
    const tolerance = 0.01; // Allow 1 cent tolerance for rounding
    
    if (Math.abs(calculatedTotal - investment.position.totalCost) > tolerance) {
      throw new Error('Position calculations are inconsistent');
    }
  }
  
  // Ensure portfolio snapshot consistency
  static async validatePortfolioSnapshot(snapshot: PortfolioSnapshotDocument): Promise<void> {
    const investments = await db.collection('investments').find({
      userId: snapshot.userId,
      isActive: true
    }).toArray();
    
    const calculatedValue = investments.reduce((sum, inv) => sum + inv.position.marketValue, 0);
    const tolerance = 1.00; // Allow $1 tolerance
    
    if (Math.abs(calculatedValue - snapshot.portfolio.totalValue) > tolerance) {
      throw new Error('Portfolio snapshot value inconsistent with investments');
    }
  }
}
```

## 3.6 Data Migration and Seeding

### Initial Data Setup

```typescript
// Database seeding script
class DatabaseSeeder {
  async seedMarketData(): Promise<void> {
    const popularStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
      { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ' },
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', exchange: 'NYSE' }
    ];
    
    await db.collection('marketData').insertMany(
      popularStocks.map(stock => ({
        ...stock,
        type: stock.symbol.includes('ETF') || ['SPY', 'QQQ', 'VTI'].includes(stock.symbol) ? 'etf' : 'stock',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    );
  }
  
  async seedCategories(): Promise<void> {
    const categories = [
      { name: 'Food & Dining', type: 'expense', icon: 'utensils' },
      { name: 'Transportation', type: 'expense', icon: 'car' },
      { name: 'Shopping', type: 'expense', icon: 'shopping-bag' },
      { name: 'Entertainment', type: 'expense', icon: 'play-circle' },
      { name: 'Bills & Utilities', type: 'expense', icon: 'file-text' },
      { name: 'Healthcare', type: 'expense', icon: 'heart' },
      { name: 'Education', type: 'expense', icon: 'book-open' },
      { name: 'Salary', type: 'income', icon: 'dollar-sign' },
      { name: 'Freelance', type: 'income', icon: 'briefcase' },
      { name: 'Dividends', type: 'income', icon: 'trending-up' },
      { name: 'Interest', type: 'income', icon: 'percent' }
    ];
    
    await db.collection('categories').insertMany(
      categories.map(cat => ({
        ...cat,
        isDefault: true,
        createdAt: new Date()
      }))
    );
  }
}
```

### Migration Scripts

```typescript
// Migration framework
class Migration {
  constructor(private version: string, private description: string) {}
  
  async up(): Promise<void> {
    throw new Error('up() method must be implemented');
  }
  
  async down(): Promise<void> {
    throw new Error('down() method must be implemented');
  }
}

// Example migration: Add encryption to existing data
class AddEncryptionMigration extends Migration {
  constructor() {
    super('001', 'Add encryption to sensitive fields');
  }
  
  async up(): Promise<void> {
    const users = await db.collection('users').find({}).toArray();
    
    for (const user of users) {
      // Encrypt sensitive transaction amounts
      const transactions = await db.collection('transactions').find({
        userId: user._id
      }).toArray();
      
      for (const transaction of transactions) {
        if (typeof transaction.transactionInfo.amount === 'number') {
          const encryptedAmount = await encryptionService.encryptField(
            transaction.transactionInfo.amount,
            user._id.toString()
          );
          
          await db.collection('transactions').updateOne(
            { _id: transaction._id },
            { 
              $set: { 
                'transactionInfo.amount': encryptedAmount,
                'metadata.migrationVersion': '001'
              }
            }
          );
        }
      }
    }
  }
  
  async down(): Promise<void> {
    // Revert encryption - decrypt all fields
    const transactions = await db.collection('transactions').find({
      'metadata.migrationVersion': '001'
    }).toArray();
    
    for (const transaction of transactions) {
      const decryptedAmount = await encryptionService.decryptField(
        transaction.transactionInfo.amount,
        transaction.userId.toString()
      );
      
      await db.collection('transactions').updateOne(
        { _id: transaction._id },
        { 
          $set: { 'transactionInfo.amount': decryptedAmount },
          $unset: { 'metadata.migrationVersion': 1 }
        }
      );
    }
  }
}
```

## 3.7 Performance Optimization

### Connection Pool Configuration

```typescript
// Optimized MongoDB connection
const mongoClient = new MongoClient(process.env.MONGODB_URI, {
  maxPoolSize: 20,              // Maximum connections in pool
  minPoolSize: 5,               // Minimum connections maintained
  maxIdleTimeMS: 30000,         // Close connections after 30s idle
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  heartbeatFrequencyMS: 10000,  // Heartbeat frequency
  retryWrites: true,            // Retry writes on failure
  writeConcern: {
    w: 'majority',              // Write concern for durability
    j: true                     // Journal writes
  },
  readPreference: 'primary',    // Read from primary by default
  readConcern: { level: 'majority' },
  compressors: ['zstd', 'zlib', 'snappy']
});
```

### Query Optimization Patterns

```typescript
class OptimizedQueries {
  // Efficient portfolio value calculation
  static async getPortfolioValue(userId: string): Promise<number> {
    const pipeline = [
      { $match: { userId: new ObjectId(userId), isActive: true } },
      { $project: {
        value: { $multiply: ['$position.shares', '$position.currentPrice'] }
      }},
      { $group: {
        _id: null,
        totalValue: { $sum: '$value' }
      }}
    ];
    
    const result = await db.collection('investments').aggregate(pipeline).toArray();
    return result[0]?.totalValue || 0;
  }
  
  // Efficient transaction summary by category
  static async getTransactionSummary(userId: string, startDate: Date, endDate: Date) {
    const pipeline = [
      { $match: {
        userId: new ObjectId(userId),
        'transactionInfo.date': { $gte: startDate, $lte: endDate }
      }},
      { $group: {
        _id: {
          category: '$transactionInfo.category',
          type: '$transactionInfo.type'
        },
        totalAmount: { $sum: '$transactionInfo.amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$transactionInfo.amount' }
      }},
      { $sort: { totalAmount: -1 } }
    ];
    
    return await db.collection('transactions').aggregate(pipeline).toArray();
  }
  
  // Efficient investment performance calculation
  static async getInvestmentPerformance(userId: string) {
    const pipeline = [
      { $match: { userId: new ObjectId(userId), isActive: true } },
      { $addFields: {
        currentValue: { $multiply: ['$position.shares', '$position.currentPrice'] },
        gainLoss: { $subtract: [
          { $multiply: ['$position.shares', '$position.currentPrice'] },
          '$position.totalCost'
        ]},
        gainLossPercent: {
          $cond: {
            if: { $gt: ['$position.totalCost', 0] },
            then: {
              $multiply: [
                { $divide: [
                  { $subtract: [
                    { $multiply: ['$position.shares', '$position.currentPrice'] },
                    '$position.totalCost'
                  ]},
                  '$position.totalCost'
                ]},
                100
              ]
            },
            else: 0
          }
        }
      }},
      { $sort: { currentValue: -1 } }
    ];
    
    return await db.collection('investments').aggregate(pipeline).toArray();
  }
}
```

## Next Steps

Part 4 will cover Authentication & Security implementation with Auth0:
- Auth0 integration and configuration
- JWT token management and validation
- Role-based access control (RBAC)
- API security middleware
- Session management and refresh tokens
- Security monitoring and audit logging
