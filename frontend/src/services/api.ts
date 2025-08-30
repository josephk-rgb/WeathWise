import { User, Transaction, Budget, Goal, Investment, Recommendation } from '../types';

// Mock API service - replace with actual API calls
class ApiService {
  private baseUrl = '/api';

  async login(email: string, password: string): Promise<User> {
    // Mock login - replace with actual OAuth/authentication
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: '1',
          name: 'John Doe',
          email: email,
          riskProfile: 'moderate',
          createdAt: new Date(),
        });
      }, 1000);
    });
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    // Mock data - replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            userId,
            amount: -85.50,
            description: 'Grocery Store',
            category: 'Food & Dining',
            type: 'expense',
            date: new Date('2024-01-15'),
          },
          {
            id: '2',
            userId,
            amount: 3200.00,
            description: 'Salary',
            category: 'Income',
            type: 'income',
            date: new Date('2024-01-01'),
          },
          {
            id: '3',
            userId,
            amount: -1200.00,
            description: 'Rent Payment',
            category: 'Housing',
            type: 'expense',
            date: new Date('2024-01-01'),
          },
        ]);
      }, 500);
    });
  }

  async getBudgets(userId: string): Promise<Budget[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            userId,
            category: 'Food & Dining',
            allocated: 500,
            spent: 385.50,
            month: 'January',
            year: 2024,
          },
          {
            id: '2',
            userId,
            category: 'Transportation',
            allocated: 300,
            spent: 245.00,
            month: 'January',
            year: 2024,
          },
        ]);
      }, 500);
    });
  }

  async getGoals(userId: string): Promise<Goal[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            userId,
            title: 'Emergency Fund',
            description: 'Build 6 months of expenses',
            targetAmount: 15000,
            currentAmount: 8500,
            targetDate: new Date('2024-12-31'),
            category: 'Emergency',
            priority: 'high',
          },
          {
            id: '2',
            userId,
            title: 'New Laptop',
            description: 'MacBook Pro for work',
            targetAmount: 2500,
            currentAmount: 1200,
            targetDate: new Date('2024-06-30'),
            category: 'Technology',
            priority: 'medium',
          },
        ]);
      }, 500);
    });
  }

  async getInvestments(userId: string): Promise<Investment[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            userId,
            symbol: 'AAPL',
            name: 'Apple Inc.',
            shares: 10,
            purchasePrice: 150.00,
            currentPrice: 175.50,
            type: 'stock',
            purchaseDate: new Date('2023-12-01'),
          },
          {
            id: '2',
            userId,
            symbol: 'BTC',
            name: 'Bitcoin',
            shares: 0.5,
            purchasePrice: 45000.00,
            currentPrice: 52000.00,
            type: 'crypto',
            purchaseDate: new Date('2023-11-15'),
          },
        ]);
      }, 500);
    });
  }

  async getRecommendations(userId: string): Promise<Recommendation[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            userId,
            type: 'budget',
            title: 'Reduce Dining Expenses',
            description: 'You\'re spending 23% more on dining than similar users',
            confidence: 0.85,
            reasoning: [
              'Dining expenses increased 15% this month',
              'Similar income users spend $200 less monthly',
              'Home cooking could save $150/month'
            ],
            actionItems: [
              'Set a weekly dining budget of $75',
              'Try meal planning on Sundays',
              'Use grocery pickup to avoid impulse purchases'
            ],
            createdAt: new Date(),
          },
          {
            id: '2',
            userId,
            type: 'investment',
            title: 'Diversify Portfolio',
            description: 'Consider adding bonds to reduce risk',
            confidence: 0.72,
            reasoning: [
              'Current portfolio is 85% stocks',
              'Market volatility is above average',
              'Your risk profile suggests 70/30 stock/bond split'
            ],
            actionItems: [
              'Research low-cost bond ETFs',
              'Consider Treasury I-bonds for inflation protection',
              'Rebalance quarterly'
            ],
            createdAt: new Date(),
          },
        ]);
      }, 500);
    });
  }

  async sendChatMessage(message: string, context?: any): Promise<string> {
    // Mock AI response - replace with actual LLM API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const responses = [
          "Based on your spending patterns, I recommend setting aside $200 more per month for your emergency fund.",
          "Your portfolio is performing well! Consider rebalancing to maintain your target allocation.",
          "I notice you're close to your dining budget. Would you like some tips for meal planning?",
          "Great question! Let me analyze your financial data to provide personalized advice.",
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        resolve(randomResponse);
      }, 1500);
    });
  }
}

export const apiService = new ApiService();