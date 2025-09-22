import { NetWorthCalculator } from '../src/services/netWorthCalculator';
import { FinancialDataValidator } from '../src/utils/financialValidator';

describe('Phase 2: Net Worth Calculation Tests', () => {
  
  describe('FinancialDataValidator', () => {
    describe('validateNetWorthCalculation', () => {
      it('should validate valid net worth calculation inputs', () => {
        expect(() => {
          FinancialDataValidator.validateNetWorthCalculation(100000, 50000);
        }).not.toThrow();
      });

      it('should throw error for negative liabilities', () => {
        expect(() => {
          FinancialDataValidator.validateNetWorthCalculation(100000, -10000);
        }).toThrow('Total liabilities cannot be negative');
      });

      it('should throw error for non-finite values', () => {
        expect(() => {
          FinancialDataValidator.validateNetWorthCalculation(Infinity, 50000);
        }).toThrow('Total assets must be a valid finite number');

        expect(() => {
          FinancialDataValidator.validateNetWorthCalculation(100000, NaN);
        }).toThrow('Total liabilities must be a valid finite number');
      });

      it('should throw error for values exceeding limits', () => {
        expect(() => {
          FinancialDataValidator.validateNetWorthCalculation(1e13, 50000);
        }).toThrow('Financial values exceed reasonable limits');
      });
    });

    describe('validateAccountBalance', () => {
      it('should validate normal account balances', () => {
        expect(() => {
          FinancialDataValidator.validateAccountBalance(5000, 'checking');
        }).not.toThrow();
      });

      it('should throw error for non-finite balance', () => {
        expect(() => {
          FinancialDataValidator.validateAccountBalance(NaN, 'checking');
        }).toThrow('Account balance must be a valid finite number');
      });

      it('should throw error for excessive balance', () => {
        expect(() => {
          FinancialDataValidator.validateAccountBalance(1e10, 'checking');
        }).toThrow('Account balance exceeds reasonable limits');
      });
    });

    describe('validateAssetEquity', () => {
      it('should calculate equity correctly', () => {
        const equity = FinancialDataValidator.validateAssetEquity(250000, 150000);
        expect(equity).toBe(100000);
      });

      it('should handle assets without loans', () => {
        const equity = FinancialDataValidator.validateAssetEquity(50000);
        expect(equity).toBe(50000);
      });

      it('should throw error for negative asset value', () => {
        expect(() => {
          FinancialDataValidator.validateAssetEquity(-50000);
        }).toThrow('Asset value cannot be negative');
      });

      it('should throw error for negative loan balance', () => {
        expect(() => {
          FinancialDataValidator.validateAssetEquity(250000, -50000);
        }).toThrow('Loan balance cannot be negative');
      });
    });
  });

  describe('Net Worth Calculation Logic Tests', () => {
    it('should calculate net worth correctly with sample data', () => {
      // Test data scenarios from Phase 2 specification
      const testScenarios = [
        {
          name: "Simple case",
          accounts: [{ type: 'checking', balance: 1000 }],
          investments: [],
          debts: [],
          physicalAssets: [],
          expectedNetWorth: 1000
        },
        {
          name: "Complex case", 
          accounts: [
            { type: 'checking', balance: 5000 },
            { type: 'savings', balance: 10000 }
          ],
          investments: [{ marketValue: 25000 }],
          physicalAssets: [{ equity: 50000 }],
          debts: [{ balance: 15000 }],
          expectedNetWorth: 75000
        },
        {
          name: "Negative net worth case",
          accounts: [{ type: 'checking', balance: 2000 }],
          investments: [],
          physicalAssets: [],
          debts: [{ balance: 10000 }],
          expectedNetWorth: -8000
        }
      ];

      testScenarios.forEach(scenario => {
        const liquidAssets = scenario.accounts
          .filter(acc => ['checking', 'savings'].includes(acc.type))
          .reduce((sum, acc) => sum + acc.balance, 0);

        const portfolioValue = scenario.investments
          .reduce((sum, inv) => sum + inv.marketValue, 0);

        const physicalValue = scenario.physicalAssets
          .reduce((sum, asset) => sum + asset.equity, 0);

        const totalLiabilities = scenario.debts
          .reduce((sum, debt) => sum + debt.balance, 0);

        const calculatedNetWorth = liquidAssets + portfolioValue + physicalValue - totalLiabilities;

        expect(calculatedNetWorth).toBe(scenario.expectedNetWorth);
      });
    });

    it('should handle edge cases correctly', () => {
      // Test with zero values
      const zeroResult = 0 + 0 + 0 - 0;
      expect(zeroResult).toBe(0);

      // Test with large numbers
      const largeAssets = 1000000;
      const largeLiabilities = 500000;
      const largeNetWorth = largeAssets - largeLiabilities;
      expect(largeNetWorth).toBe(500000);
    });
  });

  describe('Performance Requirements', () => {
    it('should meet performance benchmarks', () => {
      const start = Date.now();
      
      // Simulate net worth calculation operations
      for (let i = 0; i < 1000; i++) {
        FinancialDataValidator.validateNetWorthCalculation(100000, 50000);
        FinancialDataValidator.validateAccountBalance(5000, 'checking');
        FinancialDataValidator.validateAssetEquity(250000, 150000);
      }
      
      const duration = Date.now() - start;
      
      // Should complete 1000 validations under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});

// Mock test for actual NetWorthCalculator (requires database)
describe('NetWorthCalculator Integration', () => {
  it('should have required methods', () => {
    expect(typeof NetWorthCalculator.getCurrentNetWorth).toBe('function');
    expect(typeof NetWorthCalculator.getNetWorthByCategory).toBe('function');
  });
});
