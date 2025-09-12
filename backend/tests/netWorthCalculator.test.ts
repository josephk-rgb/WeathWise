import mongoose from 'mongoose';
import { NetWorthCalculator } from '../src/services/netWorthCalculator';
import { Account, Investment, Debt, PhysicalAsset } from '../src/models';

describe('NetWorthCalculator', () => {
  let userId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/weathwise_test');
  });

  beforeEach(async () => {
    // Clean up test data
    await Account.deleteMany({});
    await Investment.deleteMany({});
    await Debt.deleteMany({});
    await PhysicalAsset.deleteMany({});
    
    userId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('getCurrentNetWorth', () => {
    it('should calculate net worth with only liquid assets', async () => {
      // Create test accounts
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: {
          name: 'Test Checking',
          balance: 5000,
          currency: 'USD'
        },
        isActive: true
      });

      await Account.create({
        userId,
        type: 'savings',
        accountInfo: {
          name: 'Test Savings',
          balance: 10000,
          currency: 'USD'
        },
        isActive: true
      });

      const result = await NetWorthCalculator.getCurrentNetWorth(userId);

      expect(result.netWorth).toBe(15000);
      expect(result.breakdown.liquidAssets).toBe(15000);
      expect(result.breakdown.portfolioValue).toBe(0);
      expect(result.breakdown.physicalAssets).toBe(0);
      expect(result.breakdown.totalLiabilities).toBe(0);
    });

    it('should calculate net worth with investments', async () => {
      // Create test investments
      await Investment.create({
        userId,
        securityInfo: {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'stock'
        },
        position: {
          shares: 100,
          averagePrice: 150,
          currentPrice: 160,
          totalCost: 15000,
          marketValue: 16000
        },
        isActive: true
      });

      const result = await NetWorthCalculator.getCurrentNetWorth(userId);

      expect(result.netWorth).toBe(16000);
      expect(result.breakdown.portfolioValue).toBe(16000);
      expect(result.breakdown.liquidAssets).toBe(0);
    });

    it('should calculate net worth with physical assets', async () => {
      // Create test physical asset
      await PhysicalAsset.create({
        userId,
        type: 'real_estate',
        name: 'Primary Home',
        currentValue: 500000,
        equity: 300000,
        loanInfo: {
          loanBalance: 200000,
          monthlyPayment: 2500,
          lender: 'Bank of America'
        },
        isActive: true
      });

      const result = await NetWorthCalculator.getCurrentNetWorth(userId);

      expect(result.netWorth).toBe(300000);
      expect(result.breakdown.physicalAssets).toBe(300000);
      expect(result.breakdown.totalLiabilities).toBe(200000);
    });

    it('should calculate net worth with debts', async () => {
      // Create test debt
      await Debt.create({
        userId,
        type: 'credit_card',
        debtInfo: {
          creditor: 'Chase',
          accountNumber: '****1234'
        },
        remainingBalance: 5000,
        interestRate: 18.99,
        isActive: true
      });

      const result = await NetWorthCalculator.getCurrentNetWorth(userId);

      expect(result.netWorth).toBe(-5000);
      expect(result.breakdown.totalLiabilities).toBe(5000);
    });

    it('should calculate comprehensive net worth with all asset types', async () => {
      // Create liquid assets
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'Checking', balance: 5000, currency: 'USD' },
        isActive: true
      });

      // Create investments
      await Investment.create({
        userId,
        securityInfo: { symbol: 'AAPL', name: 'Apple', type: 'stock' },
        position: { shares: 100, averagePrice: 150, currentPrice: 160, totalCost: 15000, marketValue: 16000 },
        isActive: true
      });

      // Create physical assets
      await PhysicalAsset.create({
        userId,
        type: 'real_estate',
        name: 'Home',
        currentValue: 400000,
        equity: 250000,
        loanInfo: { loanBalance: 150000, monthlyPayment: 2000, lender: 'Bank' },
        isActive: true
      });

      // Create debts
      await Debt.create({
        userId,
        type: 'credit_card',
        debtInfo: { creditor: 'Chase', accountNumber: '****1234' },
        remainingBalance: 3000,
        interestRate: 18.99,
        isActive: true
      });

      const result = await NetWorthCalculator.getCurrentNetWorth(userId);

      // Liquid: 5000, Portfolio: 16000, Physical: 250000, Debt: 3000 + 150000 = 153000
      // Net Worth: 5000 + 16000 + 250000 - 153000 = 118000
      expect(result.netWorth).toBe(118000);
      expect(result.breakdown.liquidAssets).toBe(5000);
      expect(result.breakdown.portfolioValue).toBe(16000);
      expect(result.breakdown.physicalAssets).toBe(250000);
      expect(result.breakdown.totalLiabilities).toBe(153000);
    });

    it('should handle inactive assets correctly', async () => {
      // Create active account
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'Active Account', balance: 5000, currency: 'USD' },
        isActive: true
      });

      // Create inactive account
      await Account.create({
        userId,
        type: 'savings',
        accountInfo: { name: 'Inactive Account', balance: 10000, currency: 'USD' },
        isActive: false
      });

      const result = await NetWorthCalculator.getCurrentNetWorth(userId);

      expect(result.netWorth).toBe(5000);
      expect(result.breakdown.liquidAssets).toBe(5000);
    });

    it('should return zero net worth for user with no assets', async () => {
      const result = await NetWorthCalculator.getCurrentNetWorth(userId);

      expect(result.netWorth).toBe(0);
      expect(result.breakdown.liquidAssets).toBe(0);
      expect(result.breakdown.portfolioValue).toBe(0);
      expect(result.breakdown.physicalAssets).toBe(0);
      expect(result.breakdown.totalLiabilities).toBe(0);
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getNetWorthByCategory', () => {
    it('should return detailed category breakdown', async () => {
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

      const result = await NetWorthCalculator.getNetWorthByCategory(userId);

      expect(result.netWorth).toBe(21000);
      expect(result.categories.assets.liquid).toBe(5000);
      expect(result.categories.assets.investments).toBe(16000);
      expect(result.categories.assets.physical).toBe(0);
      expect(result.categories.liabilities.total).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Disconnect from database to simulate error
      await mongoose.disconnect();

      await expect(NetWorthCalculator.getCurrentNetWorth(userId))
        .rejects
        .toThrow('Failed to calculate net worth');

      // Reconnect for cleanup
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/weathwise_test');
    });

    it('should handle invalid user ID', async () => {
      const invalidUserId = new mongoose.Types.ObjectId();
      
      const result = await NetWorthCalculator.getCurrentNetWorth(invalidUserId);
      
      expect(result.netWorth).toBe(0);
    });
  });
});
