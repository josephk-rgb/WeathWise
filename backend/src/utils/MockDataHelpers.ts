import { faker } from '@faker-js/faker';
import Chance from 'chance';

const chance = new Chance();

export class MockDataHelpers {
  // Generate realistic account number
  static generateAccountNumber(): string {
    return faker.finance.accountNumber(12);
  }

  // Generate routing number
  static generateRoutingNumber(): string {
    return faker.finance.routingNumber();
  }

  // Generate realistic transaction amounts based on category
  static generateTransactionAmount(category: string): number {
    const categoryRanges: { [key: string]: { min: number; max: number } } = {
      'Food': { min: 8, max: 150 },
      'Transportation': { min: 2, max: 80 },
      'Housing': { min: 500, max: 3000 },
      'Utilities': { min: 25, max: 300 },
      'Entertainment': { min: 10, max: 200 },
      'Healthcare': { min: 20, max: 500 },
      'Shopping': { min: 15, max: 300 },
      'Travel': { min: 50, max: 2000 },
      'Education': { min: 30, max: 800 },
      'Personal': { min: 5, max: 100 },
    };

    const range = categoryRanges[category] || { min: 10, max: 100 };
    return parseFloat(faker.finance.amount(range.min, range.max, 2));
  }

  // Generate merchant names by category
  static generateMerchantName(category: string): string {
    const merchants: { [key: string]: string[] } = {
      'Food': [
        'McDonald\'s', 'Starbucks', 'Subway', 'Chipotle', 'Pizza Hut',
        'Whole Foods', 'Trader Joe\'s', 'Safeway', 'Local Bistro',
        'Corner Deli', 'Fresh Market', 'Food Truck Co'
      ],
      'Transportation': [
        'Shell', 'Exxon', 'BP', 'Chevron', 'Uber', 'Lyft',
        'Metro Transit', 'City Parking', 'Auto Repair Shop',
        'Car Wash Express', 'Toll Road', 'Public Transit'
      ],
      'Housing': [
        'Property Management Co', 'Rent Payment', 'Mortgage Payment',
        'Home Depot', 'Lowes', 'IKEA', 'Furniture Store',
        'Hardware Store', 'Garden Center'
      ],
      'Utilities': [
        'Electric Company', 'Gas & Electric', 'Water Department',
        'Internet Provider', 'Cable Company', 'Phone Company',
        'Trash Service', 'Security System'
      ],
      'Entertainment': [
        'Netflix', 'Spotify', 'Movie Theater', 'Concert Hall',
        'Sports Arena', 'Gaming Store', 'Book Store',
        'Streaming Service', 'Theme Park'
      ],
      'Healthcare': [
        'Medical Center', 'Pharmacy', 'Dental Office',
        'Vision Center', 'Laboratory', 'Specialist Clinic',
        'Urgent Care', 'Health Insurance'
      ],
      'Shopping': [
        'Amazon', 'Target', 'Walmart', 'Best Buy', 'Macy\'s',
        'Nike Store', 'Apple Store', 'Department Store',
        'Clothing Boutique', 'Electronics Store'
      ]
    };

    const categoryMerchants = merchants[category] || ['Generic Store', 'Local Business'];
    return faker.helpers.arrayElement(categoryMerchants);
  }

  // Generate transaction descriptions
  static generateTransactionDescription(category: string, merchant: string): string {
    const templates = [
      `Purchase at ${merchant}`,
      `${merchant} - ${category}`,
      `Payment to ${merchant}`,
      `${merchant} Transaction`,
      `${category} expense - ${merchant}`
    ];
    return faker.helpers.arrayElement(templates);
  }

  // Generate realistic stock symbols
  static generateStockSymbol(): string {
    const popularStocks = [
      'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA',
      'JPM', 'JNJ', 'V', 'PG', 'UNH', 'MA', 'HD', 'DIS',
      'PYPL', 'BAC', 'NFLX', 'ADBE', 'CRM', 'CMCSA', 'XOM',
      'VZ', 'ABT', 'KO', 'PFE', 'PEP', 'T', 'CVX', 'WMT'
    ];
    return faker.helpers.arrayElement(popularStocks);
  }

  // Generate realistic stock prices
  static generateStockPrice(): number {
    return parseFloat(faker.finance.amount(10, 500, 2));
  }

  // Generate date within last N months
  static generateDateInPastMonths(months: number): Date {
    const now = new Date();
    const pastDate = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
    return faker.date.between(pastDate, now);
  }

  // Generate business day (exclude weekends)
  static generateBusinessDay(startDate: Date, endDate: Date): Date {
    let date = faker.date.between(startDate, endDate);
    
    // If it's weekend, move to next Monday
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    
    return date;
  }

  // Generate seasonal transaction patterns
  static getSeasonalMultiplier(date: Date, category: string): number {
    const month = date.getMonth();
    
    // Holiday shopping season (November-December)
    if ((month === 10 || month === 11) && category === 'Shopping') {
      return 1.5;
    }
    
    // Summer travel (June-August)
    if ((month >= 5 && month <= 7) && category === 'Travel') {
      return 1.3;
    }
    
    // Winter utilities (December-February)
    if ((month === 11 || month <= 1) && category === 'Utilities') {
      return 1.2;
    }
    
    return 1.0;
  }

  // Generate realistic account balances
  static generateAccountBalance(accountType: string): number {
    const balanceRanges: { [key: string]: { min: number; max: number } } = {
      'checking': { min: 500, max: 15000 },
      'savings': { min: 1000, max: 50000 },
      'credit': { min: -5000, max: 0 }, // Credit cards have negative balances (debt)
      'investment': { min: 5000, max: 100000 },
      'retirement': { min: 10000, max: 250000 },
      'loan': { min: -50000, max: -1000 } // Loans have negative balances (debt)
    };

    const range = balanceRanges[accountType] || { min: 1000, max: 10000 };
    return parseFloat(faker.finance.amount(range.min, range.max, 2));
  }

  // Generate goal categories
  static generateGoalCategory(): string {
    const categories = [
      'Emergency Fund',
      'Vacation',
      'New Car',
      'Home Down Payment',
      'Wedding',
      'Education',
      'Retirement',
      'Home Improvement',
      'Electronics',
      'Investment'
    ];
    return faker.helpers.arrayElement(categories);
  }

  // Generate budget categories (matching your Budget model)
  static generateBudgetCategory(): string {
    const categories = [
      'Housing', 'Transportation', 'Food', 'Utilities', 'Insurance',
      'Healthcare', 'Savings', 'Personal', 'Recreation', 'Miscellaneous',
      'Education', 'Clothing', 'Technology', 'Travel', 'Business',
      'Gifts', 'Charity', 'Debt Payments', 'Emergency Fund', 'Other'
    ];
    return faker.helpers.arrayElement(categories);
  }

  // Generate realistic debt types
  static generateDebtType(): 'credit_card' | 'loan' | 'mortgage' | 'student_loan' | 'other' {
    const types: ('credit_card' | 'loan' | 'mortgage' | 'student_loan' | 'other')[] = [
      'credit_card', 'loan', 'mortgage', 'student_loan', 'other'
    ];
    return faker.helpers.arrayElement(types);
  }

  // Generate weighted random selection (more realistic distribution)
  static weightedRandom<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }
}
