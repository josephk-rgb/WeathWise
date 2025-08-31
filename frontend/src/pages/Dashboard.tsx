import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Target, CreditCard, ArrowUpRight, ArrowDownRight, Lightbulb } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import Card from '../components/UI/Card';
import StatCard from '../components/UI/StatCard';
import NetWorthTrend from '../components/Dashboard/NetWorthTrend';
import ExpenseList from '../components/Charts/ExpenseList';
import FinancialHealthScore from '../components/Dashboard/FinancialHealthScore';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../hooks/useAuth';

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

  const { isAuthenticated, isLoading: authLoading, tokenReady } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    console.log('Dashboard useEffect triggered:', {
      hasUser: !!user,
      isAuthenticated,
      authLoading,
      tokenReady
    });

    if (user && isAuthenticated && !authLoading && tokenReady) {
      console.log('Loading real dashboard data...');
      loadDashboardData();
    } else {
      console.log('User not authenticated or loading...');
    }
  }, [user, isAuthenticated, authLoading, tokenReady]);

  const loadDashboardData = async () => {
    if (!user) {
      console.log('No user available for loadDashboardData');
      return;
    }

    console.log('Starting to load dashboard data for user:', user.id);

    console.log('Making parallel API calls...');
    const [transactionsData, goalsData, investmentsData, recommendationsData, dashboardStatsData, spendingData, financialHealthData] = await Promise.all([
      apiService.getTransactions(user.id).then(data => {
        // Ensure we always get an array for transactions
        if (!Array.isArray(data)) {
          console.warn('Transactions API returned non-array data:', data);
          return [];
        }
        return data;
      }).catch(err => {
        console.error('Failed to load transactions:', err);
        return []; // Return empty array on error
      }),
      apiService.getGoals(user.id).then(data => {
        // Ensure we always get an array for goals
        if (!Array.isArray(data)) {
          console.warn('Goals API returned non-array data:', data);
          return [];
        }
        return data;
      }).catch(err => {
        console.error('Failed to load goals:', err);
        return []; // Return empty array on error
      }),
      apiService.getInvestments(user.id).then(data => {
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
      apiService.getRecommendations(user.id).then(data => {
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
  };

  // Calculate metrics - ensure transactions is always an array
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeInvestments = Array.isArray(investments) ? investments : [];
  const safeGoals = Array.isArray(goals) ? goals : [];
  const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];
  
  const totalIncome = safeTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = Math.abs(safeTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0));

  const netWorth = totalIncome - totalExpenses + safeInvestments.reduce((sum, inv) => 
    sum + (inv.shares * inv.currentPrice), 0);

  const portfolioValue = safeInvestments.reduce((sum, inv) => 
    sum + (inv.shares * inv.currentPrice), 0);

  // Calculate Financial Health Score using real data or backend API
  const calculateFinancialHealth = () => {
    // If we have dashboard stats from backend, try to use enhanced data
    if (dashboardStats && !loadingStats) {
      // Use backend-calculated financial health if available
      return {
        overall: dashboardStats.financialHealth?.overall || 50,
        emergencyFund: dashboardStats.financialHealth?.emergencyFund || 50,
        cashFlow: dashboardStats.financialHealth?.cashFlow || (totalIncome > totalExpenses ? 85 : 45),
        debtToIncome: dashboardStats.financialHealth?.debtToIncome || 0,
        savingsRate: dashboardStats.financialHealth?.savingsRate || 50,
        diversification: dashboardStats.financialHealth?.diversification || (safeInvestments.length > 3 ? 80 : 50)
      };
    }

    // Fallback to local calculation if backend data not available
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
      overall: isNaN(overall) ? 50 : overall,
      emergencyFund: isNaN(emergencyFundMonths * 20) ? 50 : Math.min(100, emergencyFundMonths * 20),
      cashFlow: monthlyIncome > monthlyExpenses ? 85 : 45,
      debtToIncome: 0, // No debt data available yet
      savingsRate: isNaN(savingsRate * 4) ? 50 : Math.min(100, savingsRate * 4),
      diversification: safeInvestments.length > 3 ? 80 : 50
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
          title="Portfolio Value"
          value={formatCurrency(portfolioValue, currency)}
          change={dashboardStats?.portfolio?.changeText || "Calculating..."}
          changeType={dashboardStats?.portfolio?.changeType || "neutral"}
          icon={TrendingUp}
          iconColor="text-violet-500"
        />
        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(totalExpenses, currency)}
          change={dashboardStats?.expenses?.changeText || "Calculating..."}
          changeType={dashboardStats?.expenses?.changeType || "neutral"}
          icon={CreditCard}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Savings Goals"
          value={`${safeGoals.length} active`}
          change={dashboardStats?.goals?.changeText || "Calculating..."}
          changeType="positive"
          icon={Target}
          iconColor="text-magenta-500"
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
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No expense data available</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Add some transactions to see your expense breakdown</p>
                </div>
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

      {/* Recent Transactions and Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {safeTransactions.length > 0 ? (
              safeTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 ${
                      transaction.type === 'income' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
                    }`}>
                      {transaction.type === 'income' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{transaction.description}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : ''}{formatCurrency(Math.abs(transaction.amount), currency)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(transaction.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No Recent Transactions
                </h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
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
                <Target className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No Savings Goals Set
                </h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
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