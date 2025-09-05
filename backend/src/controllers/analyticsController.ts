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

  // Get dashboard statistics with change calculations
  static async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Get current period (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      // Get previous period (30 days before that) for comparison
      const prevEndDate = new Date(startDate);
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevEndDate.getDate() - 30);

      // Get current period data
      const [currentTransactions, currentInvestments, currentGoals] = await Promise.all([
        Transaction.find({
          userId,
          'transactionInfo.date': { $gte: startDate, $lte: endDate }
        }),
        Investment.find({ userId, isActive: true }),
        Goal.find({ userId, isActive: true })
      ]);

      // Get previous period data for comparison
      const prevTransactions = await Transaction.find({
        userId,
        'transactionInfo.date': { $gte: prevStartDate, $lte: prevEndDate }
      });

      // Calculate current metrics
      const currentIncome = currentTransactions
        .filter(t => t.transactionInfo.type === 'income')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0);

      const currentExpenses = Math.abs(currentTransactions
        .filter(t => t.transactionInfo.type === 'expense')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0));

      const currentPortfolioValue = currentInvestments.reduce((sum, inv) => 
        sum + inv.position.marketValue, 0);

      const currentNetWorth = currentIncome - currentExpenses + currentPortfolioValue;

      // Calculate previous metrics
      const prevIncome = prevTransactions
        .filter(t => t.transactionInfo.type === 'income')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0);

      const prevExpenses = Math.abs(prevTransactions
        .filter(t => t.transactionInfo.type === 'expense')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0));

      // Calculate portfolio change (simplified - in reality would use historical data)
      const prevPortfolioValue = currentInvestments.reduce((sum, inv) => 
        sum + (inv.position.shares * inv.position.averageCost), 0);

      const prevNetWorth = prevIncome - prevExpenses + prevPortfolioValue;

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
      const portfolioChange = calculateChange(currentPortfolioValue, prevPortfolioValue);
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
          portfolio: {
            current: currentPortfolioValue,
            change: portfolioChange.changePercent,
            changeType: portfolioChange.changeType,
            changeText: `${portfolioChange.changePercent >= 0 ? '+' : ''}${portfolioChange.changePercent.toFixed(1)}% this month`
          },
          expenses: {
            current: currentExpenses,
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
}
