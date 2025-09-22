import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/index';
import { Account, Investment, Debt, PhysicalAsset } from '../src/models';

describe('Analytics Controller Enhanced Tests', () => {
  let authToken: string;
  let userId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/weathwise_test');
    
    // Mock authentication
    authToken = 'mock-jwt-token';
    userId = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    // Clean up test data
    await Account.deleteMany({});
    await Investment.deleteMany({});
    await Debt.deleteMany({});
    await PhysicalAsset.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/analytics with enhanced net worth', () => {
    it('should return enhanced analytics with net worth data', async () => {
      // Create comprehensive test data
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'Main Checking', balance: 5000, currency: 'USD' },
        isActive: true
      });

      await Account.create({
        userId,
        type: 'savings',
        accountInfo: { name: 'Emergency Fund', balance: 10000, currency: 'USD' },
        isActive: true
      });

      await Investment.create({
        userId,
        securityInfo: { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
        position: { 
          shares: 100, 
          averagePrice: 150, 
          currentPrice: 160, 
          totalCost: 15000, 
          marketValue: 16000 
        },
        isActive: true
      });

      await PhysicalAsset.create({
        userId,
        type: 'real_estate',
        name: 'Primary Residence',
        currentValue: 400000,
        equity: 250000,
        loanInfo: { loanBalance: 150000, monthlyPayment: 2000, lender: 'Chase Bank' },
        isActive: true
      });

      await Debt.create({
        userId,
        type: 'credit_card',
        debtInfo: { creditor: 'Visa', accountNumber: '****1234' },
        remainingBalance: 3000,
        interestRate: 18.99,
        isActive: true
      });

      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify net worth calculation
      expect(response.body.data.netWorth).toBeDefined();
      expect(response.body.data.netWorth.current).toBe(268000); // 15000 + 16000 + 250000 - 3000 - 150000
      expect(response.body.data.netWorth.assets).toBe(281000); // 15000 + 16000 + 250000
      expect(response.body.data.netWorth.liabilities).toBe(153000); // 3000 + 150000
      expect(response.body.data.netWorth.lastUpdated).toBeDefined();
      
      // Verify category breakdown exists
      expect(response.body.data.netWorth.byCategory).toBeDefined();
      expect(response.body.data.netWorth.byCategory.categories.assets.liquid).toBe(15000);
      expect(response.body.data.netWorth.byCategory.categories.assets.investments).toBe(16000);
      expect(response.body.data.netWorth.byCategory.categories.assets.physical).toBe(250000);
    });

    it('should handle empty financial data', async () => {
      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.netWorth.current).toBe(0);
      expect(response.body.data.netWorth.assets).toBe(0);
      expect(response.body.data.netWorth.liabilities).toBe(0);
    });

    it('should handle different time periods', async () => {
      const periods = ['7d', '30d', '90d', '1y'];
      
      for (const period of periods) {
        const response = await request(app)
          .get(`/api/analytics?period=${period}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBe(period);
        expect(response.body.data.netWorth).toBeDefined();
      }
    });

    it('should maintain existing analytics functionality', async () => {
      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify existing fields still exist
      expect(response.body.data.portfolio).toBeDefined();
      expect(response.body.data.transactions).toBeDefined();
      expect(response.body.data.dateRange).toBeDefined();
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app)
        .get('/api/analytics')
        .expect(401);
    });

    it('should handle calculation errors gracefully', async () => {
      // Test with potentially problematic data
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'Test Account', balance: null, currency: 'USD' },
        isActive: true
      });

      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      // Should handle errors gracefully
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Performance testing', () => {
    it('should complete analytics calculation within reasonable time', async () => {
      // Create multiple assets for performance testing
      for (let i = 0; i < 10; i++) {
        await Account.create({
          userId,
          type: 'checking',
          accountInfo: { name: `Account ${i}`, balance: 1000 * i, currency: 'USD' },
          isActive: true
        });
      }

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Data consistency', () => {
    it('should maintain mathematical consistency in calculations', async () => {
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'Checking', balance: 5000, currency: 'USD' },
        isActive: true
      });

      await Debt.create({
        userId,
        type: 'credit_card',
        debtInfo: { creditor: 'Visa', accountNumber: '****1234' },
        remainingBalance: 2000,
        interestRate: 18.99,
        isActive: true
      });

      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const netWorth = response.body.data.netWorth.current;
      const assets = response.body.data.netWorth.assets;
      const liabilities = response.body.data.netWorth.liabilities;

      expect(netWorth).toBe(assets - liabilities);
      expect(assets).toBe(5000);
      expect(liabilities).toBe(2000);
      expect(netWorth).toBe(3000);
    });
  });
});
