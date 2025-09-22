import mongoose from 'mongoose';
import { AccountBalanceHistory } from '../models/AccountBalanceHistory';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { Goal } from '../models/Goal';
import { logger } from '../utils/logger';

export interface BalanceChangeData {
  accountId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  newBalance: number;
  changeType: 'manual_update' | 'transaction_link' | 'interest' | 'fee' | 'initial' | 'goal_allocation' | 'goal_withdrawal';
  changeAmount: number;
  description?: string;
  transactionId?: mongoose.Types.ObjectId;
  goalId?: mongoose.Types.ObjectId;
  metadata?: {
    interestRate?: number;
    feeType?: string;
    source?: string;
  };
}

export interface BalanceTrendData {
  date: Date;
  balance: number;
  changeAmount: number;
  changeType: string;
  description?: string;
}

export class AccountBalanceHistoryService {
  /**
   * Record a balance change for an account
   */
  static async recordBalanceChange(data: BalanceChangeData): Promise<void> {
    try {
      const account = await Account.findById(data.accountId);
      if (!account) {
        throw new Error(`Account ${data.accountId} not found`);
      }

      const previousBalance = account.accountInfo.balance;
      
      // Create balance history record
      const balanceHistory = new AccountBalanceHistory({
        accountId: data.accountId,
        userId: data.userId,
        date: new Date(),
        balance: data.newBalance,
        changeType: data.changeType,
        changeAmount: data.changeAmount,
        previousBalance,
        description: data.description,
        transactionId: data.transactionId,
        goalId: data.goalId,
        metadata: data.metadata
      });

      await balanceHistory.save();

      // Update account balance
      account.accountInfo.balance = data.newBalance;
      account.accountInfo.lastSyncedAt = new Date();
      await account.save();

      logger.info(`Balance change recorded for account ${data.accountId}: ${previousBalance} → ${data.newBalance} (${data.changeType})`);

    } catch (error) {
      logger.error('Error recording balance change:', error);
      throw error;
    }
  }

  /**
   * Record initial balance when account is created
   */
  static async recordInitialBalance(
    accountId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    initialBalance: number
  ): Promise<void> {
    await this.recordBalanceChange({
      accountId,
      userId,
      newBalance: initialBalance,
      changeType: 'initial',
      changeAmount: initialBalance,
      description: 'Initial account balance'
    });
  }

  /**
   * Record balance change due to transaction
   */
  static async recordTransactionBalanceChange(
    transactionId: mongoose.Types.ObjectId,
    accountId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    transactionAmount: number,
    newBalance: number,
    description?: string
  ): Promise<void> {
    await this.recordBalanceChange({
      accountId,
      userId,
      newBalance,
      changeType: 'transaction_link',
      changeAmount: transactionAmount,
      description: description || 'Transaction processed',
      transactionId
    });
  }

  /**
   * Record goal allocation/withdrawal
   */
  static async recordGoalBalanceChange(
    goalId: mongoose.Types.ObjectId,
    accountId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    amount: number,
    isAllocation: boolean,
    description?: string
  ): Promise<void> {
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const currentBalance = account.accountInfo.balance;
    const newBalance = isAllocation 
      ? currentBalance - amount  // Allocating to goal reduces available balance
      : currentBalance + amount; // Withdrawing from goal increases available balance

    await this.recordBalanceChange({
      accountId,
      userId,
      newBalance,
      changeType: isAllocation ? 'goal_allocation' : 'goal_withdrawal',
      changeAmount: isAllocation ? -amount : amount,
      description: description || (isAllocation ? 'Allocated to goal' : 'Withdrawn from goal'),
      goalId
    });
  }

  /**
   * Record interest earned
   */
  static async recordInterestEarned(
    accountId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    interestAmount: number,
    interestRate: number,
    description?: string
  ): Promise<void> {
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const newBalance = account.accountInfo.balance + interestAmount;

    await this.recordBalanceChange({
      accountId,
      userId,
      newBalance,
      changeType: 'interest',
      changeAmount: interestAmount,
      description: description || `Interest earned at ${interestRate}%`,
      metadata: { interestRate }
    });
  }

  /**
   * Record fee charged
   */
  static async recordFeeCharged(
    accountId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    feeAmount: number,
    feeType: string,
    description?: string
  ): Promise<void> {
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const newBalance = account.accountInfo.balance - feeAmount;

    await this.recordBalanceChange({
      accountId,
      userId,
      newBalance,
      changeType: 'fee',
      changeAmount: -feeAmount,
      description: description || `Fee charged: ${feeType}`,
      metadata: { feeType }
    });
  }

  /**
   * Get balance history for an account
   */
  static async getAccountHistory(
    accountId: mongoose.Types.ObjectId,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<BalanceTrendData[]> {
    try {
      const query: any = { accountId };
      
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }

      const history = await AccountBalanceHistory.find(query)
        .sort({ date: -1 })
        .limit(limit)
        .select('date balance changeAmount changeType description');

      return history.map(record => ({
        date: record.date,
        balance: record.balance,
        changeAmount: record.changeAmount,
        changeType: record.changeType,
        description: record.description
      }));

    } catch (error) {
      logger.error('Error getting account history:', error);
      throw error;
    }
  }

  /**
   * Get balance trend for an account over time
   */
  static async getBalanceTrend(
    accountId: mongoose.Types.ObjectId,
    days: number = 30
  ): Promise<BalanceTrendData[]> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const history = await AccountBalanceHistory.find({
        accountId,
        date: { $gte: startDate }
      })
      .sort({ date: 1 })
      .select('date balance changeAmount changeType description');

      return history.map(record => ({
        date: record.date,
        balance: record.balance,
        changeAmount: record.changeAmount,
        changeType: record.changeType,
        description: record.description
      }));

    } catch (error) {
      logger.error('Error getting balance trend:', error);
      throw error;
    }
  }

  /**
   * Get total interest earned for a user
   */
  static async getTotalInterestEarned(
    userId: mongoose.Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      const query: any = { 
        userId, 
        changeType: 'interest' 
      };
      
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }

      const result = await AccountBalanceHistory.aggregate([
        { $match: query },
        { $group: { _id: null, totalInterest: { $sum: '$changeAmount' } } }
      ]);

      return result.length > 0 ? result[0].totalInterest : 0;

    } catch (error) {
      logger.error('Error getting total interest earned:', error);
      throw error;
    }
  }

  /**
   * Get total fees charged for a user
   */
  static async getTotalFeesCharged(
    userId: mongoose.Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      const query: any = { 
        userId, 
        changeType: 'fee' 
      };
      
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }

      const result = await AccountBalanceHistory.aggregate([
        { $match: query },
        { $group: { _id: null, totalFees: { $sum: { $abs: '$changeAmount' } } } }
      ]);

      return result.length > 0 ? result[0].totalFees : 0;

    } catch (error) {
      logger.error('Error getting total fees charged:', error);
      throw error;
    }
  }

  /**
   * Reconcile account balance with transaction history
   */
  static async reconcileAccountBalance(accountId: mongoose.Types.ObjectId): Promise<{
    isReconciled: boolean;
    expectedBalance: number;
    actualBalance: number;
    discrepancy: number;
    lastTransactionDate?: Date;
  }> {
    try {
      const account = await Account.findById(accountId);
      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }

      // Get all transactions for this account
      const transactions = await Transaction.find({ accountId })
        .sort({ date: 1 });

      // Calculate expected balance from transactions
      let expectedBalance = 0;
      let lastTransactionDate: Date | undefined;

      for (const transaction of transactions) {
        const amount = transaction.transactionInfo?.amount || 0;
        const type = transaction.transactionInfo?.type || 'expense';
        
        if (type === 'income') {
          expectedBalance += amount;
        } else {
          expectedBalance -= amount;
        }
        
        lastTransactionDate = transaction.transactionInfo.date;
      }

      const actualBalance = account.accountInfo.balance;
      const discrepancy = Math.abs(expectedBalance - actualBalance);
      const isReconciled = discrepancy < 0.01; // Allow for rounding errors

      return {
        isReconciled,
        expectedBalance,
        actualBalance,
        discrepancy,
        lastTransactionDate
      };

    } catch (error) {
      logger.error('Error reconciling account balance:', error);
      throw error;
    }
  }

  /**
   * Generate balance history for persona data
   */
  static async generatePersonaBalanceHistory(
    userId: mongoose.Types.ObjectId,
    accountId: mongoose.Types.ObjectId,
    startDate: Date,
    endDate: Date,
    initialBalance: number,
    transactionPatterns: any[]
  ): Promise<void> {
    try {
      let currentBalance = initialBalance;
      const currentDate = new Date(startDate);

      // Record initial balance
      await this.recordInitialBalance(accountId, userId, initialBalance);

      // Generate balance changes based on transaction patterns
      while (currentDate <= endDate) {
        // Simulate daily balance changes
        const dailyChange = this.generateDailyBalanceChange(transactionPatterns, currentDate);
        
        if (Math.abs(dailyChange) > 0.01) {
          currentBalance += dailyChange;
          
          await this.recordBalanceChange({
            accountId,
            userId,
            newBalance: currentBalance,
            changeType: 'transaction_link',
            changeAmount: dailyChange,
            description: `Daily balance change: ${dailyChange > 0 ? '+' : ''}$${dailyChange.toFixed(2)}`
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      logger.info(`Generated balance history for account ${accountId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    } catch (error) {
      logger.error('Error generating persona balance history:', error);
      throw error;
    }
  }

  /**
   * Generate realistic daily balance change based on transaction patterns
   */
  private static generateDailyBalanceChange(transactionPatterns: any[], date: Date): number {
    let dailyChange = 0;

    for (const pattern of transactionPatterns) {
      // Check if this pattern applies to this date
      if (this.shouldApplyPattern(pattern, date)) {
        const amount = pattern.amount || 0;
        const type = pattern.type || 'expense';
        
        if (type === 'income') {
          dailyChange += amount;
        } else {
          dailyChange -= amount;
        }
      }
    }

    // Add some random variation
    const variation = (Math.random() - 0.5) * 100; // ±$50 random variation
    dailyChange += variation;

    return Math.round(dailyChange * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check if a transaction pattern should apply to a given date
   */
  private static shouldApplyPattern(pattern: any, date: Date): boolean {
    // Simple implementation - can be enhanced with more complex logic
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();

    // Weekly patterns
    if (pattern.frequency === 'weekly' && pattern.dayOfWeek === dayOfWeek) {
      return true;
    }

    // Monthly patterns
    if (pattern.frequency === 'monthly' && pattern.dayOfMonth === dayOfMonth) {
      return true;
    }

    // Daily patterns (with some randomness)
    if (pattern.frequency === 'daily' && Math.random() < 0.3) {
      return true;
    }

    return false;
  }
}
