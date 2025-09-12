import { logger } from './logger';

export class FinancialDataValidator {
  /**
   * Validate net worth calculation inputs
   */
  static validateNetWorthCalculation(assets: number, liabilities: number): void {
    if (typeof assets !== 'number' || !isFinite(assets)) {
      throw new Error('Total assets must be a valid finite number');
    }
    
    if (typeof liabilities !== 'number' || !isFinite(liabilities)) {
      throw new Error('Total liabilities must be a valid finite number');
    }
    
    if (assets < 0) {
      logger.warn('Total assets is negative - this may indicate data quality issues');
    }
    
    if (liabilities < 0) {
      throw new Error('Total liabilities cannot be negative');
    }
    
    if (Math.abs(assets) > 1e12 || Math.abs(liabilities) > 1e12) {
      throw new Error('Financial values exceed reasonable limits (> $1 trillion)');
    }
  }
  
  /**
   * Validate account balance
   */
  static validateAccountBalance(balance: number, accountType: string): void {
    if (typeof balance !== 'number' || !isFinite(balance)) {
      throw new Error('Account balance must be a valid finite number');
    }
    
    if (accountType === 'credit' && balance > 0) {
      logger.warn('Credit account with positive balance - verify this is correct');
    }
    
    if (Math.abs(balance) > 1e9) {
      throw new Error('Account balance exceeds reasonable limits (> $1 billion)');
    }
  }
  
  /**
   * Validate and calculate asset equity
   */
  static validateAssetEquity(currentValue: number, loanBalance: number = 0): number {
    if (typeof currentValue !== 'number' || !isFinite(currentValue) || currentValue < 0) {
      throw new Error('Asset value must be a valid positive number');
    }
    
    if (typeof loanBalance !== 'number' || !isFinite(loanBalance) || loanBalance < 0) {
      throw new Error('Loan balance must be a valid positive number');
    }
    
    const equity = currentValue - loanBalance;
    
    if (equity < -currentValue) {
      logger.warn('Asset equity is significantly negative - verify loan balance is correct');
    }
    
    return equity;
  }
  
  /**
   * Validate debt balance
   */
  static validateDebtBalance(balance: number): void {
    if (typeof balance !== 'number' || !isFinite(balance)) {
      throw new Error('Debt balance must be a valid finite number');
    }
    
    if (balance < 0) {
      throw new Error('Debt balance cannot be negative');
    }
    
    if (balance > 1e8) {
      logger.warn('Debt balance is very high (> $100M) - verify this is correct');
    }
  }
  
  /**
   * Validate investment market value
   */
  static validateInvestmentValue(marketValue: number): void {
    if (typeof marketValue !== 'number' || !isFinite(marketValue)) {
      throw new Error('Investment market value must be a valid finite number');
    }
    
    if (marketValue < 0) {
      logger.warn('Investment market value is negative - this may indicate data quality issues');
    }
    
    if (marketValue > 1e10) {
      logger.warn('Investment market value is very high (> $10B) - verify this is correct');
    }
  }
  
  /**
   * Validate percentage values
   */
  static validatePercentage(value: number, fieldName: string): void {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error(`${fieldName} must be a valid finite number`);
    }
    
    if (value < 0 || value > 100) {
      throw new Error(`${fieldName} must be between 0 and 100`);
    }
  }
  
  /**
   * Validate interest rate
   */
  static validateInterestRate(rate: number): void {
    if (typeof rate !== 'number' || !isFinite(rate)) {
      throw new Error('Interest rate must be a valid finite number');
    }
    
    if (rate < 0) {
      throw new Error('Interest rate cannot be negative');
    }
    
    if (rate > 100) {
      logger.warn('Interest rate is very high (> 100%) - verify this is correct');
    }
  }
  
  /**
   * Sanitize currency values
   */
  static sanitizeCurrencyValue(value: any): number {
    if (typeof value === 'string') {
      // Remove currency symbols and commas
      const cleanValue = value.replace(/[$,\s]/g, '');
      const numValue = parseFloat(cleanValue);
      
      if (isNaN(numValue)) {
        throw new Error('Invalid currency value format');
      }
      
      return numValue;
    }
    
    if (typeof value === 'number') {
      if (!isFinite(value)) {
        throw new Error('Currency value must be finite');
      }
      return value;
    }
    
    throw new Error('Currency value must be a number or string');
  }
  
  /**
   * Validate date is not in the future
   */
  static validatePastDate(date: Date, fieldName: string): void {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error(`${fieldName} must be a valid date`);
    }
    
    if (date > new Date()) {
      throw new Error(`${fieldName} cannot be in the future`);
    }
  }
}

export default FinancialDataValidator;
