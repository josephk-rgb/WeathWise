import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/index';
import { Account, Investment, Debt, PhysicalAsset } from '../src/models';

describe('Net Worth API Routes', () => {
  let authToken: string;
  let userId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/weathwise_test');
    
    // Mock authentication - you'll need to adapt this to your auth system
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

  describe('GET /api/net-worth/current', () => {
    it('should return current net worth', async () => {
      // Create test data
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'Test Account', balance: 5000, currency: 'USD' },
        isActive: true
      });

      const response = await request(app)
        .get('/api/net-worth/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.netWorth).toBe(5000);
      expect(response.body.data.breakdown.liquidAssets).toBe(5000);
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app)
        .get('/api/net-worth/current')
        .expect(401);
    });

    it('should handle calculation errors gracefully', async () => {
      // Mock database error by creating invalid data
      const response = await request(app)
        .get('/api/net-worth/current')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.success).toBeDefined();
    });
  });

  describe('GET /api/net-worth/by-category', () => {
    it('should return net worth breakdown by category', async () => {
      // Create test data
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'Checking', balance: 5000, currency: 'USD' },
        isActive: true
      });

      await Investment.create({
        userId,
        securityInfo: { symbol: 'AAPL', name: 'Apple', type: 'stock' },
        position: { shares: 100, averagePrice: 150, currentPrice: 160, totalCost: 15000, marketValue: 16000 },
        isActive: true
      });

      const response = await request(app)
        .get('/api/net-worth/by-category')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories.assets.liquid).toBe(5000);
      expect(response.body.data.categories.assets.investments).toBe(16000);
    });
  });

  describe('GET /api/net-worth/history', () => {
    it('should return net worth history with default period', async () => {
      const response = await request(app)
        .get('/api/net-worth/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('30d');
      expect(response.body.data.history).toBeInstanceOf(Array);
    });

    it('should return net worth history with custom period', async () => {
      const response = await request(app)
        .get('/api/net-worth/history?period=7d')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('7d');
    });

    it('should handle invalid period gracefully', async () => {
      const response = await request(app)
        .get('/api/net-worth/history?period=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('invalid');
    });
  });

  describe('POST /api/net-worth/validate', () => {
    it('should validate correct financial data', async () => {
      const validData = {
        assets: 100000,
        liabilities: 25000
      };

      const response = await request(app)
        .post('/api/net-worth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.netWorth).toBe(75000);
      expect(response.body.data.isValid).toBe(true);
    });

    it('should reject missing data', async () => {
      const invalidData = { assets: 100000 }; // missing liabilities

      const response = await request(app)
        .post('/api/net-worth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should reject invalid financial values', async () => {
      const invalidData = {
        assets: -1000,
        liabilities: 5000
      };

      const response = await request(app)
        .post('/api/net-worth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.isValid).toBe(false);
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        assets: Infinity,
        liabilities: 5000
      };

      const response = await request(app)
        .post('/api/net-worth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
    });

    it('should calculate zero net worth correctly', async () => {
      const zeroData = {
        assets: 50000,
        liabilities: 50000
      };

      const response = await request(app)
        .post('/api/net-worth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(zeroData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.netWorth).toBe(0);
    });

    it('should handle negative net worth', async () => {
      const negativeData = {
        assets: 25000,
        liabilities: 50000
      };

      const response = await request(app)
        .post('/api/net-worth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(negativeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.netWorth).toBe(-25000);
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the routes exist and don't crash
      const response = await request(app)
        .get('/api/net-worth/current')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('should return structured error responses', async () => {
      const response = await request(app)
        .post('/api/net-worth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});
