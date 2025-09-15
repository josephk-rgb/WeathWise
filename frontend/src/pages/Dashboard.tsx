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
// ...existing code...
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
  const [accounts, setAccounts] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!userProfile) {
      console.log('❌ No userProfile available for loadDashboardData');
      return;
    }

    const userId = userProfile.id || (userProfile as any)._id;
    console.log('🚀 Starting optimized dashboard data load for user:', userId);
    console.log('🔍 [FRONTEND DEBUG] User profile:', userProfile);
    console.log('🔍 [FRONTEND DEBUG] Auth status:', { isAuthenticated, authLoading });

    try {
      setLoadingStats(true);
      
      // 🚀 PERFORMANCE OPTIMIZATION: Single API call instead of 9 parallel calls
      console.log('📡 Making single optimized API call...');
      const startTime = Date.now();
      
      // Clear cache to ensure fresh data
      apiService.clearCache();
      
      const response = await apiService.getCompleteDashboardData();
      
      const endTime = Date.now();
      console.log(`⚡ Dashboard data loaded in ${endTime - startTime}ms`);
      console.log('🔍 [FRONTEND DEBUG] API Response:', response);
      
      if (response.success && response.data) {
        const data = response.data;
        
        console.log('✅ Complete dashboard data received:', {
          transactions: data.dataCounts?.transactions || 0,
          totalTransactions: data.dataCounts?.totalTransactions || 0,
          goals: data.dataCounts?.goals || 0,
          investments: data.dataCounts?.investments || 0,
          accounts: data.dataCounts?.accounts || 0,
          assets: data.dataCounts?.assets || 0,
          loadedAt: data.loadedAt
        });

        // Set all data from single response
        setTransactions(data.transactions || []);
        setGoals(data.goals || []);
        setInvestments(data.investments || []);
        setRecommendations(data.recommendations || []);
        setAccounts(data.accounts || []);
        setAssets(data.assets || []);
        
        // Set dashboard stats
        setDashboardStats(data.dashboardStats);
        
        // Set expense data from backend spending analysis (already filtered by current month)
        console.log('🔍 [FRONTEND DEBUG] Raw spending analysis data:', data.spendingAnalysis);
        console.log('🔍 [FRONTEND DEBUG] Category breakdown:', data.spendingAnalysis?.categoryBreakdown);
        console.log('🔍 [FRONTEND DEBUG] Filtered transactions count:', data.dataCounts?.totalTransactions);
        console.log('🔍 [FRONTEND DEBUG] Recent transactions count:', data.dataCounts?.transactions);
        
        // Backend now handles current month filtering, so we can use the data directly
        const expenseData = data.spendingAnalysis?.categoryBreakdown?.map((cat: any) => ({
          name: cat._id || 'Other',
          value: cat.totalAmount
        })) || [];
        
        console.log('🔍 [FRONTEND DEBUG] Processed expense data from backend:', expenseData);
        setExpenseData(expenseData);
        
        console.log('🎯 Dashboard data state updated successfully');
      } else {
        console.warn('⚠️ Dashboard response format unexpected:', response);
        // Fallback to empty state
        setTransactions([]);
        setGoals([]);
        setInvestments([]);
        setRecommendations([]);
        setAccounts([]);
        setAssets([]);
        setDashboardStats(null);
        setExpenseData([]);
      }
    } catch (error) {
      console.error('❌ Failed to load complete dashboard data:', error);
      
      // Fallback: try individual API calls if the optimized endpoint fails
      console.log('🔄 Falling back to individual API calls...');
      
      try {
        const [transactionsData, goalsData, investmentsData, recommendationsData, dashboardStatsData, spendingData, financialHealthData, accountsData, assetsData] = await Promise.all([
          apiService.getTransactions(userProfile.id).then(response => {
            const data = (response as any)?.data || response;
            return Array.isArray(data) ? data : [];
          }).catch(() => []),
          apiService.getGoals(userProfile.id).then(response => {
            const data = (response as any)?.data || response;
            return Array.isArray(data) ? data : [];
          }).catch(() => []),
          apiService.getInvestments(userProfile.id).then(data => {
            return Array.isArray(data) ? data : [];
          }).catch(() => []),
          apiService.getRecommendations(userProfile.id).then(data => {
            return Array.isArray(data) ? data : [];
          }).catch(() => []),
          apiService.getEnhancedDashboardStats().then(data => {
            return data.success ? data.data : null;
          }).catch(() => null),
          apiService.getSpendingAnalysis().then(data => {
            if (data.success && data.data.categoryBreakdown) {
              return data.data.categoryBreakdown.map((cat: any) => ({
                name: cat._id || 'Other',
                value: cat.totalAmount
              }));
            }
            return [];
          }).catch(() => []),
          apiService.getFinancialHealth().then(data => {
            return data.success ? data.data : null;
          }).catch(() => null),
          apiService.getAccounts().then(data => {
            return Array.isArray(data) ? data : [];
          }).catch(() => []),
          apiService.getAssets().then(data => {
            return Array.isArray(data) ? data : [];
          }).catch(() => [])
        ]);

        console.log('✅ Fallback data loaded successfully');
        setTransactions(transactionsData);
        setGoals(goalsData);
        setInvestments(investmentsData);
        setRecommendations(recommendationsData);
        setAccounts(accountsData);
        setAssets(assetsData);
        
        const enhancedStats = dashboardStatsData ? {
          ...dashboardStatsData,
          financialHealth: financialHealthData
        } : null;
        
        setDashboardStats(enhancedStats);
        setExpenseData(spendingData);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        // Set empty state
        setTransactions([]);
        setGoals([]);
        setInvestments([]);
        setRecommendations([]);
        setAccounts([]);
        setAssets([]);
        setDashboardStats(null);
        setExpenseData([]);
      }
    } finally {
      setLoadingStats(false);
    }
  }, [userProfile, setTransactions, setGoals, setInvestments, setRecommendations]);

  useEffect(() => {
    const userId = userProfile?.id || (userProfile as any)?._id;
    console.log('Dashboard useEffect triggered:', {
      hasUserProfile: !!userProfile,
      isAuthenticated,
      authLoading,
      userId: userId,
      profileId: userProfile?.id,
      profile_id: (userProfile as any)?._id
    });

    if (isAuthenticated && !authLoading && userId) {
      console.log('Loading real dashboard data...');
      loadDashboardData();
    } else {
      console.log('User not authenticated or profile not loaded...', {
        isAuthenticated,
        authLoading,
        userId,
        userProfile: !!userProfile
      });
    }
  }, [isAuthenticated, authLoading, userProfile?.id, (userProfile as any)?._id, loadDashboardData]);

  // Calculate metrics - ensure transactions is always an array
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeInvestments = Array.isArray(investments) ? investments : [];
  const safeGoals = Array.isArray(goals) ? goals : [];
  const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const safeAssets = Array.isArray(assets) ? assets : [];
  
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

  // Calculate account balances (excluding credit cards and loans which are liabilities)
  const accountsValue = safeAccounts
    .filter(acc => !['credit_card', 'loan'].includes(acc.type))
    .reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Calculate physical assets equity (current value minus loan balance)
  const assetsValue = safeAssets.reduce((sum, asset) => {
    const currentValue = asset.currentValue || 0;
    const loanBalance = asset.hasLoan && asset.loanInfo ? (asset.loanInfo.remainingBalance || 0) : 0;
    return sum + (currentValue - loanBalance);
  }, 0);

  // Enhanced Net Worth = Cash position + Portfolio value + Account balances + Asset equity
  // Prioritize enhanced dashboard stats (from NetWorthCalculator) for consistency
  const netWorth = dashboardStats?.netWorth?.current ?? (totalIncome - totalExpenses + portfolioValue + accountsValue + assetsValue);

  // Debug: Log net worth sources for consistency verification
  if (dashboardStats?.netWorth?.current && process.env.NODE_ENV === 'development') {
    console.log('💰 Net Worth Values:', {
      fromEnhancedStats: dashboardStats.netWorth.current,
      fromLocalCalculation: totalIncome - totalExpenses + portfolioValue + accountsValue + assetsValue,
      difference: dashboardStats.netWorth.current - (totalIncome - totalExpenses + portfolioValue + accountsValue + assetsValue)
    });
  }

  // Calculate Financial Health Score using real data or backend API
  const calculateFinancialHealth = () => {
    // If we have dashboard stats from backend, use that data
    if (dashboardStats && !loadingStats && dashboardStats.financialHealth) {
      return dashboardStats.financialHealth;
    }

    // Check if we have any meaningful frontend data for fallback
    const hasTransactionData = safeTransactions.length > 0;
    const hasInvestmentData = safeInvestments.length > 0;
    const hasAccountData = safeAccounts.length > 0;
    const hasAssetData = safeAssets.length > 0;
    const hasAnyFinancialData = hasTransactionData || hasInvestmentData || hasAccountData || hasAssetData;

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
          Welcome back, {userProfile?.profile?.firstName 
            ? `${userProfile.profile.firstName} ${userProfile.profile?.lastName || ''}`.trim()
            : userProfile?.email?.split('@')[0] 
            || user?.name 
            || 'User'}!
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
        <NetWorthTrend 
          currency={currency} 
          currentNetWorth={dashboardStats?.netWorth?.current}
        />

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Expense Breakdown</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Current Month ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
            </div>
          </div>
          <div className="h-[400px] overflow-y-auto">
            {loadingStats ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500 dark:text-gray-400">Loading expense data...</div>
              </div>
            ) : expenseData.length > 0 ? (
              <>
                <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  Showing {expenseData.length} categories for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <ExpenseList data={expenseData} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-gray-400 mb-4">
                  <PieChart className="w-12 h-12 mx-auto" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No Expense Data This Month
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  No expenses recorded for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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

  {/* Advanced Portfolio Analytics removed as requested */}

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