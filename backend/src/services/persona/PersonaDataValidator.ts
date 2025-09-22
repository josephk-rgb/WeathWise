import mongoose from 'mongoose';
import { logger } from '../../utils/logger';
import { User, Account, Transaction, Investment, Debt, Budget, Goal, PhysicalAsset, NetWorthMilestone, AccountBalanceHistory, DailyPrice } from '../../models';
import { NetWorthCalculator } from '../netWorthCalculator';

/**
 * PersonaDataValidator - Comprehensive Data Consistency Validation
 * 
 * This service validates persona data for consistency, accuracy, and completeness.
 * It ensures that all financial data makes sense and follows realistic patterns.
 */

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  summary: {
    totalRecords: number;
    recordsValidated: number;
    validationTime: number;
  };
}

export interface ValidationIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  recordId?: string;
  recordType?: string;
  suggestedFix?: string;
}

export interface ValidationWarning {
  category: string;
  message: string;
  recordId?: string;
  recordType?: string;
}

export interface ValidationConfig {
  validateAccountBalances: boolean;
  validateInvestmentData: boolean;
  validateDebtConsistency: boolean;
  validateNetWorthCalculations: boolean;
  validateHistoricalData: boolean;
  validateTransactionPatterns: boolean;
  validateGoalProgress: boolean;
  validateBudgetConsistency: boolean;
  strictMode: boolean;
}

export class PersonaDataValidator {
  private static readonly DEFAULT_CONFIG: ValidationConfig = {
    validateAccountBalances: true,
    validateInvestmentData: true,
    validateDebtConsistency: true,
    validateNetWorthCalculations: true,
    validateHistoricalData: true,
    validateTransactionPatterns: true,
    validateGoalProgress: true,
    validateBudgetConsistency: true,
    strictMode: false
  };

  /**
   * Validate all persona data for a user
   */
  static async validatePersonaData(
    userId: mongoose.Types.ObjectId,
    config: Partial<ValidationConfig> = {}
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    const result: ValidationResult = {
      isValid: true,
      score: 100,
      issues: [],
      warnings: [],
      summary: {
        totalRecords: 0,
        recordsValidated: 0,
        validationTime: 0
      }
    };

    try {
      logger.info(`🔍 Starting persona data validation for user ${userId}`);

      // Count total records
      result.summary.totalRecords = await this.countTotalRecords(userId);

      // Validate user profile
      if (finalConfig.validateAccountBalances) {
        await this.validateUserProfile(userId, result);
      }

      // Validate accounts
      if (finalConfig.validateAccountBalances) {
        await this.validateAccounts(userId, result);
      }

      // Validate investments
      if (finalConfig.validateInvestmentData) {
        await this.validateInvestments(userId, result);
      }

      // Validate debts
      if (finalConfig.validateDebtConsistency) {
        await this.validateDebts(userId, result);
      }

      // Validate budgets
      if (finalConfig.validateBudgetConsistency) {
        await this.validateBudgets(userId, result);
      }

      // Validate goals
      if (finalConfig.validateGoalProgress) {
        await this.validateGoals(userId, result);
      }

      // Validate physical assets
      await this.validatePhysicalAssets(userId, result);

      // Validate net worth calculations
      if (finalConfig.validateNetWorthCalculations) {
        await this.validateNetWorthCalculations(userId, result);
      }

      // Validate historical data
      if (finalConfig.validateHistoricalData) {
        await this.validateHistoricalData(userId, result);
      }

      // Validate transaction patterns
      if (finalConfig.validateTransactionPatterns) {
        await this.validateTransactionPatterns(userId, result);
      }

      // Calculate final score
      result.score = this.calculateValidationScore(result);
      result.isValid = result.issues.filter(issue => issue.severity === 'critical' || issue.severity === 'high').length === 0;
      
      result.summary.recordsValidated = result.summary.totalRecords;
      result.summary.validationTime = Date.now() - startTime;

      logger.info(`✅ Validation completed in ${result.summary.validationTime}ms`);
      logger.info(`📊 Score: ${result.score}/100, Issues: ${result.issues.length}, Warnings: ${result.warnings.length}`);

      return result;
    } catch (error) {
      result.issues.push({
        severity: 'critical',
        category: 'validation_error',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestedFix: 'Check system logs and retry validation'
      });
      
      result.isValid = false;
      result.score = 0;
      result.summary.validationTime = Date.now() - startTime;
      
      logger.error(`❌ Validation failed for user ${userId}:`, error);
      return result;
    }
  }

  /**
   * Count total records for validation summary
   */
  private static async countTotalRecords(userId: mongoose.Types.ObjectId): Promise<number> {
    const counts = await Promise.all([
      Account.countDocuments({ userId }),
      Transaction.countDocuments({ userId }),
      Investment.countDocuments({ userId }),
      Debt.countDocuments({ userId }),
      Budget.countDocuments({ userId }),
      Goal.countDocuments({ userId }),
      PhysicalAsset.countDocuments({ userId }),
      NetWorthMilestone.countDocuments({ userId }),
      AccountBalanceHistory.countDocuments({ userId })
    ]);

    return counts.reduce((sum, count) => sum + count, 0);
  }

  /**
   * Validate user profile
   */
  private static async validateUserProfile(userId: mongoose.Types.ObjectId, result: ValidationResult): Promise<void> {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        result.issues.push({
          severity: 'critical',
          category: 'user_profile',
          message: 'User not found',
          recordId: userId.toString(),
          recordType: 'User',
          suggestedFix: 'Ensure user exists before loading persona data'
        });
        return;
      }

      // Validate required fields
      if (!user.email) {
        result.issues.push({
          severity: 'high',
          category: 'user_profile',
          message: 'User email is missing',
          recordId: userId.toString(),
          recordType: 'User',
          suggestedFix: 'Add email to user profile'
        });
      }

      // Validate risk profile
      if (!user.riskProfile || !user.riskProfile.level) {
        result.warnings.push({
          category: 'user_profile',
          message: 'Risk profile not set',
          recordId: userId.toString(),
          recordType: 'User'
        });
      }

      // Validate subscription
      if (!user.subscription || !user.subscription.plan) {
        result.warnings.push({
          category: 'user_profile',
          message: 'Subscription plan not set',
          recordId: userId.toString(),
          recordType: 'User'
        });
      }

    } catch (error) {
      result.issues.push({
        severity: 'medium',
        category: 'user_profile',
        message: `Failed to validate user profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recordId: userId.toString(),
        recordType: 'User'
      });
    }
  }

  /**
   * Validate accounts
   */
  private static async validateAccounts(userId: mongoose.Types.ObjectId, result: ValidationResult): Promise<void> {
    try {
      const accounts = await Account.find({ userId });

      for (const account of accounts) {
        // Validate account balance
        if (account.accountInfo.balance < 0 && account.type !== 'credit') {
          result.issues.push({
            severity: 'high',
            category: 'account_balance',
            message: `Non-credit account has negative balance: $${account.accountInfo.balance}`,
            recordId: account._id.toString(),
            recordType: 'Account',
            suggestedFix: 'Check account type or balance calculation'
          });
        }

        // Validate credit account balance (should be positive for debt)
        if (account.type === 'credit' && account.accountInfo.balance > 0) {
          result.issues.push({
            severity: 'medium',
            category: 'account_balance',
            message: `Credit account has positive balance: $${account.accountInfo.balance}`,
            recordId: account._id.toString(),
            recordType: 'Account',
            suggestedFix: 'Credit accounts should have negative balances (debt)'
          });
        }

        // Validate account info completeness
        if (!account.accountInfo.name || !account.accountInfo.accountNumber) {
          result.issues.push({
            severity: 'medium',
            category: 'account_info',
            message: 'Account missing required information',
            recordId: account._id.toString(),
            recordType: 'Account',
            suggestedFix: 'Ensure account name and number are provided'
          });
        }

        // Validate institution name
        if (!account.institutionName) {
          result.warnings.push({
            category: 'account_info',
            message: 'Institution name not specified',
            recordId: account._id.toString(),
            recordType: 'Account'
          });
        }
      }

      // Check for duplicate account numbers
      const accountNumbers = accounts.map(acc => acc.accountInfo.accountNumber).filter(Boolean);
      const duplicateNumbers = accountNumbers.filter((num, index) => accountNumbers.indexOf(num) !== index);
      
      if (duplicateNumbers.length > 0) {
        result.issues.push({
          severity: 'high',
          category: 'account_duplicates',
          message: `Duplicate account numbers found: ${duplicateNumbers.join(', ')}`,
          suggestedFix: 'Ensure all account numbers are unique'
        });
      }

    } catch (error) {
      result.issues.push({
        severity: 'medium',
        category: 'account_validation',
        message: `Failed to validate accounts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recordType: 'Account'
      });
    }
  }

  /**
   * Validate investments
   */
  private static async validateInvestments(userId: mongoose.Types.ObjectId, result: ValidationResult): Promise<void> {
    try {
      const investments = await Investment.find({ userId });

      for (const investment of investments) {
        // Validate share count
        if (investment.position.shares <= 0) {
          result.issues.push({
            severity: 'high',
            category: 'investment_shares',
            message: `Investment has zero or negative shares: ${investment.position.shares}`,
            recordId: investment._id.toString(),
            recordType: 'Investment',
            suggestedFix: 'Ensure share count is positive'
          });
        }

        // Validate price data
        if (investment.position.currentPrice <= 0) {
          result.issues.push({
            severity: 'high',
            category: 'investment_price',
            message: `Investment has zero or negative price: $${investment.position.currentPrice}`,
            recordId: investment._id.toString(),
            recordType: 'Investment',
            suggestedFix: 'Ensure current price is positive'
          });
        }

        // Validate cost basis
        if (investment.position.totalCost <= 0) {
          result.issues.push({
            severity: 'medium',
            category: 'investment_cost',
            message: `Investment has zero or negative total cost: $${investment.position.totalCost}`,
            recordId: investment._id.toString(),
            recordType: 'Investment',
            suggestedFix: 'Ensure total cost is positive'
          });
        }

        // Validate symbol
        if (!investment.securityInfo.symbol) {
          result.issues.push({
            severity: 'high',
            category: 'investment_symbol',
            message: 'Investment missing symbol',
            recordId: investment._id.toString(),
            recordType: 'Investment',
            suggestedFix: 'Add investment symbol'
          });
        }

        // Validate market value calculation
        const calculatedValue = investment.position.shares * investment.position.currentPrice;
        const storedValue = investment.position.marketValue;
        
        if (Math.abs(calculatedValue - storedValue) > 0.01) {
          result.issues.push({
            severity: 'medium',
            category: 'investment_calculation',
            message: `Market value mismatch: calculated $${calculatedValue.toFixed(2)}, stored $${storedValue.toFixed(2)}`,
            recordId: investment._id.toString(),
            recordType: 'Investment',
            suggestedFix: 'Recalculate market value'
          });
        }

        // Validate gain/loss calculation
        const calculatedGainLoss = calculatedValue - investment.position.totalCost;
        const storedGainLoss = investment.position.gainLoss;
        
        if (Math.abs(calculatedGainLoss - storedGainLoss) > 0.01) {
          result.issues.push({
            severity: 'medium',
            category: 'investment_calculation',
            message: `Gain/loss mismatch: calculated $${calculatedGainLoss.toFixed(2)}, stored $${storedGainLoss.toFixed(2)}`,
            recordId: investment._id.toString(),
            recordType: 'Investment',
            suggestedFix: 'Recalculate gain/loss'
          });
        }
      }

    } catch (error) {
      result.issues.push({
        severity: 'medium',
        category: 'investment_validation',
        message: `Failed to validate investments: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recordType: 'Investment'
      });
    }
  }

  /**
   * Validate debts
   */
  private static async validateDebts(userId: mongoose.Types.ObjectId, result: ValidationResult): Promise<void> {
    try {
      const debts = await Debt.find({ userId });

      for (const debt of debts) {
        // Validate remaining balance
        if (debt.remainingBalance < 0) {
          result.issues.push({
            severity: 'high',
            category: 'debt_balance',
            message: `Debt has negative remaining balance: $${debt.remainingBalance}`,
            recordId: debt._id.toString(),
            recordType: 'Debt',
            suggestedFix: 'Ensure remaining balance is positive'
          });
        }

        // Validate original amount
        if (debt.originalAmount < 0) {
          result.issues.push({
            severity: 'high',
            category: 'debt_original',
            message: `Debt has negative original amount: $${debt.originalAmount}`,
            recordId: debt._id.toString(),
            recordType: 'Debt',
            suggestedFix: 'Ensure original amount is positive'
          });
        }

        // Validate remaining balance vs original amount
        if (debt.remainingBalance > debt.originalAmount) {
          result.issues.push({
            severity: 'medium',
            category: 'debt_consistency',
            message: `Remaining balance ($${debt.remainingBalance}) exceeds original amount ($${debt.originalAmount})`,
            recordId: debt._id.toString(),
            recordType: 'Debt',
            suggestedFix: 'Check debt progression calculation'
          });
        }

        // Validate interest rate
        if (debt.interestRate < 0 || debt.interestRate > 100) {
          result.issues.push({
            severity: 'medium',
            category: 'debt_interest',
            message: `Unrealistic interest rate: ${debt.interestRate}%`,
            recordId: debt._id.toString(),
            recordType: 'Debt',
            suggestedFix: 'Ensure interest rate is between 0-100%'
          });
        }

        // Validate minimum payment
        if (debt.minimumPayment < 0) {
          result.issues.push({
            severity: 'high',
            category: 'debt_payment',
            message: `Negative minimum payment: $${debt.minimumPayment}`,
            recordId: debt._id.toString(),
            recordType: 'Debt',
            suggestedFix: 'Ensure minimum payment is positive'
          });
        }
      }

    } catch (error) {
      result.issues.push({
        severity: 'medium',
        category: 'debt_validation',
        message: `Failed to validate debts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recordType: 'Debt'
      });
    }
  }

  /**
   * Validate budgets
   */
  private static async validateBudgets(userId: mongoose.Types.ObjectId, result: ValidationResult): Promise<void> {
    try {
      const budgets = await Budget.find({ userId });

      for (const budget of budgets) {
        // Validate allocated amount
        if (budget.allocated < 0) {
          result.issues.push({
            severity: 'high',
            category: 'budget_allocated',
            message: `Negative budget allocation: $${budget.allocated}`,
            recordId: budget._id.toString(),
            recordType: 'Budget',
            suggestedFix: 'Ensure budget allocation is positive'
          });
        }

        // Validate spent amount
        if (budget.spent < 0) {
          result.issues.push({
            severity: 'high',
            category: 'budget_spent',
            message: `Negative spent amount: $${budget.spent}`,
            recordId: budget._id.toString(),
            recordType: 'Budget',
            suggestedFix: 'Ensure spent amount is positive'
          });
        }

        // Validate spent vs allocated
        if (budget.spent > budget.allocated * 1.2) { // Allow 20% over budget
          result.warnings.push({
            category: 'budget_overspend',
            message: `Budget overspent: $${budget.spent} of $${budget.allocated} allocated`,
            recordId: budget._id.toString(),
            recordType: 'Budget'
          });
        }

        // Validate category
        if (!budget.category) {
          result.issues.push({
            severity: 'medium',
            category: 'budget_category',
            message: 'Budget missing category',
            recordId: budget._id.toString(),
            recordType: 'Budget',
            suggestedFix: 'Add budget category'
          });
        }
      }

    } catch (error) {
      result.issues.push({
        severity: 'medium',
        category: 'budget_validation',
        message: `Failed to validate budgets: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recordType: 'Budget'
      });
    }
  }

  /**
   * Validate goals
   */
  private static async validateGoals(userId: mongoose.Types.ObjectId, result: ValidationResult): Promise<void> {
    try {
      const goals = await Goal.find({ userId });

      for (const goal of goals) {
        // Validate target amount
        if (goal.targetAmount <= 0) {
          result.issues.push({
            severity: 'high',
            category: 'goal_target',
            message: `Invalid target amount: $${goal.targetAmount}`,
            recordId: goal._id.toString(),
            recordType: 'Goal',
            suggestedFix: 'Ensure target amount is positive'
          });
        }

        // Validate current amount
        if (goal.currentAmount < 0) {
          result.issues.push({
            severity: 'high',
            category: 'goal_current',
            message: `Negative current amount: $${goal.currentAmount}`,
            recordId: goal._id.toString(),
            recordType: 'Goal',
            suggestedFix: 'Ensure current amount is positive'
          });
        }

        // Validate current vs target
        if (goal.currentAmount > goal.targetAmount && !goal.isCompleted) {
          result.issues.push({
            severity: 'medium',
            category: 'goal_completion',
            message: `Goal exceeded target but not marked complete: $${goal.currentAmount} of $${goal.targetAmount}`,
            recordId: goal._id.toString(),
            recordType: 'Goal',
            suggestedFix: 'Mark goal as completed or adjust amounts'
          });
        }

        // Validate target date
        if (goal.targetDate && new Date(goal.targetDate) < new Date()) {
          if (!goal.isCompleted) {
            result.warnings.push({
              category: 'goal_overdue',
              message: `Goal overdue: ${goal.title}`,
              recordId: goal._id.toString(),
              recordType: 'Goal'
            });
          }
        }

        // Validate completion status
        if (goal.isCompleted && !goal.completedAt) {
          result.issues.push({
            severity: 'medium',
            category: 'goal_completion',
            message: 'Goal marked complete but no completion date',
            recordId: goal._id.toString(),
            recordType: 'Goal',
            suggestedFix: 'Add completion date'
          });
        }
      }

    } catch (error) {
      result.issues.push({
        severity: 'medium',
        category: 'goal_validation',
        message: `Failed to validate goals: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recordType: 'Goal'
      });
    }
  }

  /**
   * Validate physical assets
   */
  private static async validatePhysicalAssets(userId: mongoose.Types.ObjectId, result: ValidationResult): Promise<void> {
    try {
      const assets = await PhysicalAsset.find({ userId });

      for (const asset of assets) {
        // Validate current value
        if (asset.currentValue < 0) {
          result.issues.push({
            severity: 'high',
            category: 'asset_value',
            message: `Negative asset value: $${asset.currentValue}`,
            recordId: asset._id.toString(),
            recordType: 'PhysicalAsset',
            suggestedFix: 'Ensure asset value is positive'
          });
        }

        // Validate purchase price
        if (asset.purchasePrice < 0) {
          result.issues.push({
            severity: 'high',
            category: 'asset_purchase',
            message: `Negative purchase price: $${asset.purchasePrice}`,
            recordId: asset._id.toString(),
            recordType: 'PhysicalAsset',
            suggestedFix: 'Ensure purchase price is positive'
          });
        }

        // Validate equity calculation
        const calculatedEquity = asset.currentValue - (asset.loanInfo?.loanBalance || 0);
        if (Math.abs(calculatedEquity - asset.equity) > 0.01) {
          result.issues.push({
            severity: 'medium',
            category: 'asset_calculation',
            message: `Equity calculation mismatch: calculated $${calculatedEquity.toFixed(2)}, stored $${asset.equity.toFixed(2)}`,
            recordId: asset._id.toString(),
            recordType: 'PhysicalAsset',
            suggestedFix: 'Recalculate equity'
          });
        }

        // Validate depreciation rate
        if (asset.depreciationRate < 0 || asset.depreciationRate > 1) {
          result.issues.push({
            severity: 'medium',
            category: 'asset_depreciation',
            message: `Invalid depreciation rate: ${asset.depreciationRate}`,
            recordId: asset._id.toString(),
            recordType: 'PhysicalAsset',
            suggestedFix: 'Ensure depreciation rate is between 0-1'
          });
        }
      }

    } catch (error) {
      result.issues.push({
        severity: 'medium',
        category: 'asset_validation',
        message: `Failed to validate physical assets: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recordType: 'PhysicalAsset'
      });
    }
  }

  /**
   * Validate net worth calculations
   */
  private static async validateNetWorthCalculations(userId: mongoose.Types.ObjectId, result: ValidationResult): Promise<void> {
    try {
      const calculatedNetWorth = await NetWorthCalculator.getCurrentNetWorth(userId);
      
      // Validate net worth is a number
      if (isNaN(calculatedNetWorth.netWorth)) {
        result.issues.push({
          severity: 'critical',
          category: 'networth_calculation',
          message: 'Net worth calculation returned NaN',
          suggestedFix: 'Check all financial data for invalid values'
        });
        return;
      }

      // Validate breakdown components
      const breakdown = calculatedNetWorth.breakdown;
      if (breakdown.liquidAssets < 0 || breakdown.portfolioValue < 0 || breakdown.physicalAssets < 0) {
        result.issues.push({
          severity: 'high',
          category: 'networth_breakdown',
          message: 'Negative values in net worth breakdown',
          suggestedFix: 'Check account balances and asset values'
        });
      }

      // Validate net worth milestone consistency
      const latestMilestone = await NetWorthMilestone.findOne({ userId }).sort({ date: -1 });
      if (latestMilestone) {
        const milestoneNetWorth = latestMilestone.netWorth;
        const difference = Math.abs(calculatedNetWorth.netWorth - milestoneNetWorth);
        
        if (difference > 1000) { // Allow $1000 difference
          result.warnings.push({
            category: 'networth_consistency',
            message: `Net worth mismatch: calculated $${calculatedNetWorth.netWorth.toFixed(2)}, milestone $${milestoneNetWorth.toFixed(2)}`
          });
        }
      }

    } catch (error) {
      result.issues.push({
        severity: 'critical',
        category: 'networth_validation',
        message: `Failed to validate net worth: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestedFix: 'Check financial data integrity'
      });
    }
  }

  /**
   * Validate historical data
   */
  private static async validateHistoricalData(userId: mongoose.Types.ObjectId, result: ValidationResult): Promise<void> {
    try {
      // Validate net worth milestones
      const milestones = await NetWorthMilestone.find({ userId }).sort({ date: 1 });
      
      for (let i = 1; i < milestones.length; i++) {
        const prev = milestones[i - 1];
        const current = milestones[i];
        
        // Check for reasonable growth (not more than 50% per month)
        const timeDiff = current.date.getTime() - prev.date.getTime();
        const monthsDiff = timeDiff / (1000 * 60 * 60 * 24 * 30);
        
        if (monthsDiff > 0) {
          const growthRate = (current.netWorth - prev.netWorth) / prev.netWorth;
          const monthlyGrowth = growthRate / monthsDiff;
          
          if (monthlyGrowth > 0.5) { // 50% monthly growth
            result.warnings.push({
              category: 'historical_growth',
              message: `Unrealistic monthly growth: ${(monthlyGrowth * 100).toFixed(1)}%`,
              recordId: current._id.toString(),
              recordType: 'NetWorthMilestone'
            });
          }
        }
      }

      // Validate account balance history
      const balanceHistory = await AccountBalanceHistory.find({ userId }).sort({ date: 1 });
      
      for (let i = 1; i < balanceHistory.length; i++) {
        const prev = balanceHistory[i - 1];
        const current = balanceHistory[i];
        
        // Check for reasonable balance changes (not more than $10,000 per day)
        const balanceChange = Math.abs(current.balance - prev.balance);
        
        if (balanceChange > 10000) {
          result.warnings.push({
            category: 'balance_volatility',
            message: `Large daily balance change: $${balanceChange.toFixed(2)}`,
            recordId: current._id.toString(),
            recordType: 'AccountBalanceHistory'
          });
        }
      }

    } catch (error) {
      result.issues.push({
        severity: 'medium',
        category: 'historical_validation',
        message: `Failed to validate historical data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recordType: 'HistoricalData'
      });
    }
  }

  /**
   * Validate transaction patterns
   */
  private static async validateTransactionPatterns(userId: mongoose.Types.ObjectId, result: ValidationResult): Promise<void> {
    try {
      const transactions = await Transaction.find({ userId }).sort({ date: 1 });
      
      if (transactions.length === 0) {
        result.warnings.push({
          category: 'transaction_patterns',
          message: 'No transactions found for user'
        });
        return;
      }

      // Check for duplicate transactions
      const transactionHashes = new Set();
      for (const transaction of transactions) {
        const hash = `${transaction.transactionInfo.date.getTime()}_${transaction.transactionInfo.amount}_${transaction.transactionInfo.description}`;
        if (transactionHashes.has(hash)) {
          result.issues.push({
            severity: 'medium',
            category: 'transaction_duplicates',
            message: 'Duplicate transaction found',
            recordId: transaction._id.toString(),
            recordType: 'Transaction',
            suggestedFix: 'Remove duplicate transaction'
          });
        }
        transactionHashes.add(hash);
      }

      // Check for unrealistic transaction amounts
      for (const transaction of transactions) {
        if (Math.abs(transaction.transactionInfo.amount) > 100000) { // $100,000
          result.warnings.push({
            category: 'transaction_amounts',
            message: `Large transaction amount: $${transaction.transactionInfo.amount.toFixed(2)}`,
            recordId: transaction._id.toString(),
            recordType: 'Transaction'
          });
        }
      }

    } catch (error) {
      result.issues.push({
        severity: 'medium',
        category: 'transaction_validation',
        message: `Failed to validate transaction patterns: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recordType: 'Transaction'
      });
    }
  }

  /**
   * Calculate validation score
   */
  private static calculateValidationScore(result: ValidationResult): number {
    let score = 100;
    
    // Deduct points for issues
    for (const issue of result.issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }
    
    // Deduct points for warnings (less severe)
    score -= result.warnings.length * 1;
    
    return Math.max(0, score);
  }
}

export default PersonaDataValidator;
