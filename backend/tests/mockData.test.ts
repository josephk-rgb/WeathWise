import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/index';
import { User } from '../src/models/User';
import { Account } from '../src/models/Account';
import { Transaction } from '../src/models/Transaction';

describe('Mock Data API', () => {
  let authToken: string;
  let adminUserId: string;
  let regularUserId: string;

  beforeAll(async () => {
    // Wait for database connection to be ready
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wealthwise');
    }
    
    // Wait for connection to be fully established
    while (mongoose.connection.readyState !== 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Ensure connection is ready before cleaning
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not ready for testing');
    }
    
    // Clean up only test data (users with test auth0 IDs)
    await Promise.all([
      User.deleteMany({ auth0Id: { $regex: /^test_|^auth0\|.*test/ } }),
      Account.deleteMany({ userId: { $in: await User.find({ auth0Id: { $regex: /^test_|^auth0\|.*test/ } }).distinct('_id') } }),
      Transaction.deleteMany({ userId: { $in: await User.find({ auth0Id: { $regex: /^test_|^auth0\|.*test/ } }).distinct('_id') } })
    ]);

    // Create test users
    const adminUser = await User.create({
      auth0Id: 'auth0|admin123',
      email: 'admin@test.com',
      role: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User'
      },
      preferences: {
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sms: false,
          trading: true,
          news: true
        }
      },
      riskProfile: {
        level: 'moderate',
        questionnaire: {
          age: 35,
          experience: 'intermediate',
          timeline: 'long_term',
          riskTolerance: 7,
          completedAt: new Date()
        }
      },
      subscription: {
        plan: 'premium',
        startDate: new Date()
      },
      encryption: {
        keyId: 'test-key',
        algorithm: 'AES-256',
        version: 1
      },
      metadata: {
        lastLogin: new Date(),
        loginCount: 1,
        onboardingCompleted: true
      }
    });

    const regularUser = await User.create({
      auth0Id: 'auth0|user123',
      email: 'user@test.com',
      role: 'user',
      profile: {
        firstName: 'Regular',
        lastName: 'User'
      },
      preferences: {
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sms: false,
          trading: true,
          news: true
        }
      },
      riskProfile: {
        level: 'conservative',
        questionnaire: {
          age: 25,
          experience: 'beginner',
          timeline: 'short_term',
          riskTolerance: 4,
          completedAt: new Date()
        }
      },
      subscription: {
        plan: 'free',
        startDate: new Date()
      },
      encryption: {
        keyId: 'test-key',
        algorithm: 'AES-256',
        version: 1
      },
      metadata: {
        lastLogin: new Date(),
        loginCount: 1,
        onboardingCompleted: true
      }
    });

    adminUserId = (adminUser._id as any).toString();
    regularUserId = (regularUser._id as any).toString();

    // Mock JWT token for admin user
    authToken = 'mock-jwt-token'; // In real tests, generate proper JWT
  });

  describe('POST /api/mock-data/generate', () => {
    it('should generate mock data for admin user', async () => {
      const response = await request(app)
        .post('/api/mock-data/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          monthsOfHistory: 6,
          numberOfAccounts: 3,
          accountTypes: ['checking', 'savings', 'credit'],
          includeInvestments: false,
          includeBudgetsAndGoals: true,
          includeDebts: false,
          transactionsPerMonth: 50
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toHaveProperty('accounts');
      expect(response.body.summary).toHaveProperty('transactions');
      expect(response.body.summary.accounts).toBeGreaterThan(0);
      expect(response.body.summary.transactions).toBeGreaterThan(0);
    });

    it('should reject non-admin users', async () => {
      // Mock token for regular user
      const regularToken = 'mock-regular-jwt-token';

      const response = await request(app)
        .post('/api/mock-data/generate')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin role required');
    });

    it('should validate input parameters', async () => {
      const response = await request(app)
        .post('/api/mock-data/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          monthsOfHistory: 50, // Invalid: too high
          numberOfAccounts: -1, // Invalid: negative
          accountTypes: ['invalid-type'] // Invalid: not in enum
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/mock-data/summary', () => {
    it('should return data summary for admin user', async () => {
      const response = await request(app)
        .get('/api/mock-data/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toHaveProperty('accounts');
      expect(response.body.summary).toHaveProperty('transactions');
      expect(response.body.summary).toHaveProperty('hasData');
    });
  });

  describe('DELETE /api/mock-data/clear', () => {
    it('should clear all mock data for admin user', async () => {
      // First create some data
      await Account.create({
        userId: adminUserId,
        type: 'checking',
        provider: { name: 'Test Bank' },
        accountInfo: {
          name: 'Test Account',
          accountNumber: '12345',
          balance: 1000,
          currency: 'USD'
        },
        connectionStatus: {
          isConnected: true,
          provider: 'manual'
        }
      });

      const response = await request(app)
        .delete('/api/mock-data/clear')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify data was cleared
      const accountCount = await Account.countDocuments({ userId: adminUserId });
      expect(accountCount).toBe(0);
    });
  });

  describe('GET /api/mock-data/config', () => {
    it('should return default configuration options', async () => {
      const response = await request(app)
        .get('/api/mock-data/config')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.defaultConfig).toHaveProperty('monthsOfHistory');
      expect(response.body.defaultConfig).toHaveProperty('numberOfAccounts');
      expect(response.body.options).toHaveProperty('accountTypes');
      expect(response.body.options.accountTypes).toContain('checking');
    });
  });
});
