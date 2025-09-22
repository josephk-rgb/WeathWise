import { NetWorthCalculator } from '../src/services/netWorthCalculator';
import { FinancialDataValidator } from '../src/utils/financialValidator';
import mongoose from 'mongoose';
import { Account, Investment, Debt, PhysicalAsset } from '../src/models';

describe('Phase 2 Integration Tests', () => {
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

  describe('Complete Net Worth Calculation Flow', () => {
    it('should handle a real-world scenario with all asset types', async () => {
      // Scenario: Young professional with diverse financial portfolio
      
      // Liquid Assets
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'Main Checking', balance: 3500, currency: 'USD' },
        isActive: true
      });

      await Account.create({
        userId,
        type: 'savings',
        accountInfo: { name: 'Emergency Fund', balance: 15000, currency: 'USD' },
        isActive: true
      });

      await Account.create({
        userId,
        type: 'savings',
        accountInfo: { name: 'Vacation Fund', balance: 5000, currency: 'USD' },
        isActive: true
      });

      // Investment Portfolio
      await Investment.create({
        userId,
        securityInfo: { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'etf' },
        position: { 
          shares: 100, 
          averagePrice: 200, 
          currentPrice: 220, 
          totalCost: 20000, 
          marketValue: 22000 
        },
        isActive: true
      });

      await Investment.create({
        userId,
        securityInfo: { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', type: 'etf' },
        position: { 
          shares: 50, 
          averagePrice: 80, 
          currentPrice: 82, 
          totalCost: 4000, 
          marketValue: 4100 
        },
        isActive: true
      });

      // Physical Assets
      await PhysicalAsset.create({
        userId,
        type: 'vehicle',
        name: '2020 Toyota Camry',
        currentValue: 22000,
        equity: 8000,
        loanInfo: { 
          loanBalance: 14000, 
          monthlyPayment: 350, 
          lender: 'Toyota Financial',
          interestRate: 3.5
        },
        purchasePrice: 28000,
        purchaseDate: new Date('2020-01-15'),
        isActive: true
      });

      // Debts
      await Debt.create({
        userId,
        type: 'credit_card',
        debtInfo: { creditor: 'Chase Sapphire', accountNumber: '****4567' },
        remainingBalance: 2500,
        interestRate: 16.99,
        isActive: true
      });

      await Debt.create({
        userId,
        type: 'student_loan',
        debtInfo: { creditor: 'Federal Student Aid', accountNumber: '****8901' },
        remainingBalance: 35000,
        interestRate: 4.5,
        isActive: true
      });

      // Calculate Net Worth
      const netWorthData = await NetWorthCalculator.getCurrentNetWorth(userId);

      // Verify calculations
      expect(netWorthData.breakdown.liquidAssets).toBe(23500); // 3500 + 15000 + 5000
      expect(netWorthData.breakdown.portfolioValue).toBe(26100); // 22000 + 4100
      expect(netWorthData.breakdown.physicalAssets).toBe(8000); // Car equity
      expect(netWorthData.breakdown.totalLiabilities).toBe(51500); // 14000 + 2500 + 35000

      const expectedNetWorth = 23500 + 26100 + 8000 - 51500; // = 6100
      expect(netWorthData.netWorth).toBe(expectedNetWorth);

      // Validate the calculation
      expect(() => {
        FinancialDataValidator.validateNetWorthCalculation(
          netWorthData.breakdown.liquidAssets + netWorthData.breakdown.portfolioValue + netWorthData.breakdown.physicalAssets,
          netWorthData.breakdown.totalLiabilities
        );
      }).not.toThrow();
    });

    it('should handle negative net worth correctly', async () => {
      // Scenario: Recent graduate with high student debt
      
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'Checking', balance: 1200, currency: 'USD' },
        isActive: true
      });

      await Debt.create({
        userId,
        type: 'student_loan',
        debtInfo: { creditor: 'Federal Student Aid', accountNumber: '****1234' },
        remainingBalance: 65000,
        interestRate: 5.5,
        isActive: true
      });

      await Debt.create({
        userId,
        type: 'credit_card',
        debtInfo: { creditor: 'Credit Card', accountNumber: '****5678' },
        remainingBalance: 3500,
        interestRate: 22.99,
        isActive: true
      });

      const netWorthData = await NetWorthCalculator.getCurrentNetWorth(userId);

      expect(netWorthData.netWorth).toBe(-67300); // 1200 - 68500
      expect(netWorthData.breakdown.liquidAssets).toBe(1200);
      expect(netWorthData.breakdown.totalLiabilities).toBe(68500);
    });

    it('should handle millionaire scenario with real estate', async () => {
      // Scenario: Established professional with real estate investments
      
      // High liquid assets
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'Business Checking', balance: 25000, currency: 'USD' },
        isActive: true
      });

      await Account.create({
        userId,
        type: 'savings',
        accountInfo: { name: 'High Yield Savings', balance: 100000, currency: 'USD' },
        isActive: true
      });

      // Large investment portfolio
      await Investment.create({
        userId,
        securityInfo: { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'etf' },
        position: { 
          shares: 1000, 
          averagePrice: 350, 
          currentPrice: 420, 
          totalCost: 350000, 
          marketValue: 420000 
        },
        isActive: true
      });

      // Primary residence
      await PhysicalAsset.create({
        userId,
        type: 'real_estate',
        name: 'Primary Residence',
        currentValue: 750000,
        equity: 450000,
        loanInfo: { 
          loanBalance: 300000, 
          monthlyPayment: 2800, 
          lender: 'Wells Fargo Mortgage',
          interestRate: 3.25
        },
        purchasePrice: 600000,
        purchaseDate: new Date('2018-06-01'),
        isActive: true
      });

      // Investment property
      await PhysicalAsset.create({
        userId,
        type: 'real_estate',
        name: 'Rental Property',
        currentValue: 400000,
        equity: 200000,
        loanInfo: { 
          loanBalance: 200000, 
          monthlyPayment: 1500, 
          lender: 'Investment Property Loan',
          interestRate: 4.5
        },
        purchasePrice: 350000,
        purchaseDate: new Date('2019-03-15'),
        isActive: true
      });

      const netWorthData = await NetWorthCalculator.getCurrentNetWorth(userId);

      expect(netWorthData.breakdown.liquidAssets).toBe(125000);
      expect(netWorthData.breakdown.portfolioValue).toBe(420000);
      expect(netWorthData.breakdown.physicalAssets).toBe(650000); // 450000 + 200000
      expect(netWorthData.breakdown.totalLiabilities).toBe(500000); // 300000 + 200000

      const expectedNetWorth = 125000 + 420000 + 650000 - 500000; // = 695000
      expect(netWorthData.netWorth).toBe(expectedNetWorth);
      
      // Verify this is indeed millionaire status potential
      expect(netWorthData.netWorth).toBeGreaterThan(500000);
    });

    it('should maintain calculation consistency across multiple calls', async () => {
      // Create stable test data
      await Account.create({
        userId,
        type: 'savings',
        accountInfo: { name: 'Test Account', balance: 10000, currency: 'USD' },
        isActive: true
      });

      // Call multiple times and verify consistency
      const results: number[] = [];
      for (let i = 0; i < 5; i++) {
        const result = await NetWorthCalculator.getCurrentNetWorth(userId);
        results.push(result.netWorth);
      }

      // All results should be identical
      const allSame = results.every(result => result === results[0]);
      expect(allSame).toBe(true);
      expect(results[0]).toBe(10000);
    });
  });

  describe('Data Validation Integration', () => {
    it('should validate all financial data in a complete scenario', async () => {
      const testData = {
        accounts: [
          { balance: 5000, type: 'checking' },
          { balance: 15000, type: 'savings' },
          { balance: -500, type: 'credit' } // Negative for credit is normal
        ],
        investments: [
          { marketValue: 25000 },
          { marketValue: 8500 }
        ],
        physicalAssets: [
          { currentValue: 300000, loanBalance: 150000 }
        ],
        debts: [
          { balance: 5000 },
          { balance: 25000 }
        ]
      };

      // Validate all account balances
      testData.accounts.forEach(account => {
        expect(() => {
          FinancialDataValidator.validateAccountBalance(account.balance, account.type);
        }).not.toThrow();
      });

      // Validate investment values
      testData.investments.forEach(investment => {
        expect(() => {
          FinancialDataValidator.validateInvestmentValue(investment.marketValue);
        }).not.toThrow();
      });

      // Validate asset equity
      testData.physicalAssets.forEach(asset => {
        const equity = FinancialDataValidator.validateAssetEquity(asset.currentValue, asset.loanBalance);
        expect(equity).toBe(150000);
      });

      // Validate debt balances
      testData.debts.forEach(debt => {
        expect(() => {
          FinancialDataValidator.validateDebtBalance(debt.balance);
        }).not.toThrow();
      });

      // Calculate totals and validate overall net worth calculation
      const totalAssets = 
        testData.accounts.filter(a => a.type !== 'credit').reduce((sum, a) => sum + a.balance, 0) +
        testData.investments.reduce((sum, i) => sum + i.marketValue, 0) +
        testData.physicalAssets.reduce((sum, a) => sum + (a.currentValue - a.loanBalance), 0);

      const totalLiabilities = 
        Math.abs(testData.accounts.filter(a => a.type === 'credit').reduce((sum, a) => sum + a.balance, 0)) +
        testData.debts.reduce((sum, d) => sum + d.balance, 0) +
        testData.physicalAssets.reduce((sum, a) => sum + a.loanBalance, 0);

      expect(() => {
        FinancialDataValidator.validateNetWorthCalculation(totalAssets, totalLiabilities);
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely large financial values', async () => {
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'Large Account', balance: 999999999, currency: 'USD' },
        isActive: true
      });

      const result = await NetWorthCalculator.getCurrentNetWorth(userId);
      expect(result.netWorth).toBe(999999999);
      
      // Should validate without throwing
      expect(() => {
        FinancialDataValidator.validateNetWorthCalculation(999999999, 0);
      }).not.toThrow();
    });

    it('should handle zero values correctly', async () => {
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'Zero Balance', balance: 0, currency: 'USD' },
        isActive: true
      });

      const result = await NetWorthCalculator.getCurrentNetWorth(userId);
      expect(result.netWorth).toBe(0);
    });

    it('should handle mixed currency scenarios (simplified)', async () => {
      // Note: This test assumes USD-only for now
      await Account.create({
        userId,
        type: 'checking',
        accountInfo: { name: 'USD Account', balance: 5000, currency: 'USD' },
        isActive: true
      });

      const result = await NetWorthCalculator.getCurrentNetWorth(userId);
      expect(result.netWorth).toBe(5000);
    });
  });
});
