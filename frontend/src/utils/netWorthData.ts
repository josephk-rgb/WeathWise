import { Transaction, Investment } from '../types';

export interface NetWorthData {
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  investments: number;
  cash: number;
}

export const generateNetWorthHistory = (
  transactions: Transaction[] = [],
  investments: Investment[] = [],
  days: number = 365
): NetWorthData[] => {
  const history: NetWorthData[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Calculate current values
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = Math.abs(transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0));

  const currentCash = totalIncome - totalExpenses;
  const currentInvestments = investments.reduce((sum, inv) => 
    sum + (inv.shares * inv.currentPrice), 0);

  // Starting values (simulate historical data)
  const startingCash = Math.max(currentCash * 0.7, 1000);
  const startingInvestments = Math.max(currentInvestments * 0.8, 0);

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Calculate progress ratio
    const progress = i / days;

    // Simulate gradual growth with some volatility
    const baseGrowth = 1 + (progress * 0.08); // 8% annual growth
    const volatility = 1 + (Math.sin(i / 30) * 0.02 + (Math.random() - 0.5) * 0.01); // Monthly cycles + random
    
    // Calculate cash progression (income - expenses over time)
    const cash = Math.max(
      startingCash + (currentCash - startingCash) * progress + (Math.random() - 0.5) * 500,
      0
    );

    // Calculate investment progression with growth
    const investments = startingInvestments * baseGrowth * volatility;

    // Simulate some liabilities (debt, loans, etc.)
    const liabilities = Math.max(
      5000 * (1 - progress * 0.3) + (Math.random() - 0.5) * 200,
      0
    );

    const assets = cash + investments;
    const netWorth = assets - liabilities;

    history.push({
      date: date.toISOString().split('T')[0],
      netWorth: Math.round(netWorth),
      assets: Math.round(assets),
      liabilities: Math.round(liabilities),
      investments: Math.round(investments),
      cash: Math.round(cash),
    });
  }

  return history;
};

export const calculateNetWorthMetrics = (data: NetWorthData[]) => {
  if (data.length < 2) {
    return {
      current: data[0]?.netWorth || 0,
      change: 0,
      changePercent: 0,
      trend: 'neutral' as const,
    };
  }

  const current = data[data.length - 1].netWorth;
  const previous = data[0].netWorth;
  const change = current - previous;
  const changePercent = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;

  return {
    current,
    change,
    changePercent,
    trend: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
  };
};
