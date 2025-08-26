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

export const generateSampleInvestments = (): Investment[] => {
  return [
    {
      id: '1',
      userId: 'user1',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      shares: 10,
      purchasePrice: 150.00,
      currentPrice: 175.50,
      type: 'stock',
      purchaseDate: new Date('2023-01-15'),
      currency: 'USD',
    },
    {
      id: '2',
      userId: 'user1',
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      shares: 5,
      purchasePrice: 200.00,
      currentPrice: 240.75,
      type: 'stock',
      purchaseDate: new Date('2023-02-20'),
      currency: 'USD',
    },
    {
      id: '3',
      userId: 'user1',
      symbol: 'BTC',
      name: 'Bitcoin',
      shares: 0.5,
      purchasePrice: 45000.00,
      currentPrice: 52000.00,
      type: 'crypto',
      purchaseDate: new Date('2023-03-10'),
      currency: 'USD',
    },
    {
      id: '4',
      userId: 'user1',
      symbol: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      shares: 25,
      purchasePrice: 220.00,
      currentPrice: 235.80,
      type: 'etf',
      purchaseDate: new Date('2023-01-05'),
      currency: 'USD',
    },
    {
      id: '5',
      userId: 'user1',
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      shares: 8,
      purchasePrice: 280.00,
      currentPrice: 310.25,
      type: 'stock',
      purchaseDate: new Date('2023-04-12'),
      currency: 'USD',
    },
    {
      id: '6',
      userId: 'user1',
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      shares: 3,
      purchasePrice: 120.00,
      currentPrice: 135.40,
      type: 'stock',
      purchaseDate: new Date('2023-05-18'),
      currency: 'USD',
    },
  ];
};
