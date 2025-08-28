# Part 11: Deployment & Infrastructure

## 11.1 Vercel Deployment Configuration

### Project Setup and Configuration

```json
// vercel.json
{
  "version": 2,
  "name": "wealthwise",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node",
      "config": {
        "maxLambdaSize": "50mb",
        "runtime": "nodejs18.x"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    },
    "api/chat/stream.js": {
      "maxDuration": 60
    },
    "api/data/historical.js": {
      "maxDuration": 45
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://wealthwise.vercel.app"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Authorization, Content-Type"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.auth0.com https://query1.finance.yahoo.com https://www.alphavantage.co wss://ws.finnhub.io"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/health",
      "destination": "/api/health"
    },
    {
      "source": "/ws",
      "destination": "/api/websocket"
    }
  ],
  "redirects": [
    {
      "source": "/dashboard",
      "destination": "/",
      "permanent": false
    }
  ]
}
```

### Environment Configuration

```bash
# .env.production
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wealthwise-prod?retryWrites=true&w=majority
DATABASE_NAME=wealthwise-prod

# Authentication
AUTH0_DOMAIN=wealthwise-prod.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_AUDIENCE=https://api.wealthwise.app
JWT_SECRET=your_super_secure_jwt_secret_256_bits_long

# API Keys
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FINNHUB_API_KEY=your_finnhub_key
NEWS_API_KEY=your_news_api_key
FRED_API_KEY=your_fred_api_key

# AI/ML Services
OLLAMA_HOST=https://ollama.wealthwise.app
OPENAI_API_KEY=your_openai_key_fallback

# External Services
REDIS_URL=redis://username:password@redis-host:6379
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project

# App Configuration
APP_URL=https://wealthwise.vercel.app
API_URL=https://wealthwise.vercel.app/api
WS_URL=wss://wealthwise.vercel.app/ws

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_AI_CHAT=true
ENABLE_REAL_TIME_UPDATES=true
ENABLE_PUSH_NOTIFICATIONS=true

# Monitoring
DATADOG_API_KEY=your_datadog_api_key
NEW_RELIC_LICENSE_KEY=your_newrelic_license_key
```

### Build Configuration

```typescript
// vite.config.ts (Production)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts', 'd3'],
          ui: ['@headlessui/react', 'lucide-react'],
          utils: ['date-fns', 'lodash-es'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts'],
  },
});
```

## 11.2 Database Migration & Management

### MongoDB Atlas Configuration

```typescript
// scripts/deploy/setupDatabase.ts
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { join } from 'path';

interface MigrationScript {
  version: string;
  description: string;
  up: (db: any) => Promise<void>;
  down: (db: any) => Promise<void>;
}

class DatabaseMigration {
  private client: MongoClient;
  private db: any;

  constructor(private connectionString: string, private dbName: string) {
    this.client = new MongoClient(connectionString);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    console.log(`Connected to database: ${this.dbName}`);
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    console.log('Disconnected from database');
  }

  async initializeDatabase(): Promise<void> {
    console.log('Initializing database...');

    // Create collections with validation schemas
    await this.createUsersCollection();
    await this.createPortfoliosCollection();
    await this.createInvestmentsCollection();
    await this.createChatSessionsCollection();
    await this.createMarketDataCollection();
    await this.createAlertsCollection();
    await this.createAuditLogsCollection();

    // Create indexes
    await this.createIndexes();

    console.log('Database initialization complete');
  }

  private async createUsersCollection(): Promise<void> {
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['auth0Id', 'email', 'profile', 'createdAt'],
        properties: {
          auth0Id: { bsonType: 'string' },
          email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
          profile: {
            bsonType: 'object',
            required: ['firstName', 'lastName'],
            properties: {
              firstName: { bsonType: 'string', minLength: 1, maxLength: 50 },
              lastName: { bsonType: 'string', minLength: 1, maxLength: 50 },
              dateOfBirth: { bsonType: 'date' },
              phoneNumber: { bsonType: 'string' },
              address: {
                bsonType: 'object',
                properties: {
                  street: { bsonType: 'string' },
                  city: { bsonType: 'string' },
                  state: { bsonType: 'string' },
                  zipCode: { bsonType: 'string' },
                  country: { bsonType: 'string' }
                }
              }
            }
          },
          preferences: {
            bsonType: 'object',
            properties: {
              currency: { bsonType: 'string', enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD'] },
              timezone: { bsonType: 'string' },
              notifications: {
                bsonType: 'object',
                properties: {
                  email: { bsonType: 'bool' },
                  push: { bsonType: 'bool' },
                  sms: { bsonType: 'bool' }
                }
              }
            }
          },
          riskProfile: {
            bsonType: 'object',
            properties: {
              tolerance: { bsonType: 'string', enum: ['conservative', 'moderate', 'aggressive'] },
              horizon: { bsonType: 'string', enum: ['short', 'medium', 'long'] },
              experience: { bsonType: 'string', enum: ['beginner', 'intermediate', 'advanced'] }
            }
          },
          subscription: {
            bsonType: 'object',
            properties: {
              plan: { bsonType: 'string', enum: ['free', 'basic', 'premium', 'enterprise'] },
              status: { bsonType: 'string', enum: ['active', 'cancelled', 'expired'] },
              expiresAt: { bsonType: 'date' }
            }
          },
          isActive: { bsonType: 'bool' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    };

    await this.db.createCollection('users', { validator });
  }

  private async createPortfoliosCollection(): Promise<void> {
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'name', 'createdAt'],
        properties: {
          userId: { bsonType: 'objectId' },
          name: { bsonType: 'string', minLength: 1, maxLength: 100 },
          description: { bsonType: 'string', maxLength: 500 },
          type: { bsonType: 'string', enum: ['personal', 'retirement', 'taxable', 'education'] },
          totalValue: { bsonType: 'number', minimum: 0 },
          totalCost: { bsonType: 'number', minimum: 0 },
          totalGainLoss: { bsonType: 'number' },
          totalGainLossPercent: { bsonType: 'number' },
          dayChange: { bsonType: 'number' },
          dayChangePercent: { bsonType: 'number' },
          isDefault: { bsonType: 'bool' },
          isActive: { bsonType: 'bool' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    };

    await this.db.createCollection('portfolios', { validator });
  }

  private async createInvestmentsCollection(): Promise<void> {
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['portfolioId', 'symbol', 'shares', 'purchasePrice', 'purchaseDate'],
        properties: {
          portfolioId: { bsonType: 'objectId' },
          symbol: { bsonType: 'string', minLength: 1, maxLength: 10 },
          name: { bsonType: 'string' },
          type: { bsonType: 'string', enum: ['stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'option'] },
          shares: { bsonType: 'number', minimum: 0 },
          purchasePrice: { bsonType: 'number', minimum: 0 },
          currentPrice: { bsonType: 'number', minimum: 0 },
          purchaseDate: { bsonType: 'date' },
          marketValue: { bsonType: 'number', minimum: 0 },
          gainLoss: { bsonType: 'number' },
          gainLossPercent: { bsonType: 'number' },
          dividends: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              properties: {
                amount: { bsonType: 'number', minimum: 0 },
                date: { bsonType: 'date' },
                type: { bsonType: 'string', enum: ['dividend', 'capital_gain'] }
              }
            }
          },
          isActive: { bsonType: 'bool' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    };

    await this.db.createCollection('investments', { validator });
  }

  private async createChatSessionsCollection(): Promise<void> {
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'title', 'createdAt'],
        properties: {
          userId: { bsonType: 'objectId' },
          title: { bsonType: 'string', minLength: 1, maxLength: 200 },
          context: {
            bsonType: 'object',
            properties: {
              portfolioId: { bsonType: 'objectId' },
              type: { bsonType: 'string', enum: ['general', 'portfolio', 'investment', 'planning'] }
            }
          },
          messageCount: { bsonType: 'int', minimum: 0 },
          lastActivity: { bsonType: 'date' },
          isActive: { bsonType: 'bool' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    };

    await this.db.createCollection('chat_sessions', { validator });
  }

  private async createMarketDataCollection(): Promise<void> {
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['symbol', 'price', 'timestamp', 'source'],
        properties: {
          symbol: { bsonType: 'string', minLength: 1, maxLength: 10 },
          price: { bsonType: 'number', minimum: 0 },
          previousClose: { bsonType: 'number', minimum: 0 },
          change: { bsonType: 'number' },
          changePercent: { bsonType: 'number' },
          volume: { bsonType: 'number', minimum: 0 },
          high: { bsonType: 'number', minimum: 0 },
          low: { bsonType: 'number', minimum: 0 },
          open: { bsonType: 'number', minimum: 0 },
          marketCap: { bsonType: 'number', minimum: 0 },
          timestamp: { bsonType: 'date' },
          source: { bsonType: 'string' },
          createdAt: { bsonType: 'date' }
        }
      }
    };

    await this.db.createCollection('market_data', { validator });
  }

  private async createAlertsCollection(): Promise<void> {
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'type', 'conditions', 'createdAt'],
        properties: {
          userId: { bsonType: 'objectId' },
          type: { bsonType: 'string', enum: ['price', 'portfolio_value', 'portfolio_change', 'news', 'economic'] },
          title: { bsonType: 'string', minLength: 1, maxLength: 200 },
          description: { bsonType: 'string', maxLength: 500 },
          conditions: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              properties: {
                field: { bsonType: 'string' },
                operator: { bsonType: 'string', enum: ['gt', 'lt', 'eq', 'gte', 'lte'] },
                value: { bsonType: 'number' },
                symbol: { bsonType: 'string' }
              }
            }
          },
          isActive: { bsonType: 'bool' },
          lastTriggered: { bsonType: 'date' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    };

    await this.db.createCollection('alerts', { validator });
  }

  private async createAuditLogsCollection(): Promise<void> {
    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'action', 'resource', 'timestamp'],
        properties: {
          userId: { bsonType: 'objectId' },
          action: { bsonType: 'string' },
          resource: { bsonType: 'string' },
          resourceId: { bsonType: 'string' },
          details: { bsonType: 'object' },
          ipAddress: { bsonType: 'string' },
          userAgent: { bsonType: 'string' },
          timestamp: { bsonType: 'date' }
        }
      }
    };

    await this.db.createCollection('audit_logs', { validator });
  }

  private async createIndexes(): Promise<void> {
    console.log('Creating database indexes...');

    // Users indexes
    await this.db.collection('users').createIndex({ auth0Id: 1 }, { unique: true });
    await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
    await this.db.collection('users').createIndex({ 'profile.lastName': 1, 'profile.firstName': 1 });

    // Portfolios indexes
    await this.db.collection('portfolios').createIndex({ userId: 1 });
    await this.db.collection('portfolios').createIndex({ userId: 1, isDefault: 1 });

    // Investments indexes
    await this.db.collection('investments').createIndex({ portfolioId: 1 });
    await this.db.collection('investments').createIndex({ symbol: 1 });
    await this.db.collection('investments').createIndex({ portfolioId: 1, symbol: 1 });

    // Chat sessions indexes
    await this.db.collection('chat_sessions').createIndex({ userId: 1 });
    await this.db.collection('chat_sessions').createIndex({ userId: 1, lastActivity: -1 });

    // Market data indexes
    await this.db.collection('market_data').createIndex({ symbol: 1, timestamp: -1 });
    await this.db.collection('market_data').createIndex({ timestamp: -1 });
    await this.db.collection('market_data').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 86400 * 7 } // TTL: 7 days
    );

    // Alerts indexes
    await this.db.collection('alerts').createIndex({ userId: 1 });
    await this.db.collection('alerts').createIndex({ userId: 1, isActive: 1 });

    // Audit logs indexes
    await this.db.collection('audit_logs').createIndex({ userId: 1, timestamp: -1 });
    await this.db.collection('audit_logs').createIndex({ timestamp: -1 });
    await this.db.collection('audit_logs').createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 86400 * 90 } // TTL: 90 days
    );

    console.log('Database indexes created successfully');
  }

  async runMigrations(): Promise<void> {
    const migrations: MigrationScript[] = [
      {
        version: '1.0.0',
        description: 'Initial database setup',
        up: async (db) => {
          await this.initializeDatabase();
        },
        down: async (db) => {
          // Drop all collections
          const collections = await db.listCollections().toArray();
          for (const collection of collections) {
            await db.dropCollection(collection.name);
          }
        }
      },
      {
        version: '1.1.0',
        description: 'Add encryption fields to sensitive collections',
        up: async (db) => {
          // Add encryption metadata fields
          await db.collection('users').updateMany(
            {},
            { $set: { encryptionVersion: '1.0', encryptedFields: [] } }
          );
        },
        down: async (db) => {
          await db.collection('users').updateMany(
            {},
            { $unset: { encryptionVersion: '', encryptedFields: '' } }
          );
        }
      }
    ];

    // Check if migrations collection exists
    const migrationExists = await this.db.collection('migrations').findOne({});
    if (!migrationExists) {
      await this.db.createCollection('migrations');
    }

    for (const migration of migrations) {
      const existingMigration = await this.db.collection('migrations').findOne({
        version: migration.version
      });

      if (!existingMigration) {
        console.log(`Running migration ${migration.version}: ${migration.description}`);
        
        try {
          await migration.up(this.db);
          
          await this.db.collection('migrations').insertOne({
            version: migration.version,
            description: migration.description,
            appliedAt: new Date()
          });
          
          console.log(`Migration ${migration.version} completed successfully`);
        } catch (error) {
          console.error(`Migration ${migration.version} failed:`, error);
          throw error;
        }
      } else {
        console.log(`Migration ${migration.version} already applied, skipping`);
      }
    }
  }
}

// CLI script for database setup
async function main() {
  const connectionString = process.env.MONGODB_URI!;
  const dbName = process.env.DATABASE_NAME!;

  if (!connectionString || !dbName) {
    console.error('MONGODB_URI and DATABASE_NAME environment variables are required');
    process.exit(1);
  }

  const migration = new DatabaseMigration(connectionString, dbName);
  
  try {
    await migration.connect();
    await migration.runMigrations();
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    await migration.disconnect();
  }
}

if (require.main === module) {
  main();
}

export { DatabaseMigration };
```

## 11.3 Infrastructure Monitoring & Logging

### Application Monitoring Setup

```typescript
// src/services/monitoringService.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export class MonitoringService {
  static initialize(): void {
    if (process.env.NODE_ENV === 'production') {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
          new ProfilingIntegration(),
        ],
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.1,
        environment: process.env.NODE_ENV,
        beforeSend(event) {
          // Filter out sensitive information
          if (event.request?.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
          return event;
        },
      });
    }
  }

  static captureException(error: Error, context?: any): void {
    console.error('Error captured:', error);
    
    if (process.env.NODE_ENV === 'production') {
      Sentry.withScope((scope) => {
        if (context) {
          scope.setContext('error_context', context);
        }
        Sentry.captureException(error);
      });
    }
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    console.log(`[${level.toUpperCase()}] ${message}`);
    
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(message, level);
    }
  }

  static setUser(user: { id: string; email: string }): void {
    if (process.env.NODE_ENV === 'production') {
      Sentry.setUser({
        id: user.id,
        email: user.email,
      });
    }
  }

  static addBreadcrumb(message: string, category: string, data?: any): void {
    if (process.env.NODE_ENV === 'production') {
      Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
      });
    }
  }
}
```

### Performance Monitoring

```typescript
// src/utils/performanceMonitor.ts
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static startTimer(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration);
    };
  }

  static recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const measurements = this.metrics.get(operation)!;
    measurements.push(duration);
    
    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }

    // Log slow operations
    if (duration > 1000) { // > 1 second
      console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
      
      MonitoringService.captureMessage(
        `Slow operation: ${operation} (${duration.toFixed(2)}ms)`,
        'warning'
      );
    }
  }

  static getMetrics(operation: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const measurements = this.metrics.get(operation);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((acc, val) => acc + val, 0);
    
    return {
      count: measurements.length,
      average: sum / measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }

  static getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const operation of this.metrics.keys()) {
      result[operation] = this.getMetrics(operation);
    }
    
    return result;
  }

  // React hook for performance monitoring
  static usePerformanceTimer(operation: string) {
    React.useEffect(() => {
      const endTimer = PerformanceMonitor.startTimer(operation);
      return endTimer;
    }, [operation]);
  }
}

// Higher-order component for route performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  routeName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    PerformanceMonitor.usePerformanceTimer(`route:${routeName}`);
    return <Component {...props} />;
  };
}
```

### Health Check API

```typescript
// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';
import { MonitoringService } from '../src/services/monitoringService';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
    externalAPIs: {
      status: 'up' | 'down';
      services: Record<string, { status: 'up' | 'down'; responseTime?: number }>;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  
  try {
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: { status: 'up' },
        externalAPIs: { status: 'up', services: {} },
        memory: { used: 0, total: 0, percentage: 0 }
      }
    };

    // Check database connection
    try {
      const dbCheckStart = Date.now();
      const client = new MongoClient(process.env.MONGODB_URI!);
      await client.connect();
      await client.db().admin().ping();
      await client.close();
      
      result.checks.database = {
        status: 'up',
        responseTime: Date.now() - dbCheckStart
      };
    } catch (error) {
      result.checks.database = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      result.status = 'unhealthy';
    }

    // Check external APIs
    const externalChecks = await Promise.allSettled([
      checkAlphaVantage(),
      checkAuth0(),
      checkRedis(),
    ]);

    result.checks.externalAPIs.services = {
      alphaVantage: getCheckResult(externalChecks[0]),
      auth0: getCheckResult(externalChecks[1]),
      redis: getCheckResult(externalChecks[2]),
    };

    const hasFailedService = Object.values(result.checks.externalAPIs.services)
      .some(service => service.status === 'down');
    
    result.checks.externalAPIs.status = hasFailedService ? 'down' : 'up';

    // Memory usage
    const memUsage = process.memoryUsage();
    result.checks.memory = {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
    };

    // Overall status
    if (result.checks.database.status === 'down' || hasFailedService) {
      result.status = 'unhealthy';
    }

    const responseTime = Date.now() - startTime;
    
    // Log health check metrics
    MonitoringService.addBreadcrumb('Health check completed', 'health', {
      status: result.status,
      responseTime,
      databaseStatus: result.checks.database.status
    });

    const statusCode = result.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(result);

  } catch (error) {
    MonitoringService.captureException(error as Error, { context: 'health_check' });
    
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      responseTime: Date.now() - startTime
    });
  }
}

async function checkAlphaVantage(): Promise<{ status: 'up' | 'down'; responseTime: number }> {
  const start = Date.now();
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (response.ok) {
      return { status: 'up', responseTime: Date.now() - start };
    } else {
      return { status: 'down', responseTime: Date.now() - start };
    }
  } catch (error) {
    return { status: 'down', responseTime: Date.now() - start };
  }
}

async function checkAuth0(): Promise<{ status: 'up' | 'down'; responseTime: number }> {
  const start = Date.now();
  try {
    const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`, {
      signal: AbortSignal.timeout(5000)
    });
    
    return {
      status: response.ok ? 'up' : 'down',
      responseTime: Date.now() - start
    };
  } catch (error) {
    return { status: 'down', responseTime: Date.now() - start };
  }
}

async function checkRedis(): Promise<{ status: 'up' | 'down'; responseTime: number }> {
  const start = Date.now();
  try {
    // Redis check would go here if using Redis
    // For now, we'll simulate a successful check
    return { status: 'up', responseTime: Date.now() - start };
  } catch (error) {
    return { status: 'down', responseTime: Date.now() - start };
  }
}

function getCheckResult(result: PromiseSettledResult<any>): { status: 'up' | 'down'; responseTime?: number } {
  if (result.status === 'fulfilled') {
    return result.value;
  } else {
    return { status: 'down' };
  }
}
```

## 11.4 Security & SSL Configuration

### Security Headers and HTTPS Setup

```typescript
// api/_middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { MonitoringService } from '../src/services/monitoringService';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://auth0.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.auth0.com https://query1.finance.yahoo.com https://www.alphavantage.co wss://ws.finnhub.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.APP_URL || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  // Rate limiting headers
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', '99');
  response.headers.set('X-RateLimit-Reset', (Date.now() + 3600000).toString());

  // Request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-ID', requestId);

  // Log request for monitoring
  MonitoringService.addBreadcrumb('Request processed', 'http', {
    method: request.method,
    url: request.url,
    requestId,
    userAgent: request.headers.get('user-agent'),
  });

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### SSL Certificate Management

```bash
#!/bin/bash
# scripts/deploy/setup-ssl.sh

set -e

echo "Setting up SSL certificates and security..."

# Vercel automatically handles SSL certificates for custom domains
# This script documents the manual steps if needed

# 1. Add custom domain in Vercel dashboard
echo "1. Add custom domain in Vercel dashboard:"
echo "   - Go to Project Settings > Domains"
echo "   - Add your domain (e.g., wealthwise.com)"
echo "   - Vercel will automatically provision SSL certificate"

# 2. Configure DNS records
echo "2. Configure DNS records:"
echo "   A record: @ -> 76.76.19.61"
echo "   CNAME record: www -> cname.vercel-dns.com"

# 3. Security.txt file
cat > public/.well-known/security.txt << EOF
Contact: security@wealthwise.com
Expires: 2025-12-31T23:59:59.000Z
Encryption: https://wealthwise.com/pgp-key.txt
Acknowledgments: https://wealthwise.com/security/hall-of-fame
Policy: https://wealthwise.com/security/policy
Hiring: https://wealthwise.com/careers
EOF

# 4. Robots.txt
cat > public/robots.txt << EOF
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /.env

Sitemap: https://wealthwise.com/sitemap.xml
EOF

# 5. Generate sitemap
cat > public/sitemap.xml << EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://wealthwise.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://wealthwise.com/portfolio</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://wealthwise.com/chat</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://wealthwise.com/settings</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
EOF

echo "SSL and security setup completed!"
echo "Remember to:"
echo "- Update DNS records to point to Vercel"
echo "- Enable HSTS in production"
echo "- Test SSL configuration with SSL Labs"
```

## 11.5 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6.0
        env:
          MONGO_INITDB_ROOT_USERNAME: root
          MONGO_INITDB_ROOT_PASSWORD: password
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit
        env:
          MONGODB_URI: mongodb://root:password@localhost:27017/test?authSource=admin

      - name: Run integration tests
        run: npm run test:integration
        env:
          MONGODB_URI: mongodb://root:password@localhost:27017/test?authSource=admin
          NODE_ENV: test

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Start application for E2E tests
        run: npm start &
        env:
          NODE_ENV: test
          PORT: 3000

      - name: Wait for application
        run: npx wait-on http://localhost:3000

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  deploy-preview:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.event_name == 'pull_request'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Project Artifacts to Vercel
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "preview_url=$url" >> $GITHUB_OUTPUT

      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview deployment ready!\n\n[Visit Preview](${{ steps.deploy.outputs.preview_url }})`
            })

  deploy-production:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    
    environment: production
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Run database migrations
        run: |
          npm run db:migrate
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI_PROD }}
          DATABASE_NAME: ${{ secrets.DATABASE_NAME_PROD }}

      - name: Warm up application
        run: |
          curl -f https://wealthwise.com/api/health || exit 1
          curl -f https://wealthwise.com/ || exit 1

      - name: Notify Slack on success
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: '🚀 Production deployment successful!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Notify Slack on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: '❌ Production deployment failed!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  lighthouse:
    runs-on: ubuntu-latest
    needs: deploy-production
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://wealthwise.com/
            https://wealthwise.com/portfolio
          configPath: './lighthouserc.json'
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### Deployment Scripts

```typescript
// scripts/deploy/deploy.ts
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

interface DeploymentConfig {
  environment: 'preview' | 'production';
  branch: string;
  commit: string;
  buildId: string;
}

class DeploymentManager {
  private config: DeploymentConfig;

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  async deploy(): Promise<void> {
    console.log(`🚀 Starting deployment to ${this.config.environment}...`);
    
    try {
      await this.preDeploymentChecks();
      await this.buildApplication();
      await this.runTests();
      await this.deployToVercel();
      await this.postDeploymentTasks();
      await this.verifyDeployment();
      
      console.log('✅ Deployment completed successfully!');
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      await this.rollbackIfNeeded();
      throw error;
    }
  }

  private async preDeploymentChecks(): Promise<void> {
    console.log('🔍 Running pre-deployment checks...');
    
    // Check environment variables
    const requiredEnvVars = [
      'MONGODB_URI',
      'AUTH0_DOMAIN',
      'AUTH0_CLIENT_ID',
      'AUTH0_CLIENT_SECRET',
      'VERCEL_TOKEN'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Check if working directory is clean
    try {
      execSync('git diff-index --quiet HEAD --', { stdio: 'pipe' });
    } catch (error) {
      console.warn('⚠️ Working directory has uncommitted changes');
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const requiredVersion = '18.0.0';
    if (nodeVersion < `v${requiredVersion}`) {
      throw new Error(`Node.js version ${requiredVersion} or higher is required`);
    }

    console.log('✅ Pre-deployment checks passed');
  }

  private async buildApplication(): Promise<void> {
    console.log('🏗️ Building application...');
    
    try {
      execSync('npm ci', { stdio: 'inherit' });
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ Build completed successfully');
    } catch (error) {
      throw new Error('Build failed');
    }
  }

  private async runTests(): Promise<void> {
    console.log('🧪 Running tests...');
    
    try {
      execSync('npm run test:unit', { stdio: 'inherit' });
      execSync('npm run lint', { stdio: 'inherit' });
      execSync('npm run type-check', { stdio: 'inherit' });
      console.log('✅ All tests passed');
    } catch (error) {
      throw new Error('Tests failed');
    }
  }

  private async deployToVercel(): Promise<void> {
    console.log('🚀 Deploying to Vercel...');
    
    const isProduction = this.config.environment === 'production';
    const deployCommand = isProduction 
      ? 'vercel deploy --prod --token=$VERCEL_TOKEN'
      : 'vercel deploy --token=$VERCEL_TOKEN';

    try {
      const output = execSync(deployCommand, { encoding: 'utf8' });
      const deployUrl = output.trim();
      
      console.log(`✅ Deployed to: ${deployUrl}`);
      
      // Save deployment info
      const deploymentInfo = {
        url: deployUrl,
        environment: this.config.environment,
        branch: this.config.branch,
        commit: this.config.commit,
        buildId: this.config.buildId,
        deployedAt: new Date().toISOString()
      };
      
      writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));
    } catch (error) {
      throw new Error('Vercel deployment failed');
    }
  }

  private async postDeploymentTasks(): Promise<void> {
    console.log('🔧 Running post-deployment tasks...');
    
    if (this.config.environment === 'production') {
      // Run database migrations
      try {
        execSync('npm run db:migrate', { stdio: 'inherit' });
        console.log('✅ Database migrations completed');
      } catch (error) {
        console.warn('⚠️ Database migrations failed:', error);
      }

      // Clear caches
      try {
        execSync('npm run cache:clear', { stdio: 'inherit' });
        console.log('✅ Caches cleared');
      } catch (error) {
        console.warn('⚠️ Cache clearing failed:', error);
      }

      // Send notification
      await this.sendDeploymentNotification();
    }
  }

  private async verifyDeployment(): Promise<void> {
    console.log('🔍 Verifying deployment...');
    
    const deploymentInfo = JSON.parse(readFileSync('deployment.json', 'utf8'));
    const healthCheckUrl = `${deploymentInfo.url}/api/health`;
    
    // Wait for deployment to be ready
    await this.waitForDeployment(healthCheckUrl);
    
    // Run health checks
    const response = await fetch(healthCheckUrl);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const health = await response.json();
    if (health.status !== 'healthy') {
      throw new Error('Application is not healthy after deployment');
    }
    
    console.log('✅ Deployment verification passed');
  }

  private async waitForDeployment(url: string, maxAttempts: number = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      
      console.log(`⏳ Waiting for deployment to be ready... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }
    
    throw new Error('Deployment did not become ready within expected time');
  }

  private async sendDeploymentNotification(): Promise<void> {
    if (process.env.SLACK_WEBHOOK_URL) {
      const message = {
        text: `🚀 WealthWise deployed to ${this.config.environment}`,
        attachments: [
          {
            color: 'good',
            fields: [
              { title: 'Environment', value: this.config.environment, short: true },
              { title: 'Branch', value: this.config.branch, short: true },
              { title: 'Commit', value: this.config.commit.substring(0, 8), short: true },
              { title: 'Build ID', value: this.config.buildId, short: true }
            ]
          }
        ]
      };

      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
      } catch (error) {
        console.warn('Failed to send Slack notification:', error);
      }
    }
  }

  private async rollbackIfNeeded(): Promise<void> {
    if (this.config.environment === 'production') {
      console.log('🔙 Initiating rollback...');
      
      try {
        // Get previous deployment
        const output = execSync('vercel ls --token=$VERCEL_TOKEN', { encoding: 'utf8' });
        const deployments = output.split('\n').filter(line => line.includes('READY'));
        
        if (deployments.length > 1) {
          const previousDeployment = deployments[1].split(' ')[0];
          execSync(`vercel alias ${previousDeployment} wealthwise.com --token=$VERCEL_TOKEN`);
          console.log('✅ Rollback completed');
        }
      } catch (error) {
        console.error('❌ Rollback failed:', error);
      }
    }
  }
}

// CLI execution
async function main() {
  const config: DeploymentConfig = {
    environment: (process.argv[2] as 'preview' | 'production') || 'preview',
    branch: process.env.GITHUB_REF_NAME || 'main',
    commit: process.env.GITHUB_SHA || execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
    buildId: process.env.GITHUB_RUN_ID || Date.now().toString()
  };

  const deployment = new DeploymentManager(config);
  await deployment.deploy();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
}
```

## Next Steps

Part 12 (Final) will cover Monitoring & Maintenance:
- Application performance monitoring with New Relic/DataDog
- Error tracking and alerting systems
- Log aggregation and analysis
- Database backup and recovery procedures
- Security monitoring and incident response
- Maintenance schedules and update procedures
- User analytics and business metrics tracking
