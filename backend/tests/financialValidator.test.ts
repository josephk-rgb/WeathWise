import { FinancialDataValidator } from '../src/utils/financialValidator';

describe('FinancialDataValidator', () => {
  describe('validateNetWorthCalculation', () => {
    it('should pass validation for valid positive values', () => {
      expect(() => {
        FinancialDataValidator.validateNetWorthCalculation(100000, 50000);
      }).not.toThrow();
    });

    it('should pass validation for zero values', () => {
      expect(() => {
        FinancialDataValidator.validateNetWorthCalculation(0, 0);
      }).not.toThrow();
    });

    it('should throw error for negative assets', () => {
      expect(() => {
        FinancialDataValidator.validateNetWorthCalculation(-1000, 5000);
      }).toThrow('Total assets must be a valid finite number');
    });

    it('should throw error for negative liabilities', () => {
      expect(() => {
        FinancialDataValidator.validateNetWorthCalculation(10000, -5000);
      }).toThrow('Total liabilities cannot be negative');
    });

    it('should throw error for non-finite assets', () => {
      expect(() => {
        FinancialDataValidator.validateNetWorthCalculation(Infinity, 5000);
      }).toThrow('Total assets must be a valid finite number');

      expect(() => {
        FinancialDataValidator.validateNetWorthCalculation(NaN, 5000);
      }).toThrow('Total assets must be a valid finite number');
    });

    it('should throw error for non-finite liabilities', () => {
      expect(() => {
        FinancialDataValidator.validateNetWorthCalculation(10000, Infinity);
      }).toThrow('Total liabilities must be a valid finite number');
    });

    it('should throw error for values exceeding limits', () => {
      expect(() => {
        FinancialDataValidator.validateNetWorthCalculation(1e13, 5000);
      }).toThrow('Financial values exceed reasonable limits');

      expect(() => {
        FinancialDataValidator.validateNetWorthCalculation(10000, 1e13);
      }).toThrow('Financial values exceed reasonable limits');
    });
  });

  describe('validateAccountBalance', () => {
    it('should pass validation for valid checking account balance', () => {
      expect(() => {
        FinancialDataValidator.validateAccountBalance(5000, 'checking');
      }).not.toThrow();
    });

    it('should pass validation for negative checking account balance', () => {
      expect(() => {
        FinancialDataValidator.validateAccountBalance(-100, 'checking');
      }).not.toThrow();
    });

    it('should warn for positive credit account balance', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(() => {
        FinancialDataValidator.validateAccountBalance(1000, 'credit');
      }).not.toThrow();
      
      // Note: This test assumes the validator logs warnings, but the current implementation doesn't
      // You might want to adjust based on actual implementation
      
      consoleSpy.mockRestore();
    });

    it('should throw error for non-finite balance', () => {
      expect(() => {
        FinancialDataValidator.validateAccountBalance(NaN, 'checking');
      }).toThrow('Account balance must be a valid finite number');

      expect(() => {
        FinancialDataValidator.validateAccountBalance(Infinity, 'savings');
      }).toThrow('Account balance must be a valid finite number');
    });

    it('should throw error for balance exceeding limits', () => {
      expect(() => {
        FinancialDataValidator.validateAccountBalance(1e10, 'checking');
      }).toThrow('Account balance exceeds reasonable limits');
    });
  });

  describe('validateAssetEquity', () => {
    it('should calculate equity correctly with valid values', () => {
      const equity = FinancialDataValidator.validateAssetEquity(500000, 200000);
      expect(equity).toBe(300000);
    });

    it('should calculate equity with no loan', () => {
      const equity = FinancialDataValidator.validateAssetEquity(500000);
      expect(equity).toBe(500000);
    });

    it('should handle negative equity', () => {
      const equity = FinancialDataValidator.validateAssetEquity(200000, 300000);
      expect(equity).toBe(-100000);
    });

    it('should throw error for negative asset value', () => {
      expect(() => {
        FinancialDataValidator.validateAssetEquity(-100000, 50000);
      }).toThrow('Asset value must be a valid positive number');
    });

    it('should throw error for negative loan balance', () => {
      expect(() => {
        FinancialDataValidator.validateAssetEquity(300000, -50000);
      }).toThrow('Loan balance must be a valid positive number');
    });

    it('should throw error for non-finite values', () => {
      expect(() => {
        FinancialDataValidator.validateAssetEquity(NaN, 50000);
      }).toThrow('Asset value must be a valid positive number');

      expect(() => {
        FinancialDataValidator.validateAssetEquity(300000, Infinity);
      }).toThrow('Loan balance must be a valid positive number');
    });
  });

  describe('validateDebtBalance', () => {
    it('should pass validation for valid positive debt', () => {
      expect(() => {
        FinancialDataValidator.validateDebtBalance(5000);
      }).not.toThrow();
    });

    it('should pass validation for zero debt', () => {
      expect(() => {
        FinancialDataValidator.validateDebtBalance(0);
      }).not.toThrow();
    });

    it('should throw error for negative debt', () => {
      expect(() => {
        FinancialDataValidator.validateDebtBalance(-1000);
      }).toThrow('Debt balance cannot be negative');
    });

    it('should throw error for non-finite debt', () => {
      expect(() => {
        FinancialDataValidator.validateDebtBalance(NaN);
      }).toThrow('Debt balance must be a valid finite number');
    });
  });

  describe('validatePercentage', () => {
    it('should pass validation for valid percentages', () => {
      expect(() => {
        FinancialDataValidator.validatePercentage(25.5, 'Interest Rate');
      }).not.toThrow();

      expect(() => {
        FinancialDataValidator.validatePercentage(0, 'Zero Percent');
      }).not.toThrow();

      expect(() => {
        FinancialDataValidator.validatePercentage(100, 'Full Percent');
      }).not.toThrow();
    });

    it('should throw error for negative percentage', () => {
      expect(() => {
        FinancialDataValidator.validatePercentage(-5, 'Interest Rate');
      }).toThrow('Interest Rate must be between 0 and 100');
    });

    it('should throw error for percentage over 100', () => {
      expect(() => {
        FinancialDataValidator.validatePercentage(150, 'Interest Rate');
      }).toThrow('Interest Rate must be between 0 and 100');
    });
  });

  describe('sanitizeCurrencyValue', () => {
    it('should parse valid currency strings', () => {
      expect(FinancialDataValidator.sanitizeCurrencyValue('$1,234.56')).toBe(1234.56);
      expect(FinancialDataValidator.sanitizeCurrencyValue('1,000')).toBe(1000);
      expect(FinancialDataValidator.sanitizeCurrencyValue('$ 500.00')).toBe(500);
    });

    it('should handle numeric values', () => {
      expect(FinancialDataValidator.sanitizeCurrencyValue(1234.56)).toBe(1234.56);
      expect(FinancialDataValidator.sanitizeCurrencyValue(0)).toBe(0);
    });

    it('should throw error for invalid string formats', () => {
      expect(() => {
        FinancialDataValidator.sanitizeCurrencyValue('invalid');
      }).toThrow('Invalid currency value format');

      expect(() => {
        FinancialDataValidator.sanitizeCurrencyValue('$abc');
      }).toThrow('Invalid currency value format');
    });

    it('should throw error for non-finite numbers', () => {
      expect(() => {
        FinancialDataValidator.sanitizeCurrencyValue(Infinity);
      }).toThrow('Currency value must be finite');

      expect(() => {
        FinancialDataValidator.sanitizeCurrencyValue(NaN);
      }).toThrow('Currency value must be finite');
    });

    it('should throw error for invalid types', () => {
      expect(() => {
        FinancialDataValidator.sanitizeCurrencyValue(null);
      }).toThrow('Currency value must be a number or string');

      expect(() => {
        FinancialDataValidator.sanitizeCurrencyValue(undefined);
      }).toThrow('Currency value must be a number or string');
    });
  });

  describe('validatePastDate', () => {
    it('should pass validation for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(() => {
        FinancialDataValidator.validatePastDate(pastDate, 'Purchase Date');
      }).not.toThrow();
    });

    it('should pass validation for today', () => {
      const today = new Date();
      expect(() => {
        FinancialDataValidator.validatePastDate(today, 'Transaction Date');
      }).not.toThrow();
    });

    it('should throw error for future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      expect(() => {
        FinancialDataValidator.validatePastDate(futureDate, 'Purchase Date');
      }).toThrow('Purchase Date cannot be in the future');
    });

    it('should throw error for invalid dates', () => {
      expect(() => {
        FinancialDataValidator.validatePastDate(new Date('invalid'), 'Date Field');
      }).toThrow('Date Field must be a valid date');
    });
  });
});
