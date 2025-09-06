import mongoose from 'mongoose';
import { AccountMockGenerator } from './generators/AccountMockGenerator';
import { TransactionMockGenerator } from './generators/TransactionMockGenerator';
import { InvestmentMockGenerator } from './generators/InvestmentMockGenerator';
import { BudgetMockGenerator } from './generators/BudgetMockGenerator';
import { GoalMockGenerator } from './generators/GoalMockGenerator';
import { DebtMockGenerator } from './generators/DebtMockGenerator';
import { DatabaseService } from './DatabaseService';

export interface MockDataConfig {
  userId: mongoose.Types.ObjectId;
  monthsOfHistory: number;
  numberOfAccounts: number;
  accountTypes: ('checking' | 'savings' | 'investment' | 'retirement' | 'credit' | 'loan')[];
  includeInvestments: boolean;
  includeBudgetsAndGoals: boolean;
  includeDebts: boolean;
  transactionsPerMonth: number;
}

export interface MockDataGenerationResult {
  success: boolean;
  message: string;
  summary: {
    accounts: number;
    transactions: number;
    investments: number;
    budgets: number;
    goals: number;
    debts: number;
  };
  errors?: string[];
}

export class MockDataService {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  async generateMockDataForAdmin(config: MockDataConfig): Promise<MockDataGenerationResult> {
    const errors: string[] = [];
    const summary = {
      accounts: 0,
      transactions: 0,
      investments: 0,
      budgets: 0,
      goals: 0,
      debts: 0
    };

    try {
      console.log('Starting mock data generation for admin user:', config.userId);

      // Step 1: Update admin user profile if needed
      await this.updateAdminProfile(config.userId);

      // Step 2: Generate accounts
      console.log('Generating accounts...');
      const accounts = await AccountMockGenerator.generateAccountsForUser({
        userId: config.userId,
        accountTypes: config.accountTypes,
        numberOfAccounts: config.numberOfAccounts
      });
      summary.accounts = accounts.length;

      // Step 3: Generate transactions
      console.log('Generating transactions...');
      const transactions = await TransactionMockGenerator.generateTransactionsForUser({
        userId: config.userId,
        monthsOfHistory: config.monthsOfHistory,
        transactionsPerMonth: config.transactionsPerMonth,
        accounts
      });
      summary.transactions = transactions.length;

      // Step 4: Generate investments (if enabled)
      if (config.includeInvestments) {
        console.log('Generating investments...');
        try {
          const investments = await InvestmentMockGenerator.generateInvestmentsForUser({
            userId: config.userId,
            accounts,
            generateDividends: true
          });
          summary.investments = investments.length;
        } catch (error) {
          console.error('Error generating investments:', error);
          errors.push(`Investment generation failed: ${error}`);
        }
      }

      // Step 5: Generate budgets and goals (if enabled)
      if (config.includeBudgetsAndGoals) {
        console.log('Generating budgets...');
        try {
          const budgets = await BudgetMockGenerator.generateBudgetsForUser({
            userId: config.userId,
            monthsOfHistory: config.monthsOfHistory
          });
          summary.budgets = budgets.length;
        } catch (error) {
          console.error('Error generating budgets:', error);
          errors.push(`Budget generation failed: ${error}`);
        }

        console.log('Generating goals...');
        try {
          const goals = await GoalMockGenerator.generateGoalsForUser({
            userId: config.userId,
            numberOfGoals: GoalMockGenerator.getDefaultNumberOfGoals()
          });
          summary.goals = goals.length;
        } catch (error) {
          console.error('Error generating goals:', error);
          errors.push(`Goal generation failed: ${error}`);
        }
      }

      // Step 6: Generate debts (if enabled)
      if (config.includeDebts) {
        console.log('Generating debts...');
        try {
          const debts = await DebtMockGenerator.generateDebtsForUser({
            userId: config.userId,
            numberOfDebts: DebtMockGenerator.getDefaultNumberOfDebts(),
            generatePaymentHistory: true
          });
          summary.debts = debts.length;
        } catch (error) {
          console.error('Error generating debts:', error);
          errors.push(`Debt generation failed: ${error}`);
        }
      }

      console.log('Mock data generation completed successfully');

      return {
        success: true,
        message: 'Mock data generated successfully for admin account',
        summary,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('Mock data generation failed:', error);
      return {
        success: false,
        message: `Mock data generation failed: ${error}`,
        summary,
        errors: [...errors, `${error}`]
      };
    }
  }

  private async updateAdminProfile(userId: mongoose.Types.ObjectId): Promise<void> {
    try {
      const user = await this.databaseService.findUserById(userId.toString());
      if (!user) {
        throw new Error('Admin user not found');
      }

      // Check if profile needs enhancement
      const updates: any = {};
      let needsUpdate = false;

      // Enhance profile if incomplete
      if (!user.profile.dateOfBirth) {
        updates['profile.dateOfBirth'] = new Date(1985, 5, 15); // June 15, 1985
        needsUpdate = true;
      }

      if (!user.profile.phone) {
        updates['profile.phone'] = '+1-555-0123';
        needsUpdate = true;
      }

      if (!user.profile.address) {
        updates['profile.address'] = {
          street: '123 Admin Street',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          country: 'USA'
        };
        needsUpdate = true;
      }

      // Set premium subscription for admin
      if (user.subscription.plan !== 'premium') {
        updates['subscription.plan'] = 'premium';
        updates['subscription.features'] = [
          'advanced_analytics',
          'investment_tracking',
          'budget_analysis',
          'goal_management',
          'debt_optimization',
          'ai_recommendations'
        ];
        needsUpdate = true;
      }

      // Enhance risk profile if needed
      if (!user.riskProfile.questionnaire.completedAt) {
        updates['riskProfile.level'] = 'moderate';
        updates['riskProfile.questionnaire'] = {
          age: 38,
          experience: 'intermediate',
          timeline: 'long_term',
          riskTolerance: 6,
          completedAt: new Date()
        };
        needsUpdate = true;
      }

      if (needsUpdate) {
        await this.databaseService.updateUser(userId.toString(), updates);
        console.log('Admin profile updated with enhanced data');
      }

    } catch (error) {
      console.error('Error updating admin profile:', error);
      // Don't throw - this is optional enhancement
    }
  }

  // Get default configuration for mock data generation
  static getDefaultConfig(userId: mongoose.Types.ObjectId): MockDataConfig {
    return {
      userId,
      monthsOfHistory: 12,
      numberOfAccounts: AccountMockGenerator.getDefaultAccountCount(),
      accountTypes: AccountMockGenerator.getDefaultAccountTypes(),
      includeInvestments: true,
      includeBudgetsAndGoals: true,
      includeDebts: true,
      transactionsPerMonth: TransactionMockGenerator.getDefaultTransactionsPerMonth()
    };
  }

  // Clear all mock data for a user (useful for re-generation)
  async clearMockDataForUser(userId: mongoose.Types.ObjectId): Promise<void> {
    try {
      console.log('Clearing existing mock data for user:', userId);

      // Import models to clear data
      const { Account } = await import('../models/Account');
      const { Transaction } = await import('../models/Transaction');
      const { Investment } = await import('../models/Investment');
      const { Budget } = await import('../models/Budget');
      const { Goal } = await import('../models/Goal');
      const { Debt } = await import('../models/Debt');

      // Clear all data for this user
      await Promise.all([
        Account.deleteMany({ userId }),
        Transaction.deleteMany({ userId }),
        Investment.deleteMany({ userId }),
        Budget.deleteMany({ userId }),
        Goal.deleteMany({ userId }),
        Debt.deleteMany({ userId })
      ]);

      console.log('Mock data cleared successfully');
    } catch (error) {
      console.error('Error clearing mock data:', error);
      throw error;
    }
  }

  // Get summary of existing data for a user
  async getDataSummary(userId: mongoose.Types.ObjectId) {
    try {
      // Import models to get counts
      const { Account } = await import('../models/Account');
      const { Transaction } = await import('../models/Transaction');
      const { Investment } = await import('../models/Investment');
      const { Budget } = await import('../models/Budget');
      const { Goal } = await import('../models/Goal');
      const { Debt } = await import('../models/Debt');

      const [accounts, transactions, investments, budgets, goals, debts] = await Promise.all([
        Account.countDocuments({ userId }),
        Transaction.countDocuments({ userId }),
        Investment.countDocuments({ userId }),
        Budget.countDocuments({ userId }),
        Goal.countDocuments({ userId }),
        Debt.countDocuments({ userId })
      ]);

      return {
        accounts,
        transactions,
        investments,
        budgets,
        goals,
        debts,
        hasData: accounts > 0 || transactions > 0 || investments > 0 || budgets > 0 || goals > 0 || debts > 0
      };
    } catch (error) {
      console.error('Error getting data summary:', error);
      return {
        accounts: 0,
        transactions: 0,
        investments: 0,
        budgets: 0,
        goals: 0,
        debts: 0,
        hasData: false
      };
    }
  }
}
