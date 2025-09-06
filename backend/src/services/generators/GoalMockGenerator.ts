import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { Goal, IGoal } from '../../models/Goal';
import { MockDataHelpers } from '../../utils/MockDataHelpers';

export interface GoalGenerationConfig {
  userId: mongoose.Types.ObjectId;
  numberOfGoals: number;
}

export class GoalMockGenerator {
  static async generateGoalsForUser(config: GoalGenerationConfig): Promise<IGoal[]> {
    const goals: IGoal[] = [];
    
    try {
      // Clear existing goals for this user first
      await Goal.deleteMany({ userId: config.userId });
      
      // Generate the specified number of goals
      for (let i = 0; i < config.numberOfGoals; i++) {
        const goal = await this.createSingleGoal(config.userId);
        goals.push(goal);
      }
      
      console.log(`Generated ${goals.length} goals for admin user`);
      return goals;
    } catch (error) {
      console.error('Error generating goals:', error);
      throw error;
    }
  }

  private static async createSingleGoal(userId: mongoose.Types.ObjectId): Promise<IGoal> {
    const category = MockDataHelpers.generateGoalCategory();
    const goalTemplate = this.getGoalTemplate(category);
    
    const targetAmount = this.generateTargetAmount(category);
    const currentAmount = this.generateCurrentAmount(targetAmount);
    const targetDate = this.generateTargetDate(category);
    const isCompleted = currentAmount >= targetAmount;

    const goalData = {
      userId,
      title: goalTemplate.title,
      description: goalTemplate.description,
      targetAmount,
      currentAmount,
      targetDate,
      category,
      priority: this.generatePriority(category),
      currency: 'USD',
      isActive: !isCompleted,
      isCompleted,
      completedAt: isCompleted ? faker.date.recent({ days: 30 }) : undefined
    };

    const goal = new Goal(goalData);
    return await goal.save();
  }

  private static getGoalTemplate(category: string) {
    const templates: { [key: string]: { title: string; description: string } } = {
      'Emergency Fund': {
        title: 'Emergency Fund',
        description: 'Build an emergency fund to cover 3-6 months of expenses for unexpected situations.'
      },
      'Vacation': {
        title: faker.helpers.arrayElement([
          'European Vacation',
          'Hawaii Trip',
          'Weekend Getaway',
          'Family Vacation',
          'Adventure Travel'
        ]),
        description: 'Save money for a memorable vacation and travel experience.'
      },
      'New Car': {
        title: faker.helpers.arrayElement([
          'New Car Purchase',
          'Car Down Payment',
          'Vehicle Upgrade',
          'First Car',
          'Dream Car Fund'
        ]),
        description: 'Save for a reliable vehicle or upgrade to a better car.'
      },
      'Home Down Payment': {
        title: 'Home Down Payment',
        description: 'Save for a down payment on a house to achieve homeownership.'
      },
      'Wedding': {
        title: faker.helpers.arrayElement([
          'Wedding Fund',
          'Dream Wedding',
          'Wedding Expenses',
          'Marriage Celebration'
        ]),
        description: 'Save for wedding expenses including venue, catering, and other costs.'
      },
      'Education': {
        title: faker.helpers.arrayElement([
          'MBA Fund',
          'College Tuition',
          'Online Course',
          'Professional Certification',
          'Skills Development'
        ]),
        description: 'Invest in education and skill development for career advancement.'
      },
      'Retirement': {
        title: 'Retirement Savings',
        description: 'Build long-term wealth for a comfortable retirement lifestyle.'
      },
      'Home Improvement': {
        title: faker.helpers.arrayElement([
          'Kitchen Renovation',
          'Bathroom Remodel',
          'Home Office Setup',
          'Garden Landscaping',
          'Home Repairs'
        ]),
        description: 'Save for home improvements and renovations to increase property value.'
      },
      'Electronics': {
        title: faker.helpers.arrayElement([
          'New Laptop',
          'Gaming Setup',
          'Smart Home Devices',
          'Camera Equipment',
          'Home Theater'
        ]),
        description: 'Save for new technology and electronic devices.'
      },
      'Investment': {
        title: faker.helpers.arrayElement([
          'Stock Portfolio',
          'Investment Fund',
          'Real Estate Investment',
          'Cryptocurrency Fund',
          'Diversified Portfolio'
        ]),
        description: 'Build capital for investment opportunities and wealth building.'
      }
    };

    return templates[category] || {
      title: `${category} Goal`,
      description: `Save money for ${category.toLowerCase()}-related expenses.`
    };
  }

  private static generateTargetAmount(category: string): number {
    // Realistic target amounts by category
    const amountRanges: { [key: string]: { min: number; max: number } } = {
      'Emergency Fund': { min: 5000, max: 25000 },
      'Vacation': { min: 1500, max: 8000 },
      'New Car': { min: 15000, max: 45000 },
      'Home Down Payment': { min: 20000, max: 100000 },
      'Wedding': { min: 10000, max: 50000 },
      'Education': { min: 2000, max: 30000 },
      'Retirement': { min: 50000, max: 500000 },
      'Home Improvement': { min: 3000, max: 25000 },
      'Electronics': { min: 500, max: 5000 },
      'Investment': { min: 5000, max: 50000 }
    };

    const range = amountRanges[category] || { min: 1000, max: 10000 };
    return parseFloat(faker.finance.amount(range.min, range.max, 0));
  }

  private static generateCurrentAmount(targetAmount: number): number {
    // Generate progress between 0% and 120% (some goals might be overfunded)
    const progressPercent = faker.number.float({ min: 0, max: 1.2 });
    const currentAmount = targetAmount * progressPercent;
    
    // Round to nearest dollar
    return parseFloat(currentAmount.toFixed(0));
  }

  private static generateTargetDate(category: string): Date {
    // Different goal types have different typical timelines
    const timelineMonths: { [key: string]: { min: number; max: number } } = {
      'Emergency Fund': { min: 6, max: 18 },
      'Vacation': { min: 3, max: 12 },
      'New Car': { min: 12, max: 36 },
      'Home Down Payment': { min: 24, max: 60 },
      'Wedding': { min: 12, max: 24 },
      'Education': { min: 6, max: 24 },
      'Retirement': { min: 120, max: 480 }, // 10-40 years
      'Home Improvement': { min: 6, max: 24 },
      'Electronics': { min: 2, max: 12 },
      'Investment': { min: 12, max: 60 }
    };

    const timeline = timelineMonths[category] || { min: 6, max: 24 };
    const monthsToTarget = faker.number.int(timeline);
    
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + monthsToTarget);
    
    return targetDate;
  }

  private static generatePriority(category: string): 'low' | 'medium' | 'high' {
    // Emergency fund and debt payoff are typically high priority
    const highPriorityCategories = ['Emergency Fund', 'Retirement'];
    const mediumPriorityCategories = ['Home Down Payment', 'Education', 'New Car'];
    
    if (highPriorityCategories.includes(category)) {
      return faker.helpers.arrayElement(['high', 'medium']);
    } else if (mediumPriorityCategories.includes(category)) {
      return faker.helpers.arrayElement(['medium', 'low']);
    } else {
      // Vacation, electronics, etc. are typically lower priority
      return faker.helpers.arrayElement(['low', 'medium']);
    }
  }

  // Helper methods for configuration
  static getDefaultNumberOfGoals(): number {
    return faker.number.int({ min: 3, max: 8 });
  }

  // Calculate goal statistics
  static calculateGoalMetrics(goals: IGoal[]) {
    const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const completedGoals = goals.filter(goal => goal.isCompleted).length;
    const activeGoals = goals.filter(goal => goal.isActive).length;
    
    const averageProgress = goals.length > 0 
      ? goals.reduce((sum, goal) => sum + (goal.currentAmount / goal.targetAmount), 0) / goals.length 
      : 0;

    const goalsByPriority = {
      high: goals.filter(goal => goal.priority === 'high').length,
      medium: goals.filter(goal => goal.priority === 'medium').length,
      low: goals.filter(goal => goal.priority === 'low').length
    };

    return {
      totalGoals: goals.length,
      completedGoals,
      activeGoals,
      totalTargetAmount,
      totalCurrentAmount,
      overallProgress: (totalCurrentAmount / totalTargetAmount) * 100,
      averageProgress: averageProgress * 100,
      goalsByPriority
    };
  }

  // Generate goal milestones for tracking progress
  static generateGoalMilestones(goal: IGoal) {
    const milestones = [];
    const milestoneCount = 4; // 25%, 50%, 75%, 100%
    
    for (let i = 1; i <= milestoneCount; i++) {
      const percentage = (i / milestoneCount) * 100;
      const milestoneAmount = (goal.targetAmount * percentage) / 100;
      const isAchieved = goal.currentAmount >= milestoneAmount;
      
      milestones.push({
        percentage,
        amount: milestoneAmount,
        isAchieved,
        achievedAt: isAchieved ? faker.date.past() : undefined,
        description: `${percentage}% of goal reached`
      });
    }
    
    return milestones;
  }
}
