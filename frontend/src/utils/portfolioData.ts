import { Investment } from '../types';

// This utility is now used as a fallback when real historical data is not available
// It generates simulated portfolio history for demo purposes
export const generatePortfolioHistory = (investments: Investment[], days: number = 365) => {
  if (investments.length === 0) {
    return [];
  }

  const history = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Calculate initial portfolio value based on purchase prices
  let currentValue = investments.reduce((sum, inv) => sum + (inv.shares * inv.purchasePrice), 0);

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Simulate realistic daily price movements (simple random walk with some trend)
    const dailyChange = (Math.random() - 0.5) * 0.02; // ±1% daily change
    currentValue *= (1 + dailyChange);

    // Add some market trends and cycles for more realism
    const trend = Math.sin(i / 30) * 0.01; // Monthly cycles
    const longTermTrend = i / days * 0.1; // Gradual growth over time
    currentValue *= (1 + trend + longTermTrend / 365);

    history.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(currentValue, 0), // Ensure non-negative
    });
  }

  return history;
};

// Helper function to format portfolio history data for charts
export const formatPortfolioHistory = (rawData: any[]) => {
  if (!Array.isArray(rawData)) {
    console.warn('Invalid portfolio history data:', rawData);
    return [];
  }

  return rawData.map(item => ({
    date: item.date,
    value: typeof item.value === 'number' ? item.value : 0
  }));
};
