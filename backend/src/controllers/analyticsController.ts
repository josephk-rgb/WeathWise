import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Transaction, Investment, Budget, Goal } from '../models';
import { logger } from '../utils/logger';

export class AnalyticsController {
  // Get analytics overview
  static async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { period = '30d' } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get transaction analytics
      const transactionStats = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            'transactionInfo.date': { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$transactionInfo.type',
            totalAmount: { $sum: '$transactionInfo.amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$transactionInfo.amount' }
          }
        }
      ]);

      // Get investment analytics
      const investments = await Investment.find({ userId, isActive: true });
      let portfolioValue = 0;
      let portfolioCost = 0;
      
      investments.forEach(inv => {
        portfolioValue += inv.position.marketValue;
        portfolioCost += inv.position.totalCost;
      });

      // Get budget analytics
      const currentMonth = endDate.toISOString().slice(0, 7);
      const budgets = await Budget.find({ 
        userId, 
        month: currentMonth,
        isActive: true 
      });

      let totalBudgeted = 0;
      let totalSpent = 0;
      budgets.forEach(budget => {
        totalBudgeted += budget.allocated;
        totalSpent += budget.spent;
      });

      // Get goal analytics
      const goals = await Goal.find({ userId, isActive: true });
      let totalGoalAmount = 0;
      let totalGoalProgress = 0;
      let completedGoals = 0;

      goals.forEach(goal => {
        totalGoalAmount += goal.targetAmount;
        totalGoalProgress += goal.currentAmount;
        if (goal.isCompleted) completedGoals++;
      });

      res.json({
        success: true,
        data: {
          period,
          dateRange: { startDate, endDate },
          transactions: {
            byType: transactionStats,
            summary: transactionStats.reduce((acc, curr) => {
              acc.totalAmount += curr.totalAmount;
              acc.totalCount += curr.count;
              return acc;
            }, { totalAmount: 0, totalCount: 0 })
          },
          portfolio: {
            totalValue: portfolioValue,
            totalCost: portfolioCost,
            totalGainLoss: portfolioValue - portfolioCost,
            totalReturn: portfolioCost > 0 ? ((portfolioValue - portfolioCost) / portfolioCost) * 100 : 0,
            investmentCount: investments.length
          },
          budgets: {
            totalBudgeted,
            totalSpent,
            remaining: totalBudgeted - totalSpent,
            utilizationRate: totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
            budgetCount: budgets.length
          },
          goals: {
            totalTargetAmount: totalGoalAmount,
            totalCurrentAmount: totalGoalProgress,
            progressRate: totalGoalAmount > 0 ? (totalGoalProgress / totalGoalAmount) * 100 : 0,
            completedGoals,
            totalGoals: goals.length
          }
        }
      });
    } catch (error) {
      logger.error('Error getting analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get spending analysis
  static async getSpendingAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { period = '30d' } = req.query;
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Spending by category
      const categorySpending = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            'transactionInfo.type': 'expense',
            'transactionInfo.date': { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$transactionInfo.category',
            totalAmount: { $sum: { $abs: '$transactionInfo.amount' } },
            count: { $sum: 1 },
            avgAmount: { $avg: { $abs: '$transactionInfo.amount' } }
          }
        },
        {
          $sort: { totalAmount: -1 }
        }
      ]);

      // Spending trends (daily)
      const dailySpending = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            'transactionInfo.type': 'expense',
            'transactionInfo.date': { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$transactionInfo.date' }
            },
            totalAmount: { $sum: { $abs: '$transactionInfo.amount' } },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id': 1 }
        }
      ]);

      // Calculate totals
      const totalSpending = categorySpending.reduce((sum, cat) => sum + cat.totalAmount, 0);
      const averageDailySpending = totalSpending / Math.max(1, 
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      res.json({
        success: true,
        data: {
          period,
          dateRange: { startDate, endDate },
          totalSpending,
          averageDailySpending,
          categoryBreakdown: categorySpending,
          dailyTrend: dailySpending,
          topCategories: categorySpending.slice(0, 5)
        }
      });
    } catch (error) {
      logger.error('Error getting spending analysis:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get investment performance analysis
  static async getInvestmentPerformance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const investments = await Investment.find({ userId, isActive: true });

      if (investments.length === 0) {
        res.json({
          success: true,
          data: {
            message: 'No investments found',
            summary: {
              totalValue: 0,
              totalCost: 0,
              totalGainLoss: 0,
              totalReturn: 0
            },
            performance: [],
            assetAllocation: {}
          }
        });
        return;
      }

      // Calculate performance metrics
      const performance = investments.map(investment => {
        const currentValue = investment.position.marketValue;
        const costBasis = investment.position.totalCost;
        const gainLoss = investment.position.gainLoss;
        const gainLossPercent = investment.position.gainLossPercent;

        return {
          symbol: investment.securityInfo.symbol,
          name: investment.securityInfo.name,
          type: investment.securityInfo.type,
          shares: investment.position.shares,
          currentPrice: investment.position.currentPrice,
          averageCost: investment.position.averageCost,
          currentValue,
          costBasis,
          gainLoss,
          gainLossPercent,
          dayChange: investment.position.dayChange,
          dayChangePercent: investment.position.dayChangePercent
        };
      });

      // Calculate summary metrics
      const summary = performance.reduce((acc, inv) => {
        acc.totalValue += inv.currentValue;
        acc.totalCost += inv.costBasis;
        acc.totalGainLoss += inv.gainLoss;
        return acc;
      }, { totalValue: 0, totalCost: 0, totalGainLoss: 0, totalReturn: 0 });

      summary.totalReturn = summary.totalCost > 0 ? 
        (summary.totalGainLoss / summary.totalCost) * 100 : 0;

      // Asset allocation
      const assetAllocation: { [key: string]: number } = {};
      performance.forEach(inv => {
        const type = inv.type;
        assetAllocation[type] = (assetAllocation[type] || 0) + inv.currentValue;
      });

      // Convert to percentages
      Object.keys(assetAllocation).forEach(type => {
        assetAllocation[type] = summary.totalValue > 0 ? 
          (assetAllocation[type] / summary.totalValue) * 100 : 0;
      });

      // Sort performance by gain/loss percentage
      performance.sort((a, b) => b.gainLossPercent - a.gainLossPercent);

      res.json({
        success: true,
        data: {
          summary,
          performance,
          assetAllocation,
          topPerformers: performance.slice(0, 5),
          bottomPerformers: performance.slice(-5).reverse()
        }
      });
    } catch (error) {
      logger.error('Error getting investment performance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get financial health score
  static async getFinancialHealth(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Get recent transactions (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const transactions = await Transaction.find({
        userId,
        'transactionInfo.date': { $gte: sixMonthsAgo }
      });

      // Calculate income and expenses
      let totalIncome = 0;
      let totalExpenses = 0;

      transactions.forEach(transaction => {
        if (transaction.transactionInfo.type === 'income') {
          totalIncome += transaction.transactionInfo.amount;
        } else if (transaction.transactionInfo.type === 'expense') {
          totalExpenses += Math.abs(transaction.transactionInfo.amount);
        }
      });

      // Get investment data
      const investments = await Investment.find({ userId, isActive: true });
      const portfolioValue = investments.reduce((sum, inv) => sum + inv.position.marketValue, 0);

      // Get emergency fund goal
      const emergencyFundGoal = await Goal.findOne({ 
        userId, 
        category: 'Emergency Fund', 
        isActive: true 
      });

      // Calculate health scores (0-100)
      const monthlyIncome = totalIncome / 6;
      const monthlyExpenses = totalExpenses / 6;
      const monthlySavings = monthlyIncome - monthlyExpenses;

      // Cash flow score (0-100)
      const cashFlowRatio = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;
      const cashFlowScore = Math.max(0, Math.min(100, cashFlowRatio * 100 + 50));

      // Savings rate score (0-100)
      const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
      const savingsScore = Math.max(0, Math.min(100, savingsRate * 5)); // 20% savings = 100 points

      // Emergency fund score (0-100)
      const emergencyFundAmount = emergencyFundGoal?.currentAmount || 0;
      const recommendedEmergencyFund = monthlyExpenses * 6; // 6 months of expenses
      const emergencyFundScore = recommendedEmergencyFund > 0 ? 
        Math.min(100, (emergencyFundAmount / recommendedEmergencyFund) * 100) : 0;

      // Diversification score (0-100)
      const diversificationScore = investments.length === 0 ? 0 : 
        Math.min(100, (investments.length / 10) * 100); // 10+ investments = 100 points

      // Overall score
      const overallScore = Math.round(
        (cashFlowScore * 0.3 + 
         savingsScore * 0.25 + 
         emergencyFundScore * 0.25 + 
         diversificationScore * 0.2)
      );

      res.json({
        success: true,
        data: {
          overall: overallScore,
          components: {
            cashFlow: Math.round(cashFlowScore),
            savingsRate: Math.round(savingsScore),
            emergencyFund: Math.round(emergencyFundScore),
            diversification: Math.round(diversificationScore)
          },
          metrics: {
            monthlyIncome,
            monthlyExpenses,
            monthlySavings,
            savingsRate,
            portfolioValue,
            emergencyFundAmount,
            recommendedEmergencyFund
          },
          recommendations: [
            ...(cashFlowScore < 50 ? ['Improve cash flow by reducing expenses or increasing income'] : []),
            ...(savingsScore < 50 ? ['Increase your savings rate to at least 20% of income'] : []),
            ...(emergencyFundScore < 100 ? ['Build an emergency fund covering 6 months of expenses'] : []),
            ...(diversificationScore < 50 ? ['Diversify your investment portfolio'] : [])
          ]
        }
      });
    } catch (error) {
      logger.error('Error calculating financial health:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
