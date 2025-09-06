import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { Budget, IBudget } from '../../models/Budget';
import { MockDataHelpers } from '../../utils/MockDataHelpers';

export interface BudgetGenerationConfig {
  userId: mongoose.Types.ObjectId;
  monthsOfHistory: number;
}

export class BudgetMockGenerator {
  static async generateBudgetsForUser(config: BudgetGenerationConfig): Promise<IBudget[]> {
    const budgets: IBudget[] = [];
    
    try {
      // Clear existing budgets for this user first
      await Budget.deleteMany({ userId: config.userId });
      
      const currentDate = new Date();
      
      // Generate budgets for each month
      for (let monthOffset = 0; monthOffset < config.monthsOfHistory; monthOffset++) {
        const budgetDate = new Date(currentDate);
        budgetDate.setMonth(budgetDate.getMonth() - monthOffset);
        
        const monthBudgets = await this.generateBudgetsForMonth(
          config.userId,
          budgetDate
        );
        
        budgets.push(...monthBudgets);
      }
      
      console.log(`Generated ${budgets.length} budget entries for admin user`);
      return budgets;
    } catch (error) {
      console.error('Error generating budgets:', error);
      throw error;
    }
  }

  private static async generateBudgetsForMonth(
    userId: mongoose.Types.ObjectId,
    date: Date
  ): Promise<IBudget[]> {
    const budgets: IBudget[] = [];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthString = `${year}-${month}`;

    // Get all budget categories and generate realistic budgets
    const categories = this.getBudgetCategories();
    
    for (const category of categories) {
      const budget = await this.createSingleBudget(
        userId,
        category,
        monthString,
        year
      );
      budgets.push(budget);
    }

    return budgets;
  }

  private static async createSingleBudget(
    userId: mongoose.Types.ObjectId,
    category: string,
    month: string,
    year: number
  ): Promise<IBudget> {
    
    const allocated = this.generateBudgetAmount(category);
    const spent = this.generateSpentAmount(allocated, category);

    const budgetData = {
      userId,
      category,
      allocated,
      spent,
      month,
      year,
      currency: 'USD',
      isActive: true
    };

    const budget = new Budget(budgetData);
    return await budget.save();
  }

  private static generateBudgetAmount(category: string): number {
    // Realistic budget amounts by category
    const budgetRanges: { [key: string]: { min: number; max: number } } = {
      'Housing': { min: 1200, max: 3000 },
      'Transportation': { min: 200, max: 800 },
      'Food': { min: 300, max: 800 },
      'Utilities': { min: 100, max: 300 },
      'Insurance': { min: 150, max: 500 },
      'Healthcare': { min: 100, max: 400 },
      'Savings': { min: 200, max: 1000 },
      'Personal': { min: 100, max: 300 },
      'Recreation': { min: 150, max: 500 },
      'Miscellaneous': { min: 50, max: 200 },
      'Education': { min: 0, max: 500 },
      'Clothing': { min: 100, max: 300 },
      'Technology': { min: 50, max: 300 },
      'Travel': { min: 0, max: 1000 },
      'Business': { min: 0, max: 300 },
      'Gifts': { min: 50, max: 300 },
      'Charity': { min: 0, max: 200 },
      'Debt Payments': { min: 200, max: 1500 },
      'Emergency Fund': { min: 100, max: 500 },
      'Other': { min: 50, max: 200 }
    };

    const range = budgetRanges[category] || { min: 50, max: 200 };
    return parseFloat(faker.finance.amount(range.min, range.max, 0));
  }

  private static generateSpentAmount(allocated: number, category: string): number {
    // Generate spending patterns - some categories are more likely to be over/under budget
    const spendingPatterns: { [key: string]: { variance: number; overBudgetChance: number } } = {
      'Housing': { variance: 0.05, overBudgetChance: 0.1 }, // Very consistent
      'Utilities': { variance: 0.2, overBudgetChance: 0.3 }, // Seasonal variation
      'Food': { variance: 0.3, overBudgetChance: 0.4 }, // Often over budget
      'Transportation': { variance: 0.25, overBudgetChance: 0.3 },
      'Recreation': { variance: 0.5, overBudgetChance: 0.6 }, // Highly variable
      'Shopping': { variance: 0.8, overBudgetChance: 0.7 }, // Often impulse spending
      'Travel': { variance: 1.0, overBudgetChance: 0.5 }, // Very variable
      'Emergency Fund': { variance: 0.1, overBudgetChance: 0.1 }, // Consistent savings
      'Debt Payments': { variance: 0.05, overBudgetChance: 0.05 } // Very consistent
    };

    const pattern = spendingPatterns[category] || { variance: 0.3, overBudgetChance: 0.4 };
    
    let spent: number;
    
    if (faker.datatype.boolean(pattern.overBudgetChance)) {
      // Over budget
      spent = allocated * faker.number.float({ min: 1.0, max: 1.0 + pattern.variance });
    } else {
      // Under budget
      spent = allocated * faker.number.float({ min: 0.5, max: 1.0 });
    }

    // Some months might have zero spending in certain categories
    if (this.isOptionalCategory(category) && faker.datatype.boolean(0.2)) {
      spent = 0;
    }

    return parseFloat(spent.toFixed(2));
  }

  private static isOptionalCategory(category: string): boolean {
    const optionalCategories = [
      'Travel', 'Education', 'Business', 'Gifts', 'Charity'
    ];
    return optionalCategories.includes(category);
  }

  private static getBudgetCategories(): string[] {
    // Return all budget categories from the Budget model enum
    return [
      'Housing', 'Transportation', 'Food', 'Utilities', 'Insurance',
      'Healthcare', 'Savings', 'Personal', 'Recreation', 'Miscellaneous',
      'Education', 'Clothing', 'Technology', 'Travel', 'Business',
      'Gifts', 'Charity', 'Debt Payments', 'Emergency Fund', 'Other'
    ];
  }

  // Helper method to get reasonable defaults
  static getDefaultMonthsOfHistory(): number {
    return 12;
  }

  // Calculate budget performance metrics
  static calculateBudgetMetrics(budgets: IBudget[]) {
    const totalAllocated = budgets.reduce((sum, budget) => sum + budget.allocated, 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
    const overBudgetCount = budgets.filter(budget => budget.spent > budget.allocated).length;
    const underBudgetCount = budgets.filter(budget => budget.spent < budget.allocated).length;
    
    return {
      totalAllocated,
      totalSpent,
      variance: totalSpent - totalAllocated,
      variancePercent: ((totalSpent - totalAllocated) / totalAllocated) * 100,
      overBudgetCategories: overBudgetCount,
      underBudgetCategories: underBudgetCount,
      budgetAdherence: underBudgetCount / budgets.length
    };
  }
}
