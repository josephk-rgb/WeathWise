import { Investment } from '../types';

export const generatePortfolioHistory = (investments: Investment[], days: number = 365) => {
  if (investments.length === 0) {
    return [];
  }

  const history = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Calculate initial portfolio value
  let currentValue = investments.reduce((sum, inv) => sum + (inv.shares * inv.purchasePrice), 0);

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Simulate daily price movements (simple random walk)
    const dailyChange = (Math.random() - 0.5) * 0.02; // ±1% daily change
    currentValue *= (1 + dailyChange);

    // Add some volatility and trends
    const trend = Math.sin(i / 30) * 0.01; // Monthly cycles
    currentValue *= (1 + trend);

    history.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(currentValue, 0), // Ensure non-negative
    });
  }

  return history;
};
