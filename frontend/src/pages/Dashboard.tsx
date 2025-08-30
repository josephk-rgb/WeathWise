import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Target, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import Card from '../components/UI/Card';
import StatCard from '../components/UI/StatCard';
import NetWorthChart from '../components/Charts/NetWorthChart';
import PieChart from '../components/Charts/PieChart';
import ExpenseBarChart from '../components/Charts/ExpenseBarChart';
import ExpenseList from '../components/Charts/ExpenseList';
import FinancialHealthScore from '../components/Dashboard/FinancialHealthScore';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../hooks/useAuth';
import { testAuthentication } from '../utils/authTest';

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
  const [authDebug, setAuthDebug] = useState<any>(null);

  // Debug function to test authentication
  const runAuthTest = async () => {
    const result = await testAuthentication();
    setAuthDebug(result);
    console.log('Auth test result:', result);
  };

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
    } else if (user && isAuthenticated && !authLoading && !tokenReady) {
      console.log('User authenticated but token not ready, loading mock data');
      loadMockData();
    } else if (!user && !authLoading) {
      console.log('No user found, loading mock data for development');
      // Load mock data immediately if no user (for development)
      loadMockData();
    } else {
      console.log('Still loading auth state...');
    }
  }, [user, isAuthenticated, authLoading, tokenReady]);

  const loadDashboardData = async () => {
    if (!user) {
      console.log('No user available for loadDashboardData');
      return;
    }

    console.log('Starting to load dashboard data for user:', user.id);

    console.log('Making parallel API calls...');
    const [transactionsData, goalsData, investmentsData, recommendationsData] = await Promise.all([
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
    ]);

    console.log('Successfully loaded all dashboard data');
    setTransactions(transactionsData);
    setGoals(goalsData);
    setInvestments(investmentsData);
    setRecommendations(recommendationsData);
  };

  const loadMockData = () => {
    // Mock data for when API is not available
    const mockTransactions = [
      { id: '1', userId: user?.id || 'mock-user', amount: 5000, description: 'Salary', category: 'Income', type: 'income' as const, date: new Date(), currency: 'USD' },
      { id: '2', userId: user?.id || 'mock-user', amount: -1200, description: 'Rent', category: 'Housing', type: 'expense' as const, date: new Date(), currency: 'USD' },
      { id: '3', userId: user?.id || 'mock-user', amount: -300, description: 'Groceries', category: 'Food', type: 'expense' as const, date: new Date(), currency: 'USD' },
      { id: '4', userId: user?.id || 'mock-user', amount: -150, description: 'Utilities', category: 'Utilities', type: 'expense' as const, date: new Date(), currency: 'USD' },
      { id: '5', userId: user?.id || 'mock-user', amount: -200, description: 'Entertainment', category: 'Entertainment', type: 'expense' as const, date: new Date(), currency: 'USD' },
    ];

    const mockGoals = [
      { id: '1', userId: user?.id || 'mock-user', title: 'Emergency Fund', description: 'Save for emergencies', targetAmount: 10000, currentAmount: 5000, targetDate: new Date('2024-12-31'), category: 'Savings', priority: 'high' as const, currency: 'USD' },
      { id: '2', userId: user?.id || 'mock-user', title: 'Vacation Fund', description: 'Save for vacation', targetAmount: 5000, currentAmount: 2000, targetDate: new Date('2024-06-30'), category: 'Travel', priority: 'medium' as const, currency: 'USD' },
    ];

    const mockInvestments = [
      { id: '1', userId: user?.id || 'mock-user', symbol: 'AAPL', name: 'Apple Inc.', shares: 10, purchasePrice: 150, currentPrice: 175, type: 'stock' as const, purchaseDate: new Date('2023-01-01'), currency: 'USD' },
      { id: '2', userId: user?.id || 'mock-user', symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 5, purchasePrice: 2800, currentPrice: 3000, type: 'stock' as const, purchaseDate: new Date('2023-02-01'), currency: 'USD' },
    ];

    const mockRecommendations = [
      { id: '1', userId: user?.id || 'mock-user', type: 'investment' as const, title: 'Diversify Portfolio', description: 'Consider adding bonds to reduce risk', confidence: 0.85, reasoning: ['Low bond allocation', 'High market volatility'], actionItems: ['Research bond ETFs', 'Allocate 20% to bonds'], createdAt: new Date() },
      { id: '2', userId: user?.id || 'mock-user', type: 'savings' as const, title: 'Increase Emergency Fund', description: 'Your emergency fund is below recommended levels', confidence: 0.92, reasoning: ['Current fund covers 2 months', 'Recommended 6 months'], actionItems: ['Save $500/month', 'Cut entertainment expenses'], createdAt: new Date() },
    ];

    setTransactions(mockTransactions);
    setGoals(mockGoals);
    setInvestments(mockInvestments);
    setRecommendations(mockRecommendations);
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

  // Calculate Financial Health Score
  const calculateFinancialHealth = () => {
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
      debtToIncome: 75, // Mock value
      savingsRate: isNaN(savingsRate * 4) ? 50 : Math.min(100, savingsRate * 4),
      diversification: safeInvestments.length > 3 ? 80 : 50
    };
  };

  const financialHealth = calculateFinancialHealth();

  // Chart data - Generate more realistic net worth progression
  const generateNetWorthData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Start with a base value and add realistic growth
    let baseValue = 15000;
    const data = [];
    
    for (let i = 0; i <= currentMonth; i++) {
      // Add some volatility and growth
      const growth = (Math.random() - 0.3) * 0.1; // -3% to +7% monthly growth
      baseValue *= (1 + growth);
      
      // Add seasonal effects (bonuses, tax returns, etc.)
      if (i === 11) baseValue *= 1.05; // December bonus
      if (i === 3) baseValue *= 1.03; // Tax return season
      
      data.push({
        month: months[i],
        value: Math.round(baseValue),
        date: new Date(currentYear, i, 1).toISOString()
      });
    }
    
    // Update the last value to match current net worth
    if (data.length > 0) {
      data[data.length - 1].value = Math.round(netWorth);
    }
    
    return data;
  };

  const netWorthData = generateNetWorthData();

  const expenseData = [
    { name: 'Housing', value: 1200 },
    { name: 'Food & Dining', value: 385 },
    { name: 'Transportation', value: 280 },
    { name: 'Entertainment', value: 145 },
    { name: 'Utilities', value: 150 },
    { name: 'Shopping', value: 95 },
    { name: 'Healthcare', value: 85 },
    { name: 'Other', value: 140 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
          Welcome back, {user?.name}!
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
          change="+12.5% from last month"
          changeType="positive"
          icon={DollarSign}
          iconColor="text-green-500"
        />
        <StatCard
          title="Portfolio Value"
          value={formatCurrency(portfolioValue, currency)}
          change="+8.2% this month"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-violet-500"
        />
        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(totalExpenses, currency)}
          change="-5.1% from last month"
          changeType="positive"
          icon={CreditCard}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Savings Goals"
          value={`${safeGoals.length} active`}
          change="2 goals on track"
          changeType="positive"
          icon={Target}
          iconColor="text-magenta-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <NetWorthChart data={netWorthData} currency={currency} />

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Expense Breakdown</h3>
          <div className="h-[400px]">
            <ExpenseList data={expenseData} />
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
            {safeRecommendations.slice(0, 2).map((rec) => (
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
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Transactions and Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {safeTransactions.slice(0, 5).map((transaction) => (
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
            ))}
          </div>
        </Card>

        {/* Goals Progress */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Savings Goals Progress</h3>
          <div className="space-y-4">
            {safeGoals.slice(0, 3).map((goal) => {
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
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;