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

  // Get net worth trend data
  static async getNetWorthTrend(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { period = '6m', interval = 'weekly' } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '1m':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3m':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6m':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case 'all':
          startDate.setFullYear(2020); // Far back date
          break;
        default:
          startDate.setMonth(endDate.getMonth() - 6);
      }

      // Determine aggregation interval
      let dateGrouping;
      let intervalDays;
      
      switch (interval) {
        case 'daily':
          dateGrouping = '%Y-%m-%d';
          intervalDays = 1;
          break;
        case 'weekly':
          dateGrouping = '%Y-%U'; // Year-Week
          intervalDays = 7;
          break;
        case 'monthly':
          dateGrouping = '%Y-%m';
          intervalDays = 30;
          break;
        default:
          dateGrouping = '%Y-%U';
          intervalDays = 7;
      }

      // Get transaction data aggregated by period
      const transactionData = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            'transactionInfo.date': { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: dateGrouping, date: '$transactionInfo.date' } },
              type: '$transactionInfo.type'
            },
            totalAmount: { $sum: '$transactionInfo.amount' },
            date: { $first: '$transactionInfo.date' }
          }
        },
        {
          $group: {
            _id: '$_id.period',
            income: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', 'income'] },
                  '$totalAmount',
                  0
                ]
              }
            },
            expenses: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', 'expense'] },
                  { $abs: '$totalAmount' },
                  0
                ]
              }
            },
            date: { $first: '$date' }
          }
        },
        {
          $sort: { date: 1 }
        }
      ]);

      // Get investment data for the same period
      const investments = await Investment.find({ 
        userId, 
        isActive: true,
        'acquisition.purchaseDate': { $lte: endDate }
      });

      // Calculate portfolio values over time (simplified - in reality would need historical prices)
      const portfolioValue = investments.reduce((sum, inv) => sum + inv.position.marketValue, 0);

      // Get goals for assets calculation
      const goals = await Goal.find({ 
        userId, 
        isActive: true,
        category: { $in: ['Emergency Fund', 'Savings'] }
      });

      const savingsAmount = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);

      // Generate net worth trend data
      const netWorthData = [];
      let runningCash = savingsAmount;
      let runningNetWorth = portfolioValue + savingsAmount;

      // Create data points based on transaction data
      const groupedTransactions = new Map();
      transactionData.forEach(item => {
        const periodKey = item._id;
        const cashFlow = item.income - item.expenses;
        groupedTransactions.set(periodKey, {
          cashFlow,
          income: item.income,
          expenses: item.expenses,
          date: item.date
        });
      });

      // Generate time series data
      const current = new Date(startDate);
      while (current <= endDate) {
        const periodKey = interval === 'monthly' 
          ? `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
          : interval === 'weekly'
          ? `${current.getFullYear()}-${Math.ceil((current.getTime() - new Date(current.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`
          : current.toISOString().split('T')[0];

        const transactionPeriod = groupedTransactions.get(periodKey);
        const cashFlow = transactionPeriod?.cashFlow || 0;
        
        runningCash += cashFlow;
        runningNetWorth = portfolioValue + runningCash;

        // Simulate some portfolio growth/volatility for demonstration
        const portfolioGrowth = portfolioValue * (Math.random() * 0.02 - 0.01); // ±1% random change
        const currentPortfolioValue = Math.max(0, portfolioValue + portfolioGrowth);

        netWorthData.push({
          date: current.toISOString().split('T')[0],
          netWorth: Math.round(runningNetWorth),
          assets: Math.round(runningCash + currentPortfolioValue),
          liabilities: 0, // Would calculate from debt data if available
          investments: Math.round(currentPortfolioValue),
          cash: Math.round(runningCash),
          income: transactionPeriod?.income || 0,
          expenses: transactionPeriod?.expenses || 0
        });

        // Advance to next period
        if (interval === 'daily') {
          current.setDate(current.getDate() + 1);
        } else if (interval === 'weekly') {
          current.setDate(current.getDate() + 7);
        } else {
          current.setMonth(current.getMonth() + 1);
        }
      }

      // Calculate summary statistics
      const values = netWorthData.map(d => d.netWorth);
      const currentValue = values[values.length - 1] || 0;
      const startValue = values[0] || 0;
      const change = currentValue - startValue;
      const changePercent = startValue !== 0 ? (change / Math.abs(startValue)) * 100 : 0;
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);

      // Calculate volatility
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const volatility = Math.sqrt(variance);

      res.json({
        success: true,
        data: {
          period,
          interval,
          dateRange: { startDate, endDate },
          trend: netWorthData,
          summary: {
            current: currentValue,
            change,
            changePercent,
            highest: maxValue,
            lowest: minValue,
            volatility: Math.round(volatility),
            totalDataPoints: netWorthData.length
          },
          metrics: {
            totalInvestments: portfolioValue,
            totalCash: runningCash,
            totalAssets: portfolioValue + runningCash,
            totalLiabilities: 0 // Would calculate from debt data
          }
        }
      });
    } catch (error) {
      logger.error('Error getting net worth trend:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
