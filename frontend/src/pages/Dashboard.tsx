import React, { useEffect, useState, useCallback } from 'react';
import { DollarSign, TrendingUp, Target, CreditCard, ArrowUpRight, ArrowDownRight, Lightbulb, PieChart } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import Card from '../components/UI/Card';
import StatCard from '../components/UI/StatCard';
import NetWorthTrend from '../components/Dashboard/NetWorthTrend';
import ExpenseList from '../components/Charts/ExpenseList';
import FinancialHealthScore from '../components/Dashboard/FinancialHealthScore';
import RealtimePortfolioValue from '../components/Dashboard/RealtimePortfolioValue';
import MarketNewsWidget from '../components/Dashboard/MarketNewsWidget';
import AdvancedAnalytics from '../components/Dashboard/AdvancedAnalytics';
import { formatCurrency } from '../utils/currency';
import { useUser } from '../contexts/UserContext';

const Dashboard: React.FC = () => {
  const { 
    user, 
    transactions, 
    setTransactions, 
    goals, 
    setGoals, 
    investments, 
    setInvestments,
    recommendations,
    setRecommendations,
    currency
  } = useStore();

  const { isAuthenticated, isLoading: authLoading, userProfile } = useUser();
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!userProfile) {
      console.log('No userProfile available for loadDashboardData');
      return;
    }

    console.log('Starting to load dashboard data for user:', userProfile.id);

    console.log('Making parallel API calls...');
    const [transactionsData, goalsData, investmentsData, recommendationsData, dashboardStatsData, spendingData, financialHealthData] = await Promise.all([
      apiService.getTransactions(userProfile.id).then(response => {
        // Handle the response format: {success: true, data: [...]}
        const data = (response as any)?.data || response;
        if (!Array.isArray(data)) {
          console.warn('Transactions API returned non-array data:', response);
          return [];
        }
        return data;
      }).catch(err => {
        console.error('Failed to load transactions:', err);
        return []; // Return empty array on error
      }),
      apiService.getGoals(userProfile.id).then(response => {
        // Handle the response format: {success: true, data: [...]}
        const data = (response as any)?.data || response;
        if (!Array.isArray(data)) {
          console.warn('Goals API returned non-array data:', response);
          return [];
        }
        return data;
      }).catch(err => {
        console.error('Failed to load goals:', err);
        return []; // Return empty array on error
      }),
      apiService.getInvestments(userProfile.id).then(data => {
        // Ensure we always get an array for investments
        if (!Array.isArray(data)) {
          console.warn('Investments API returned non-array data:', data);
          return [];
        }
        return data;
      }).catch(err => {
        console.error('Failed to load investments:', err);
        return []; // Return empty array on error
      }),
      apiService.getRecommendations(userProfile.id).then(data => {
        // Ensure we always get an array for recommendations
        if (!Array.isArray(data)) {
          console.warn('Recommendations API returned non-array data:', data);
          return [];
        }
        return data;
      }).catch(err => {
        console.error('Failed to load recommendations:', err);
        return []; // Return empty array on error
      }),
      // Get dashboard statistics
      apiService.getDashboardStats().then(data => {
        console.log('Dashboard stats loaded:', data);
        return data.success ? data.data : null;
      }).catch(err => {
        console.error('Failed to load dashboard stats:', err);
        return null;
      }),
      // Get spending analysis for expense breakdown
      apiService.getSpendingAnalysis().then(data => {
        console.log('Spending analysis loaded:', data);
        if (data.success && data.data.categoryBreakdown) {
          return data.data.categoryBreakdown.map((cat: any) => ({
            name: cat._id || 'Other',
            value: cat.totalAmount
          }));
        }
        return [];
      }).catch(err => {
        console.error('Failed to load spending analysis:', err);
        return [];
      }),
      // Get financial health data
      apiService.getFinancialHealth().then(data => {
        console.log('Financial health loaded:', data);
        return data.success ? data.data : null;
      }).catch(err => {
        console.error('Failed to load financial health:', err);
        return null;
      }),
    ]);

    console.log('Successfully loaded all dashboard data');
    setTransactions(transactionsData);
    setGoals(goalsData);
    setInvestments(investmentsData);
    setRecommendations(recommendationsData);
    
    // Enhance dashboard stats with financial health data
    const enhancedStats = dashboardStatsData ? {
      ...dashboardStatsData,
      financialHealth: financialHealthData
    } : null;
    
    setDashboardStats(enhancedStats);
    setExpenseData(spendingData);
    setLoadingStats(false);
  }, [userProfile, setTransactions, setGoals, setInvestments, setRecommendations]);

  useEffect(() => {
    console.log('Dashboard useEffect triggered:', {
      hasUserProfile: !!userProfile,
      isAuthenticated,
      authLoading,
      userId: userProfile?.id
    });

    if (isAuthenticated && !authLoading && userProfile?.id) {
      console.log('Loading real dashboard data...');
      loadDashboardData();
    } else {
      console.log('User not authenticated or profile not loaded...');
    }
  }, [isAuthenticated, authLoading, userProfile?.id, loadDashboardData]);

  // Calculate metrics - ensure transactions is always an array
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeInvestments = Array.isArray(investments) ? investments : [];
  const safeGoals = Array.isArray(goals) ? goals : [];
  const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];
  
  // Use backend data when available, fallback to local calculations
  // All calculations should match backend methodology for consistency
  const totalIncome = dashboardStats?.income?.current ?? safeTransactions
    .filter((t: any) => (t.transactionInfo?.type || t.type) === 'income')
    .reduce((sum: number, t: any) => sum + (t.transactionInfo?.amount || t.amount || 0), 0);

  const totalExpenses = dashboardStats?.expenses?.current ?? Math.abs(safeTransactions
    .filter((t: any) => (t.transactionInfo?.type || t.type) === 'expense')
    .reduce((sum: number, t: any) => sum + (t.transactionInfo?.amount || t.amount || 0), 0));

  // Use consistent portfolio calculation - work with frontend Investment type structure
  const portfolioValue = dashboardStats?.portfolio?.current ?? safeInvestments.reduce((sum, inv) => {
    // Frontend uses flat structure: inv.shares, inv.currentPrice
    return sum + ((inv.shares || 0) * (inv.currentPrice || 0));
  }, 0);

  // Net Worth = All-time cash position + Portfolio value (matching backend)
  const netWorth = dashboardStats?.netWorth?.current ?? (totalIncome - totalExpenses + portfolioValue);

  // Calculate Financial Health Score using real data or backend API
  const calculateFinancialHealth = () => {
    // If we have dashboard stats from backend, use that data
    if (dashboardStats && !loadingStats && dashboardStats.financialHealth) {
      return dashboardStats.financialHealth;
    }

    // Check if we have any meaningful frontend data for fallback
    const hasTransactionData = safeTransactions.length > 0;
    const hasInvestmentData = safeInvestments.length > 0;
    const hasAnyFinancialData = hasTransactionData || hasInvestmentData;

    // If no financial data exists anywhere, return zero state
    if (!hasAnyFinancialData) {
      return {
        overall: 0,
        emergencyFund: 0,
        cashFlow: 0, 
        debtToIncome: 0,
        savingsRate: 0,
        diversification: 0
      };
    }

    // Fallback to local calculation only if we have some real data
    const monthlyIncome = totalIncome / 6; // Assuming 6 months of data
    const monthlyExpenses = totalExpenses / 6;
    
    // Prevent division by zero and handle edge cases
    const emergencyFundMonths = monthlyExpenses > 0 ? portfolioValue / monthlyExpenses : 0;
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
    
    // Ensure all values are valid numbers
    const overall = Math.min(100, Math.max(0, 
      (emergencyFundMonths * 15) + 
      (savingsRate * 0.5) + 
      (portfolioValue > 0 ? 20 : 0) + 
      (monthlyIncome > monthlyExpenses ? 20 : 0)
    ));
    
    return {
      overall: isNaN(overall) ? 0 : overall, // Changed from 50 to 0
      emergencyFund: isNaN(emergencyFundMonths * 20) ? 0 : Math.min(100, emergencyFundMonths * 20), // Changed from 50 to 0
      cashFlow: hasTransactionData ? (monthlyIncome > monthlyExpenses ? 85 : 45) : 0, // Only calculate if we have transaction data
      debtToIncome: hasTransactionData ? 75 : 0, // Only show good debt score if we have transaction data
      savingsRate: isNaN(savingsRate * 4) ? 0 : Math.min(100, savingsRate * 4), // Changed from 50 to 0
      diversification: hasInvestmentData ? (safeInvestments.length > 3 ? 80 : 50) : 0 // Only calculate if we have investment data
    };
  };

  const financialHealth = calculateFinancialHealth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's your financial overview for this month.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Net Worth"
          value={formatCurrency(netWorth, currency)}
          change={dashboardStats?.netWorth?.changeText || "Calculating..."}
          changeType={dashboardStats?.netWorth?.changeType || "neutral"}
          icon={DollarSign}
          iconColor="text-green-500"
        />
        <StatCard
          title="Total Income"
          value={formatCurrency(totalIncome, currency)}
          change={dashboardStats?.income?.changeText || "Calculating..."}
          changeType={dashboardStats?.income?.changeType || "neutral"}
          icon={ArrowUpRight}
          iconColor="text-green-500"
        />
        <StatCard
          title="Portfolio Value"
          value={formatCurrency(portfolioValue, currency)}
          change={dashboardStats?.portfolio?.changeText || "Calculating..."}
          changeType={dashboardStats?.portfolio?.changeType || "neutral"}
          icon={TrendingUp}
          iconColor="text-violet-500"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(totalExpenses, currency)}
          change={dashboardStats?.expenses?.changeText || "Calculating..."}
          changeType={dashboardStats?.expenses?.changeType || "neutral"}
          icon={CreditCard}
          iconColor="text-blue-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <NetWorthTrend currency={currency} />

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Expense Breakdown</h3>
          <div className="h-[400px]">
            {loadingStats ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500 dark:text-gray-400">Loading expense data...</div>
              </div>
            ) : expenseData.length > 0 ? (
              <ExpenseList data={expenseData} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-gray-400 mb-4">
                  <PieChart className="w-12 h-12 mx-auto" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No Expense Data
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  You haven't added any transactions yet
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Add some transactions to see your expense breakdown
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Financial Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <FinancialHealthScore score={financialHealth} />
        
        {/* AI Recommendations */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">AI Recommendations</h3>
          <div className="space-y-4">
            {safeRecommendations.length > 0 ? (
              safeRecommendations.slice(0, 2).map((rec) => (
                <div key={rec.id} className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{rec.title}</h4>
                    <span className="text-xs bg-violet-100 dark:bg-violet-800 text-violet-700 dark:text-violet-300 px-2 py-1 rounded-full">
                      {Math.round(rec.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{rec.description}</p>
                  <div className="space-y-1">
                    {rec.actionItems.slice(0, 2).map((item, index) => (
                      <div key={index} className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No AI Recommendations Yet
                </h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Add your financial data and investments to receive personalized AI-powered recommendations.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 🚀 NEW: Enhanced Yahoo Finance & News Integration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RealtimePortfolioValue investments={safeInvestments} currency={currency} />
        <MarketNewsWidget />
      </div>

      {/* 🚀 NEW: Advanced Portfolio Analytics */}
      <div className="mb-8">
        <AdvancedAnalytics />
      </div>

      {/* Recent Transactions and Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {safeTransactions.length > 0 ? (
              safeTransactions.slice(0, 5).map((transaction) => (
                <div key={(transaction as any)._id || (transaction as any).id} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 ${
                      ((transaction as any).transactionInfo?.type || (transaction as any).type) === 'income' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
                    }`}>
                      {((transaction as any).transactionInfo?.type || (transaction as any).type) === 'income' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{(transaction as any).transactionInfo?.description || (transaction as any).description}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{(transaction as any).transactionInfo?.category || (transaction as any).category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      ((transaction as any).transactionInfo?.type || (transaction as any).type) === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {((transaction as any).transactionInfo?.type || (transaction as any).type) === 'income' ? '+' : ''}{formatCurrency(Math.abs((transaction as any).transactionInfo?.amount || (transaction as any).amount || 0), currency)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date((transaction as any).transactionInfo?.date || (transaction as any).date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <CreditCard className="w-12 h-12 mx-auto" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No Recent Transactions
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  You haven't added any transactions yet
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Start adding transactions to track your income and expenses.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Goals Progress */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Savings Goals Progress</h3>
          <div className="space-y-4">
            {safeGoals.length > 0 ? (
              safeGoals.slice(0, 3).map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                return (
                  <div key={goal.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{goal.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        goal.priority === 'high' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                        goal.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                        'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      }`}>
                        {goal.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{goal.description}</p>
                    <div className="mb-2">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span>{formatCurrency(goal.currentAmount, currency)}</span>
                        <span>{formatCurrency(goal.targetAmount, currency)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Target: {new Date(goal.targetDate).toLocaleDateString()}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <Target className="w-12 h-12 mx-auto" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No Savings Goals Set
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  You haven't created any savings goals yet
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Create your first savings goal to start tracking your financial progress.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;