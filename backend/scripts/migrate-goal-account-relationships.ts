import mongoose from 'mongoose';
import { config } from 'dotenv';
import { logger } from '../src/utils/logger';
import { Goal } from '../src/models/Goal';
import { Account } from '../src/models/Account';
import { GoalAccountService } from '../src/services/GoalAccountService';
import { AccountBalanceHistoryService } from '../src/services/AccountBalanceHistoryService';

// Load environment variables
config();

export interface MigrationResult {
  success: boolean;
  totalGoals: number;
  migratedGoals: number;
  errors: string[];
  processingTime: number;
}

export class GoalAccountMigration {
  /**
   * Migrate existing goals to account-backed goals
   */
  static async migrateGoalAccountRelationships(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      totalGoals: 0,
      migratedGoals: 0,
      errors: [],
      processingTime: 0
    };

    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/weathwise');
      logger.info('🔗 Connected to MongoDB');

      // Get all goals that need migration
      const goals = await Goal.find({ 
        isActive: true,
        $or: [
          { isAccountBacked: { $exists: false } },
          { isAccountBacked: false },
          { allocatedAccounts: { $exists: false } }
        ]
      });

      result.totalGoals = goals.length;
      logger.info(`📊 Found ${goals.length} goals to migrate`);

      for (const goal of goals) {
        try {
          await this.migrateSingleGoal(goal);
          result.migratedGoals++;
          logger.info(`✅ Migrated goal: ${goal.title}`);
        } catch (error) {
          const errorMsg = `Failed to migrate goal "${goal.title}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          logger.error(`❌ ${errorMsg}`);
        }
      }

      result.success = result.errors.length === 0;
      result.processingTime = Date.now() - startTime;

      logger.info(`🎉 Migration completed: ${result.migratedGoals}/${result.totalGoals} goals migrated`);
      logger.info(`⏱️ Processing time: ${result.processingTime}ms`);

      if (result.errors.length > 0) {
        logger.warn(`⚠️ ${result.errors.length} errors occurred during migration`);
      }

      return result;

    } catch (error) {
      logger.error('❌ Migration failed:', error);
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.processingTime = Date.now() - startTime;
      return result;
    } finally {
      await mongoose.disconnect();
      logger.info('🔌 Disconnected from MongoDB');
    }
  }

  /**
   * Migrate a single goal to account-backed
   */
  private static async migrateSingleGoal(goal: any): Promise<void> {
    // Find appropriate account for this goal
    const account = await this.findBestAccountForGoal(goal);
    
    if (!account) {
      throw new Error('No suitable account found for goal');
    }

    // Check if account has sufficient balance
    const availableBalance = account.accountInfo.balance;
    const goalAmount = Math.min(goal.currentAmount, availableBalance * 0.8); // Use max 80% of account balance

    if (goalAmount <= 0) {
      throw new Error('Insufficient account balance for goal allocation');
    }

    // Update goal with account backing
    goal.linkedAccountId = account._id;
    goal.isAccountBacked = true;
    goal.allocatedAccounts = [{
      accountId: account._id,
      allocatedAmount: goalAmount,
      lastUpdated: new Date()
    }];

    await goal.save();

    // Record balance history
    await AccountBalanceHistoryService.recordGoalBalanceChange(
      goal._id,
      account._id,
      goal.userId,
      goalAmount,
      true, // isAllocation
      `Migration: Allocated to goal "${goal.title}"`
    );
  }

  /**
   * Find the best account for a goal based on goal category and account type
   */
  private static async findBestAccountForGoal(goal: any): Promise<any> {
    const userId = goal.userId;
    
    // Get all active accounts for the user
    const accounts = await Account.find({ userId, isActive: true });
    
    if (accounts.length === 0) {
      return null;
    }

    // Define account preferences by goal category
    const accountPreferences = {
      'Emergency Fund': ['savings'],
      'Vacation': ['savings', 'checking'],
      'Home Purchase': ['savings'],
      'Car Purchase': ['savings', 'checking'],
      'Education': ['savings'],
      'Retirement': ['retirement', 'investment'],
      'Wedding': ['savings'],
      'Business': ['checking', 'savings'],
      'Investment': ['investment', 'retirement'],
      'Other': ['savings', 'checking']
    };

    const preferredTypes = accountPreferences[goal.category as keyof typeof accountPreferences] || ['savings', 'checking'];

    // Find accounts matching preferred types
    const preferredAccounts = accounts.filter(acc => preferredTypes.includes(acc.type));
    
    if (preferredAccounts.length > 0) {
      // Return account with highest balance
      return preferredAccounts.reduce((best, current) => 
        current.accountInfo.balance > best.accountInfo.balance ? current : best
      );
    }

    // Fallback to any account with sufficient balance
    const accountsWithBalance = accounts.filter(acc => acc.accountInfo.balance > 0);
    
    if (accountsWithBalance.length > 0) {
      return accountsWithBalance.reduce((best, current) => 
        current.accountInfo.balance > best.accountInfo.balance ? current : best
      );
    }

    return null;
  }

  /**
   * Validate migration results
   */
  static async validateMigration(): Promise<{
    isValid: boolean;
    issues: string[];
    stats: {
      totalGoals: number;
      accountBackedGoals: number;
      goalsWithAllocations: number;
      totalAllocatedAmount: number;
    };
  }> {
    try {
      const goals = await Goal.find({ isActive: true });
      const accountBackedGoals = await Goal.find({ isActive: true, isAccountBacked: true });
      const goalsWithAllocations = await Goal.find({ 
        isActive: true, 
        'allocatedAccounts.0': { $exists: true } 
      });

      let totalAllocatedAmount = 0;
      for (const goal of goalsWithAllocations) {
        if (goal.allocatedAccounts) {
          for (const allocation of goal.allocatedAccounts) {
            totalAllocatedAmount += allocation.allocatedAmount;
          }
        }
      }

      const issues: string[] = [];
      
      // Check for goals without account backing
      const goalsWithoutBacking = goals.filter(goal => !goal.isAccountBacked);
      if (goalsWithoutBacking.length > 0) {
        issues.push(`${goalsWithoutBacking.length} goals are not account-backed`);
      }

      // Check for account-backed goals without allocations
      const backedGoalsWithoutAllocations = accountBackedGoals.filter(goal => 
        !goal.allocatedAccounts || goal.allocatedAccounts.length === 0
      );
      if (backedGoalsWithoutAllocations.length > 0) {
        issues.push(`${backedGoalsWithoutAllocations.length} account-backed goals have no allocations`);
      }

      return {
        isValid: issues.length === 0,
        issues,
        stats: {
          totalGoals: goals.length,
          accountBackedGoals: accountBackedGoals.length,
          goalsWithAllocations: goalsWithAllocations.length,
          totalAllocatedAmount
        }
      };

    } catch (error) {
      return {
        isValid: false,
        issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        stats: {
          totalGoals: 0,
          accountBackedGoals: 0,
          goalsWithAllocations: 0,
          totalAllocatedAmount: 0
        }
      };
    }
  }

  /**
   * Rollback migration (for testing purposes)
   */
  static async rollbackMigration(): Promise<{
    success: boolean;
    rolledBackGoals: number;
    errors: string[];
  }> {
    try {
      const goals = await Goal.find({ isAccountBacked: true });
      let rolledBackGoals = 0;
      const errors: string[] = [];

      for (const goal of goals) {
        try {
          goal.isAccountBacked = false;
          goal.linkedAccountId = undefined;
          goal.allocatedAccounts = [];
          await goal.save();
          rolledBackGoals++;
        } catch (error) {
          errors.push(`Failed to rollback goal "${goal.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: errors.length === 0,
        rolledBackGoals,
        errors
      };

    } catch (error) {
      return {
        success: false,
        rolledBackGoals: 0,
        errors: [`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'migrate':
      GoalAccountMigration.migrateGoalAccountRelationships()
        .then(result => {
          console.log('Migration Result:', JSON.stringify(result, null, 2));
          process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
          console.error('Migration failed:', error);
          process.exit(1);
        });
      break;

    case 'validate':
      GoalAccountMigration.validateMigration()
        .then(result => {
          console.log('Validation Result:', JSON.stringify(result, null, 2));
          process.exit(result.isValid ? 0 : 1);
        })
        .catch(error => {
          console.error('Validation failed:', error);
          process.exit(1);
        });
      break;

    case 'rollback':
      GoalAccountMigration.rollbackMigration()
        .then(result => {
          console.log('Rollback Result:', JSON.stringify(result, null, 2));
          process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
          console.error('Rollback failed:', error);
          process.exit(1);
        });
      break;

    default:
      console.log('Usage: npm run migrate-goals [migrate|validate|rollback]');
      process.exit(1);
  }
}
