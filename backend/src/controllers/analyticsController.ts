import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Transaction, Investment, Budget, Goal, Account, Debt } from '../models';
import { PhysicalAsset } from '../models/PhysicalAsset';
import { logger } from '../utils/logger';
import { NetWorthCalculator } from '../services/netWorthCalculator';
import { FinancialDataValidator } from '../utils/financialValidator';
import { NetWorthTracker } from '../services/netWorthTracker';
import { PortfolioPriceCache } from '../services/portfolioPriceCache';

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

      // Get net worth analytics
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const netWorthData = await NetWorthCalculator.getCurrentNetWorth(userObjectId);
      const netWorthByCategory = await NetWorthCalculator.getNetWorthByCategory(userObjectId);

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
          netWorth: {
            current: netWorthData.netWorth,
            assets: netWorthData.breakdown.liquidAssets + netWorthData.breakdown.portfolioValue + netWorthData.breakdown.physicalAssets,
            liabilities: netWorthData.breakdown.totalLiabilities,
            byCategory: netWorthByCategory,
            lastUpdated: netWorthData.calculatedAt
          },
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

      // Check if user has any financial data before calculating scores
      const hasTransactionData = transactions.length > 0;
      const hasInvestmentData = investments.length > 0;
      const hasEmergencyFundData = emergencyFundGoal && emergencyFundGoal.currentAmount > 0;
      const hasAnyFinancialData = hasTransactionData || hasInvestmentData || hasEmergencyFundData;

      // If no financial data exists, return zero state
      if (!hasAnyFinancialData) {
        res.json({
          success: true,
          data: {
            overall: 0,
            components: {
              cashFlow: 0,
              savingsRate: 0,
              emergencyFund: 0,
              diversification: 0,
              debtToIncome: 0
            },
            metrics: {
              monthlyIncome: 0,
              monthlyExpenses: 0,
              monthlySavings: 0,
              savingsRate: 0,
              portfolioValue: 0,
              emergencyFundAmount: 0,
              recommendedEmergencyFund: 0,
              monthlyDebtPayments: 0,
              debtToIncomeRatio: 0,
              assetTypes: 0,
              investmentCount: 0
            },
            recommendations: [
              'Start by adding some transactions to track your income and expenses',
              'Consider setting up an emergency fund goal',
              'Add some investments to begin building your portfolio'
            ]
          }
        });
        return;
      }

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

      // Debt-to-Income score (0-100)
      // Calculate monthly debt payments from expense transactions
      const debtTransactions = transactions.filter(t => 
        t.transactionInfo.type === 'expense' && 
        ['debt', 'loan', 'credit', 'mortgage'].some(keyword => 
          t.transactionInfo.category.toLowerCase().includes(keyword)
        )
      );
      const monthlyDebtPayments = debtTransactions.reduce((sum, t) => 
        sum + Math.abs(t.transactionInfo.amount), 0) / 6;
      
      const debtToIncomeRatio = monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : 0;
      const debtToIncomeScore = Math.max(0, 100 - (debtToIncomeRatio * 300)); // 33% DTI = 1 point

      // Enhanced Diversification score (0-100)
      let diversificationScore = 0;
      if (investments.length > 0) {
        // Calculate asset type diversity
        const assetTypes = new Set(investments.map(inv => inv.securityInfo.type));
        const typeScore = Math.min(50, (assetTypes.size / 6) * 50); // Max 6 asset types
        
        // Calculate allocation balance (Herfindahl Index)
        const totalValue = investments.reduce((sum, inv) => sum + inv.position.marketValue, 0);
        const allocations = investments.map(inv => inv.position.marketValue / totalValue);
        const herfindahlIndex = allocations.reduce((sum, alloc) => sum + (alloc * alloc), 0);
        const balanceScore = Math.max(0, 50 - (herfindahlIndex * 100)); // Lower concentration = higher score
        
        diversificationScore = Math.round(typeScore + balanceScore);
      }

      // Overall score with enhanced weighting
      const overallScore = Math.round(
        (cashFlowScore * 0.25 + 
         savingsScore * 0.20 + 
         emergencyFundScore * 0.25 + 
         diversificationScore * 0.15 +
         debtToIncomeScore * 0.15)
      );

      res.json({
        success: true,
        data: {
          overall: overallScore,
          components: {
            cashFlow: Math.round(cashFlowScore),
            savingsRate: Math.round(savingsScore),
            emergencyFund: Math.round(emergencyFundScore),
            diversification: Math.round(diversificationScore),
            debtToIncome: Math.round(debtToIncomeScore)
          },
          metrics: {
            monthlyIncome,
            monthlyExpenses,
            monthlySavings,
            savingsRate,
            portfolioValue,
            emergencyFundAmount,
            recommendedEmergencyFund,
            monthlyDebtPayments,
            debtToIncomeRatio: debtToIncomeRatio * 100,
            assetTypes: investments.length > 0 ? new Set(investments.map(inv => inv.securityInfo.type)).size : 0,
            investmentCount: investments.length
          },
          recommendations: [
            ...(cashFlowScore < 50 ? ['Improve cash flow by reducing expenses or increasing income'] : []),
            ...(savingsScore < 50 ? ['Increase your savings rate to at least 20% of income'] : []),
            ...(emergencyFundScore < 100 ? ['Build an emergency fund covering 6 months of expenses'] : []),
            ...(diversificationScore < 50 ? ['Diversify your investment portfolio across different asset types'] : []),
            ...(debtToIncomeScore < 70 ? ['Consider reducing debt payments - aim for less than 28% debt-to-income ratio'] : []),
            ...(overallScore >= 80 ? ['Excellent financial health! Consider advanced investment strategies'] : []),
            ...(overallScore < 40 ? ['Focus on building emergency fund and reducing debt first'] : [])
          ]
        }
      });
    } catch (error) {
      logger.error('Error calculating financial health:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get dashboard statistics with change calculations
  static async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Get current period (last 30 days) for trend analysis
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      // Get previous period (30 days before that) for comparison
      const prevEndDate = new Date(startDate);
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevEndDate.getDate() - 30);

      // Get all-time data for Net Worth calculation and current period for trends
      const [allTransactions, currentPeriodTransactions, currentInvestments, currentGoals] = await Promise.all([
        Transaction.find({ userId }), // All-time transactions for Net Worth
        Transaction.find({
          userId,
          'transactionInfo.date': { $gte: startDate, $lte: endDate }
        }), // Current period for trends
        Investment.find({ userId, isActive: true }),
        Goal.find({ userId, isActive: true })
      ]);

      // Get previous period data for comparison
      const prevTransactions = await Transaction.find({
        userId,
        'transactionInfo.date': { $gte: prevStartDate, $lte: prevEndDate }
      });

      // Calculate all-time Net Worth (total accumulated wealth)
      const allTimeIncome = allTransactions
        .filter(t => t.transactionInfo.type === 'income')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0);

      const allTimeExpenses = Math.abs(allTransactions
        .filter(t => t.transactionInfo.type === 'expense')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0));

      const totalPortfolioValue = currentInvestments.reduce((sum, inv) => 
        sum + inv.position.marketValue, 0);

      // True Net Worth = Total Assets - Total Liabilities
      // For now: Cash Position (income - expenses) + Portfolio Value
      // TODO: Add savings accounts, cash, and debt for complete picture
      const currentNetWorth = allTimeIncome - allTimeExpenses + totalPortfolioValue;

      // Calculate current period metrics for trends
      const currentIncome = currentPeriodTransactions
        .filter(t => t.transactionInfo.type === 'income')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0);

      const currentExpenses = Math.abs(currentPeriodTransactions
        .filter(t => t.transactionInfo.type === 'expense')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0));

      // Calculate previous metrics for trend comparison
      const prevIncome = prevTransactions
        .filter(t => t.transactionInfo.type === 'income')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0);

      const prevExpenses = Math.abs(prevTransactions
        .filter(t => t.transactionInfo.type === 'expense')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0));

      // For previous Net Worth, we need all transactions up to the previous period end
      const allTransactionsUpToPrevPeriod = await Transaction.find({
        userId,
        'transactionInfo.date': { $lte: prevEndDate }
      });

      const prevAllTimeIncome = allTransactionsUpToPrevPeriod
        .filter(t => t.transactionInfo.type === 'income')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0);

      const prevAllTimeExpenses = Math.abs(allTransactionsUpToPrevPeriod
        .filter(t => t.transactionInfo.type === 'expense')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0));

      // Simplified portfolio historical value (in reality would use historical market data)
      const prevPortfolioValue = currentInvestments.reduce((sum, inv) => 
        sum + (inv.position.shares * inv.position.averageCost), 0);

      const prevNetWorth = prevAllTimeIncome - prevAllTimeExpenses + prevPortfolioValue;

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return { change: current, changePercent: 0, changeType: 'neutral' as const };
        const change = current - previous;
        const changePercent = (change / Math.abs(previous)) * 100;
        return {
          change,
          changePercent,
          changeType: change > 0 ? 'positive' as const : change < 0 ? 'negative' as const : 'neutral' as const
        };
      };

      const netWorthChange = calculateChange(currentNetWorth, prevNetWorth);
      const portfolioChange = calculateChange(totalPortfolioValue, prevPortfolioValue);
      const expenseChange = calculateChange(currentExpenses, prevExpenses);

      // Count goals on track
      const goalsOnTrack = currentGoals.filter(goal => {
        const progress = goal.currentAmount / goal.targetAmount;
        const timeElapsed = (Date.now() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const totalDays = (goal.targetDate.getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const expectedProgress = timeElapsed / totalDays;
        return progress >= expectedProgress * 0.8; // On track if within 80% of expected progress
      }).length;

      res.json({
        success: true,
        data: {
          netWorth: {
            current: currentNetWorth,
            change: netWorthChange.changePercent,
            changeType: netWorthChange.changeType,
            changeText: `${netWorthChange.changePercent >= 0 ? '+' : ''}${netWorthChange.changePercent.toFixed(1)}% from last month`
          },
          income: {
            current: allTimeIncome,
            change: calculateChange(currentIncome, prevIncome).changePercent,
            changeType: calculateChange(currentIncome, prevIncome).changeType,
            changeText: `${calculateChange(currentIncome, prevIncome).changePercent >= 0 ? '+' : ''}${calculateChange(currentIncome, prevIncome).changePercent.toFixed(1)}% from last month`
          },
          portfolio: {
            current: totalPortfolioValue,
            change: portfolioChange.changePercent,
            changeType: portfolioChange.changeType,
            changeText: `${portfolioChange.changePercent >= 0 ? '+' : ''}${portfolioChange.changePercent.toFixed(1)}% this month`
          },
          expenses: {
            current: allTimeExpenses,
            change: expenseChange.changePercent,
            changeType: expenseChange.changePercent <= 0 ? 'positive' : 'negative', // Lower expenses are positive
            changeText: `${expenseChange.changePercent <= 0 ? '' : '+'}${expenseChange.changePercent.toFixed(1)}% from last month`
          },
          goals: {
            total: currentGoals.length,
            onTrack: goalsOnTrack,
            changeText: `${goalsOnTrack} goal${goalsOnTrack !== 1 ? 's' : ''} on track`
          }
        }
      });
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Enhanced Dashboard Stats with True Net Worth (Phase 2)
  static async getEnhancedDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      // Get true net worth calculation
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const currentNetWorth = await NetWorthCalculator.getCurrentNetWorth(userObjectId);
      
      // Get historical comparison for trends (simplified for Phase 2)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // For now, use simple percentage change calculation
      // Phase 4 will implement proper historical trending
      const mockPreviousNetWorth = currentNetWorth.netWorth * 0.95; // Placeholder
      
      const netWorthChange = currentNetWorth.netWorth - mockPreviousNetWorth;
      const netWorthChangePercent = mockPreviousNetWorth > 0 
        ? (netWorthChange / mockPreviousNetWorth) * 100 
        : 0;
      
      res.json({
        success: true,
        data: {
          netWorth: {
            current: currentNetWorth.netWorth,
            change: netWorthChangePercent,
            changeType: netWorthChangePercent >= 0 ? 'positive' : 'negative',
            changeText: `${netWorthChangePercent >= 0 ? '+' : ''}${netWorthChangePercent.toFixed(1)}% from last month`
          },
          liquidAssets: {
            current: currentNetWorth.breakdown.liquidAssets,
            change: 0, // Placeholder for Phase 4
            changeType: 'neutral',
            changeText: 'Tracking enabled'
          },
          portfolio: {
            current: currentNetWorth.breakdown.portfolioValue,
            change: 0, // Will use existing portfolio change logic
            changeType: 'neutral',
            changeText: 'Real-time tracking'
          },
          physicalAssets: {
            current: currentNetWorth.breakdown.physicalAssets,
            change: 0,
            changeType: 'neutral', 
            changeText: 'Manual valuation'
          },
          totalLiabilities: {
            current: currentNetWorth.breakdown.totalLiabilities,
            change: 0,
            changeType: 'neutral',
            changeText: 'Debt tracking active'
          },
          calculatedAt: currentNetWorth.calculatedAt
        }
      });
    } catch (error) {
      logger.error('Error getting enhanced dashboard stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get net worth trend data
  static async getNetWorthTrend(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.query.userId;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { period = '6m', days } = req.query;
      
      // Convert period to days if not provided directly
      let trendDays = parseInt(days as string);
      if (!trendDays) {
        switch (period) {
          case '1m': trendDays = 30; break;
          case '3m': trendDays = 90; break;
          case '6m': trendDays = 180; break;
          case '1y': trendDays = 365; break;
          case 'all': trendDays = 730; break; // 2 years for 'all'
          default: trendDays = 180; // Default to 6 months
        }
      }

      const trendData = await NetWorthTracker.getNetWorthTrend(
        new mongoose.Types.ObjectId(userId as string),
        trendDays
      );

      res.json({
        success: true,
        data: {
          trend: trendData,
          period: `${trendDays} days`,
          calculatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error getting net worth trend:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create manual net worth snapshot
  static async createNetWorthSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.query.userId;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { description } = req.body;

      await NetWorthTracker.onSignificantEvent(
        new mongoose.Types.ObjectId(userId as string),
        'manual_update',
        description || 'Manual snapshot'
      );

      res.json({
        success: true,
        message: 'Net worth snapshot created successfully'
      });
    } catch (error) {
      logger.error('Error creating net worth snapshot:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update portfolio prices
  static async updatePortfolioPrices(req: Request, res: Response): Promise<void> {
    try {
      await PortfolioPriceCache.updateDailyPrices();

      res.json({
        success: true,
        message: 'Portfolio prices updated successfully'
      });
    } catch (error) {
      logger.error('Error updating portfolio prices:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get portfolio price history for a symbol
  static async getPortfolioPriceHistory(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const { days = 30 } = req.query;
      
      if (!symbol) {
        res.status(400).json({ error: 'Symbol is required' });
        return;
      }

      const priceHistory = await PortfolioPriceCache.getAvailablePriceHistory(
        symbol,
        parseInt(days as string) || 30
      );

      res.json({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          history: priceHistory,
          days: parseInt(days as string) || 30
        }
      });
    } catch (error) {
      logger.error('Error getting portfolio price history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 🚀 PERFORMANCE OPTIMIZATION: Single dashboard endpoint
  // Combines all dashboard data into one optimized API call
  static async getCompleteDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        logger.error('❌ User not authenticated for dashboard-complete endpoint');
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check for date filtering parameters
      const { period = 'current_month' } = req.query;
      let dateFilter = {};
      
      if (period === 'current_month') {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        dateFilter = {
          'transactionInfo.date': {
            $gte: currentMonthStart,
            $lte: currentMonthEnd
          }
        };
        logger.info(`📅 Filtering for current month: ${currentMonthStart.toISOString()} to ${currentMonthEnd.toISOString()}`);
      }

      logger.info(`🚀 Loading complete dashboard data for user ${userId} with period: ${period}`);
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // 🚀 PERFORMANCE: Parallel data fetching with .lean() for speed
      const [
        recentTransactions, // For recent transactions display
        filteredTransactions, // For spending analysis - filtered by period
        investments,
        goals,
        accounts,
        assets,
        debts,
        budgets
      ] = await Promise.all([
        Transaction.find({ userId: userObjectId }).lean().limit(25),
        Transaction.find({ userId: userObjectId, ...dateFilter }).lean(),
        Investment.find({ userId: userObjectId }).lean(),
        Goal.find({ userId: userObjectId }).lean(),
        Account.find({ userId: userObjectId }).lean(),
        PhysicalAsset.find({ userId: userObjectId }).lean(),
        Debt.find({ userId: userObjectId }).lean(),
        Budget.find({ userId: userObjectId }).lean()
      ]);

      logger.info(`📊 Data fetched for user ${userId}:`, {
        recentTransactions: recentTransactions.length,
        filteredTransactions: filteredTransactions.length,
        investments: investments.length,
        goals: goals.length,
        accounts: accounts.length,
        assets: assets.length,
        debts: debts.length,
        budgets: budgets.length,
        period: period
      });

      // Calculate enhanced stats (using filtered transactions for current period)
      const dashboardStats = AnalyticsController.calculateEnhancedStats(
        filteredTransactions,
        investments,
        goals,
        accounts,
        assets,
        debts,
        budgets
      );

      // Calculate spending analysis (using filtered transactions for current period)
      const spendingAnalysis = AnalyticsController.calculateSpendingAnalysis(filteredTransactions);

      // Calculate financial health
      const financialHealth = AnalyticsController.calculateFinancialHealth(
        accounts,
        debts,
        assets,
        investments
      );

      // Get recommendations (dashboard scope, limit 5)
      let recommendations = [] as any[];
      try {
        const { Recommendation } = await import('../models');
        recommendations = await Recommendation.find({
          userId: userObjectId,
          'metadata.category': 'dashboard'
        }).sort({ createdAt: -1 }).limit(5).lean();
      } catch {}

      logger.info(`✅ Complete dashboard data prepared successfully for user ${userId}`);

      res.json({
        success: true,
        data: {
          transactions: recentTransactions, // Return recent transactions for dashboard display
          investments,
          goals,
          accounts,
          assets,
          recommendations,
          dashboardStats,
          spendingAnalysis,
          financialHealth,
          dataCounts: {
            transactions: recentTransactions.length,
            totalTransactions: filteredTransactions.length,
            goals: goals.length,
            investments: investments.length,
            accounts: accounts.length,
            assets: assets.length
          },
          loadedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('❌ Error getting complete dashboard data:', error);
      logger.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Helper method to calculate enhanced dashboard stats
  private static calculateEnhancedStats(
    transactions: any[],
    investments: any[],
    goals: any[],
    accounts: any[],
    assets: any[],
    debts: any[],
    budgets: any[]
  ) {
    const totalIncome = transactions
      .filter(t => t.transactionInfo?.type === 'income')
      .reduce((sum, t) => sum + (t.transactionInfo?.amount || 0), 0);

    const totalExpenses = transactions
      .filter(t => t.transactionInfo?.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.transactionInfo?.amount || 0), 0);

    const totalInvestments = investments
      .reduce((sum, inv) => sum + (inv.currentValue || inv.amount || 0), 0);

    const totalAssets = assets
      .reduce((sum, asset) => sum + (asset.currentValue || asset.purchasePrice || 0), 0);

    const totalDebts = debts
      .reduce((sum, debt) => sum + (debt.currentBalance || debt.originalAmount || 0), 0);

    const netWorth = totalInvestments + totalAssets - totalDebts;

    return {
      totalIncome,
      totalExpenses,
      totalInvestments,
      totalAssets,
      totalDebts,
      netWorth,
      monthlySavings: totalIncome - totalExpenses,
      investmentCount: investments.length,
      goalCount: goals.length,
      accountCount: accounts.length,
      assetCount: assets.length
    };
  }

  // Helper method to calculate spending analysis
  private static calculateSpendingAnalysis(transactions: any[]) {
    const expenses = transactions.filter(t => t.transactionInfo?.type === 'expense');
    
    const categoryBreakdown = expenses.reduce((acc, transaction) => {
      const category = transaction.transactionInfo?.category || 'Other';
      const amount = Math.abs(transaction.transactionInfo?.amount || 0);
      acc[category] = (acc[category] || 0) + amount;
      return acc;
    }, {});

    const categoryArray = Object.entries(categoryBreakdown).map(([category, amount]) => ({
      _id: category,
      totalAmount: amount
    }));

    return {
      categoryBreakdown: categoryArray,
      totalExpenses: expenses.reduce((sum, t) => sum + Math.abs(t.transactionInfo?.amount || 0), 0),
      expenseCount: expenses.length
    };
  }

  // Helper method to calculate financial health
  private static calculateFinancialHealth(
    accounts: any[],
    debts: any[],
    assets: any[],
    investments: any[]
  ) {
    const totalLiquidAssets = accounts
      .filter(acc => acc.accountInfo?.type === 'checking' || acc.accountInfo?.type === 'savings')
      .reduce((sum, acc) => sum + (acc.balance || 0), 0);

    const totalDebts = debts
      .reduce((sum, debt) => sum + (debt.currentBalance || debt.originalAmount || 0), 0);

    const totalInvestments = investments
      .reduce((sum, inv) => sum + (inv.currentValue || inv.amount || 0), 0);

    const totalAssets = assets
      .reduce((sum, asset) => sum + (asset.currentValue || asset.purchasePrice || 0), 0);

    const netWorth = totalInvestments + totalAssets - totalDebts;
    const debtToAssetRatio = totalAssets > 0 ? totalDebts / totalAssets : 0;
    const emergencyFundRatio = totalDebts > 0 ? totalLiquidAssets / totalDebts : 0;

    // Simple health score calculation
    let healthScore = 100;
    if (debtToAssetRatio > 0.5) healthScore -= 30;
    if (emergencyFundRatio < 0.1) healthScore -= 25;
    if (totalInvestments < totalDebts) healthScore -= 20;
    if (totalLiquidAssets < 1000) healthScore -= 15;

    return {
      netWorth,
      totalLiquidAssets,
      totalDebts,
      totalInvestments,
      totalAssets,
      debtToAssetRatio,
      emergencyFundRatio,
      healthScore: Math.max(0, Math.min(100, healthScore)),
      riskLevel: healthScore > 80 ? 'Low' : healthScore > 60 ? 'Medium' : 'High'
    };
  }
}
