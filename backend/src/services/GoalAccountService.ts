import mongoose from 'mongoose';
import { Goal } from '../models/Goal';
import { Account } from '../models/Account';
import { AccountBalanceHistoryService } from './AccountBalanceHistoryService';
import { logger } from '../utils/logger';

export interface GoalAccountAllocation {
  accountId: mongoose.Types.ObjectId;
  allocatedAmount: number;
  lastUpdated: Date;
}

export interface GoalAccountLinkResult {
  success: boolean;
  goal: any;
  account: any;
  allocatedAmount: number;
  message: string;
}

export class GoalAccountService {
  /**
   * Link a goal to a specific account with allocated amount
   */
  static async linkGoalToAccount(
    goalId: mongoose.Types.ObjectId,
    accountId: mongoose.Types.ObjectId,
    allocatedAmount: number,
    description?: string
  ): Promise<GoalAccountLinkResult> {
    try {
      const goal = await Goal.findById(goalId);
      const account = await Account.findById(accountId);

      if (!goal) {
        throw new Error(`Goal ${goalId} not found`);
      }
      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }

      // Check if account has sufficient balance
      if (account.accountInfo.balance < allocatedAmount) {
        throw new Error(`Insufficient balance in account. Available: $${account.accountInfo.balance}, Requested: $${allocatedAmount}`);
      }

      // Update goal with account backing
      goal.linkedAccountId = accountId;
      goal.isAccountBacked = true;
      
      // Add or update allocation
      if (!goal.allocatedAccounts) {
        goal.allocatedAccounts = [];
      }

      const existingAllocation = goal.allocatedAccounts.find(
        (allocation: GoalAccountAllocation) => allocation.accountId.toString() === accountId.toString()
      );

      if (existingAllocation) {
        existingAllocation.allocatedAmount = allocatedAmount;
        existingAllocation.lastUpdated = new Date();
      } else {
        goal.allocatedAccounts.push({
          accountId,
          allocatedAmount,
          lastUpdated: new Date()
        });
      }

      // Update current amount to match allocated amount
      goal.currentAmount = allocatedAmount;

      await goal.save();

      // Record balance change
      await AccountBalanceHistoryService.recordGoalBalanceChange(
        goalId,
        accountId,
        goal.userId,
        allocatedAmount,
        true, // isAllocation
        description || `Allocated to goal: ${goal.title}`
      );

      logger.info(`✅ Goal "${goal.title}" linked to account "${account.accountInfo.name}" with $${allocatedAmount}`);

      return {
        success: true,
        goal,
        account,
        allocatedAmount,
        message: `Successfully allocated $${allocatedAmount} from ${account.accountInfo.name} to ${goal.title}`
      };

    } catch (error) {
      logger.error('Error linking goal to account:', error);
      return {
        success: false,
        goal: null,
        account: null,
        allocatedAmount: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Sync goal progress with real account balances
   */
  static async syncGoalProgress(goalId: mongoose.Types.ObjectId): Promise<{
    success: boolean;
    previousAmount: number;
    newAmount: number;
    variance: number;
    message: string;
  }> {
    try {
      const goal = await Goal.findById(goalId).populate('allocatedAccounts.accountId');
      
      if (!goal) {
        throw new Error(`Goal ${goalId} not found`);
      }

      if (!goal.isAccountBacked || !goal.allocatedAccounts || goal.allocatedAccounts.length === 0) {
        return {
          success: false,
          previousAmount: goal.currentAmount,
          newAmount: goal.currentAmount,
          variance: 0,
          message: 'Goal is not account-backed or has no allocations'
        };
      }

      const previousAmount = goal.currentAmount;
      let newAmount = 0;

      // Calculate total from all allocated accounts
      for (const allocation of goal.allocatedAccounts) {
        const account = await Account.findById(allocation.accountId);
        if (account) {
          newAmount += allocation.allocatedAmount;
        }
      }

      const variance = newAmount - previousAmount;

      // Update goal if there's a significant change
      if (Math.abs(variance) > 0.01) {
        goal.currentAmount = newAmount;
        await goal.save();

        logger.info(`🔄 Synced goal "${goal.title}": ${previousAmount} → ${newAmount} (variance: ${variance})`);
      }

      return {
        success: true,
        previousAmount,
        newAmount,
        variance,
        message: `Goal progress synced. Previous: $${previousAmount}, New: $${newAmount}, Variance: $${variance}`
      };

    } catch (error) {
      logger.error('Error syncing goal progress:', error);
      return {
        success: false,
        previousAmount: 0,
        newAmount: 0,
        variance: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Allocate money from account to goal
   */
  static async allocateToGoal(
    accountId: mongoose.Types.ObjectId,
    goalId: mongoose.Types.ObjectId,
    amount: number,
    description?: string
  ): Promise<GoalAccountLinkResult> {
    try {
      const account = await Account.findById(accountId);
      const goal = await Goal.findById(goalId);

      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }
      if (!goal) {
        throw new Error(`Goal ${goalId} not found`);
      }

      // Check if account has sufficient balance
      if (account.accountInfo.balance < amount) {
        throw new Error(`Insufficient balance in account. Available: $${account.accountInfo.balance}, Requested: $${amount}`);
      }

      // Update goal allocation
      if (!goal.allocatedAccounts) {
        goal.allocatedAccounts = [];
      }

      const existingAllocation = goal.allocatedAccounts.find(
        (allocation: GoalAccountAllocation) => allocation.accountId.toString() === accountId.toString()
      );

      if (existingAllocation) {
        existingAllocation.allocatedAmount += amount;
        existingAllocation.lastUpdated = new Date();
      } else {
        goal.allocatedAccounts.push({
          accountId,
          allocatedAmount: amount,
          lastUpdated: new Date()
        });
      }

      goal.linkedAccountId = accountId;
      goal.isAccountBacked = true;
      goal.currentAmount += amount;

      await goal.save();

      // Record balance change
      await AccountBalanceHistoryService.recordGoalBalanceChange(
        goalId,
        accountId,
        goal.userId,
        amount,
        true, // isAllocation
        description || `Allocated to goal: ${goal.title}`
      );

      logger.info(`💰 Allocated $${amount} from ${account.accountInfo.name} to goal "${goal.title}"`);

      return {
        success: true,
        goal,
        account,
        allocatedAmount: amount,
        message: `Successfully allocated $${amount} from ${account.accountInfo.name} to ${goal.title}`
      };

    } catch (error) {
      logger.error('Error allocating to goal:', error);
      return {
        success: false,
        goal: null,
        account: null,
        allocatedAmount: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Withdraw money from goal back to account
   */
  static async withdrawFromGoal(
    goalId: mongoose.Types.ObjectId,
    accountId: mongoose.Types.ObjectId,
    amount: number,
    description?: string
  ): Promise<GoalAccountLinkResult> {
    try {
      const goal = await Goal.findById(goalId);
      const account = await Account.findById(accountId);

      if (!goal) {
        throw new Error(`Goal ${goalId} not found`);
      }
      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }

      // Check if goal has sufficient allocation
      const allocation = goal.allocatedAccounts?.find(
        (allocation: GoalAccountAllocation) => allocation.accountId.toString() === accountId.toString()
      );

      if (!allocation || allocation.allocatedAmount < amount) {
        throw new Error(`Insufficient allocation in goal. Available: $${allocation?.allocatedAmount || 0}, Requested: $${amount}`);
      }

      // Update goal allocation
      allocation.allocatedAmount -= amount;
      allocation.lastUpdated = new Date();
      goal.currentAmount -= amount;

      // Remove allocation if it becomes zero
      if (allocation.allocatedAmount <= 0) {
        goal.allocatedAccounts = goal.allocatedAccounts?.filter(
          (allocation: GoalAccountAllocation) => allocation.accountId.toString() !== accountId.toString()
        );
      }

      // Update account backing status
      if (!goal.allocatedAccounts || goal.allocatedAccounts.length === 0) {
        goal.isAccountBacked = false;
        goal.linkedAccountId = undefined;
      }

      await goal.save();

      // Record balance change
      await AccountBalanceHistoryService.recordGoalBalanceChange(
        goalId,
        accountId,
        goal.userId,
        amount,
        false, // isAllocation (withdrawal)
        description || `Withdrawn from goal: ${goal.title}`
      );

      logger.info(`💸 Withdrew $${amount} from goal "${goal.title}" to ${account.accountInfo.name}`);

      return {
        success: true,
        goal,
        account,
        allocatedAmount: amount,
        message: `Successfully withdrew $${amount} from ${goal.title} to ${account.accountInfo.name}`
      };

    } catch (error) {
      logger.error('Error withdrawing from goal:', error);
      return {
        success: false,
        goal: null,
        account: null,
        allocatedAmount: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get net worth impact of goals for a user
   */
  static async getGoalNetWorthImpact(userId: mongoose.Types.ObjectId): Promise<{
    totalAllocated: number;
    totalAvailable: number;
    goalBreakdown: Array<{
      goalId: mongoose.Types.ObjectId;
      goalTitle: string;
      allocatedAmount: number;
      accountName: string;
    }>;
  }> {
    try {
      const goals = await Goal.find({ userId, isActive: true, isAccountBacked: true })
        .populate('allocatedAccounts.accountId');

      let totalAllocated = 0;
      const goalBreakdown: Array<{
        goalId: mongoose.Types.ObjectId;
        goalTitle: string;
        allocatedAmount: number;
        accountName: string;
      }> = [];

      for (const goal of goals) {
        if (goal.allocatedAccounts && goal.allocatedAccounts.length > 0) {
          for (const allocation of goal.allocatedAccounts) {
            const account = await Account.findById(allocation.accountId);
            if (account) {
              totalAllocated += allocation.allocatedAmount;
              goalBreakdown.push({
                goalId: goal._id as mongoose.Types.ObjectId,
                goalTitle: goal.title,
                allocatedAmount: allocation.allocatedAmount,
                accountName: account.accountInfo.name
              });
            }
          }
        }
      }

      // Calculate total available (this would need to be calculated from account balances)
      const accounts = await Account.find({ userId, isActive: true });
      const totalAccountBalances = accounts.reduce((sum, account) => sum + account.accountInfo.balance, 0);
      const totalAvailable = totalAccountBalances - totalAllocated;

      return {
        totalAllocated,
        totalAvailable,
        goalBreakdown
      };

    } catch (error) {
      logger.error('Error getting goal net worth impact:', error);
      throw error;
    }
  }

  /**
   * Get all account-backed goals for a user
   */
  static async getAccountBackedGoals(userId: mongoose.Types.ObjectId): Promise<any[]> {
    try {
      return await Goal.find({ 
        userId, 
        isActive: true, 
        isAccountBacked: true 
      }).populate('allocatedAccounts.accountId');
    } catch (error) {
      logger.error('Error getting account-backed goals:', error);
      throw error;
    }
  }

  /**
   * Sync all goals for a user
   */
  static async syncAllGoals(userId: mongoose.Types.ObjectId): Promise<{
    totalGoals: number;
    syncedGoals: number;
    errors: string[];
  }> {
    try {
      const goals = await Goal.find({ userId, isActive: true, isAccountBacked: true });
      let syncedGoals = 0;
      const errors: string[] = [];

      for (const goal of goals) {
        try {
          const result = await this.syncGoalProgress(goal._id as mongoose.Types.ObjectId);
          if (result.success) {
            syncedGoals++;
          } else {
            errors.push(`Goal ${goal.title}: ${result.message}`);
          }
        } catch (error) {
          errors.push(`Goal ${goal.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      logger.info(`🔄 Synced ${syncedGoals}/${goals.length} goals for user ${userId}`);

      return {
        totalGoals: goals.length,
        syncedGoals,
        errors
      };

    } catch (error) {
      logger.error('Error syncing all goals:', error);
      throw error;
    }
  }
}
