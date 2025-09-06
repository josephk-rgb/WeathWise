import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { Transaction, ITransaction } from '../../models/Transaction';
import { Account, IAccount } from '../../models/Account';
import { MockDataHelpers } from '../../utils/MockDataHelpers';

export interface TransactionGenerationConfig {
  userId: mongoose.Types.ObjectId;
  monthsOfHistory: number;
  transactionsPerMonth: number;
  accounts: IAccount[];
}

export class TransactionMockGenerator {
  static async generateTransactionsForUser(config: TransactionGenerationConfig): Promise<ITransaction[]> {
    const transactions: ITransaction[] = [];
    
    try {
      // Clear existing transactions for this user first
      await Transaction.deleteMany({ userId: config.userId });
      
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - config.monthsOfHistory);
      
      // Generate transactions for each month
      for (let month = 0; month < config.monthsOfHistory; month++) {
        const monthStart = new Date(startDate);
        monthStart.setMonth(monthStart.getMonth() + month);
        
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0); // Last day of the month
        
        const monthTransactions = await this.generateTransactionsForMonth(
          config,
          monthStart,
          monthEnd
        );
        
        transactions.push(...monthTransactions);
      }
      
      console.log(`Generated ${transactions.length} transactions for admin user`);
      return transactions;
    } catch (error) {
      console.error('Error generating transactions:', error);
      throw error;
    }
  }

  private static async generateTransactionsForMonth(
    config: TransactionGenerationConfig,
    monthStart: Date,
    monthEnd: Date
  ): Promise<ITransaction[]> {
    const transactions: ITransaction[] = [];
    const transactionsThisMonth = Math.floor(
      config.transactionsPerMonth + (Math.random() - 0.5) * 20 // ±10 variation
    );

    for (let i = 0; i < transactionsThisMonth; i++) {
      const transaction = await this.createSingleTransaction(
        config.userId,
        config.accounts,
        monthStart,
        monthEnd
      );
      transactions.push(transaction);
    }

    return transactions;
  }

  private static async createSingleTransaction(
    userId: mongoose.Types.ObjectId,
    accounts: IAccount[],
    startDate: Date,
    endDate: Date
  ): Promise<ITransaction> {
    
    // Filter accounts that can have transactions (exclude loan accounts for regular transactions)
    const transactionAccounts = accounts.filter(acc => 
      acc.type !== 'loan' && acc.isActive
    );
    
    if (transactionAccounts.length === 0) {
      throw new Error('No suitable accounts found for transaction generation');
    }

    const account = faker.helpers.arrayElement(transactionAccounts);
    const category = MockDataHelpers.generateBudgetCategory();
    const transactionDate = MockDataHelpers.generateBusinessDay(startDate, endDate);
    
    // Determine transaction type based on category and account type
    const transactionType = this.determineTransactionType(category, account.type);
    
    // Generate amount based on transaction type and category
    let amount = MockDataHelpers.generateTransactionAmount(category);
    
    // Apply seasonal multiplier
    const seasonalMultiplier = MockDataHelpers.getSeasonalMultiplier(transactionDate, category);
    amount *= seasonalMultiplier;
    
    // Make expenses negative for better financial tracking
    if (transactionType === 'expense') {
      amount = -Math.abs(amount);
    }

    const merchant = MockDataHelpers.generateMerchantName(category);
    const description = MockDataHelpers.generateTransactionDescription(category, merchant);

    const transactionData = {
      userId,
      accountId: account._id,
      transactionInfo: {
        amount,
        currency: 'USD',
        description,
        type: transactionType,
        category,
        subcategory: this.generateSubcategory(category),
        date: transactionDate,
        processedDate: new Date(transactionDate.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000) // 0-2 days later
      },
      categorization: {
        automatic: faker.datatype.boolean(0.8), // 80% auto-categorized
        confidence: faker.number.float({ min: 0.7, max: 1.0 }),
        userOverridden: faker.datatype.boolean(0.1), // 10% user overridden
        suggestedCategories: faker.helpers.arrayElements([
          'Food', 'Transportation', 'Entertainment', 'Shopping', 'Utilities'
        ], { min: 0, max: 3 })
      },
      location: {
        merchant,
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: 'USA',
        coordinates: {
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude()
        }
      },
      metadata: {
        tags: this.generateTransactionTags(category, transactionType),
        notes: faker.datatype.boolean(0.2) ? faker.lorem.sentence() : undefined,
        isRecurring: this.isRecurringTransaction(category),
        recurringPattern: this.isRecurringTransaction(category) ? {
          frequency: faker.helpers.arrayElement(['weekly', 'monthly', 'yearly']),
          nextDate: this.calculateNextRecurringDate(transactionDate)
        } : undefined
      },
      audit: {
        source: faker.helpers.arrayElement(['manual', 'import', 'api']),
        importBatch: faker.datatype.boolean(0.3) ? faker.string.uuid() : undefined,
        originalData: faker.datatype.boolean(0.5) ? faker.lorem.words() : undefined,
        modifiedAt: transactionDate,
        modifiedBy: userId
      },
      verification: {
        status: faker.helpers.arrayElement(['pending', 'verified', 'disputed']),
        verifiedAt: faker.datatype.boolean(0.8) ? faker.date.recent({ days: 7 }) : undefined,
        verifiedBy: faker.datatype.boolean(0.8) ? userId : undefined,
        disputeReason: faker.datatype.boolean(0.05) ? 'Unrecognized transaction' : undefined
      }
    };

    const transaction = new Transaction(transactionData);
    return await transaction.save();
  }

  private static determineTransactionType(
    category: string, 
    accountType: string
  ): 'income' | 'expense' | 'transfer' | 'investment' {
    
    // Income categories
    if (category === 'Savings' && accountType === 'checking') {
      return faker.helpers.arrayElement(['income', 'transfer']);
    }
    
    // Investment transactions
    if (accountType === 'investment' || accountType === 'retirement') {
      return faker.helpers.arrayElement(['investment', 'transfer']);
    }
    
    // Transfers between accounts
    if (faker.datatype.boolean(0.1)) { // 10% chance of transfer
      return 'transfer';
    }
    
    // Most transactions are expenses
    return 'expense';
  }

  private static generateSubcategory(category: string): string | undefined {
    const subcategories: { [key: string]: string[] } = {
      'Food': ['Groceries', 'Restaurants', 'Fast Food', 'Coffee'],
      'Transportation': ['Gas', 'Public Transit', 'Ride Share', 'Parking'],
      'Entertainment': ['Movies', 'Concerts', 'Sports', 'Gaming'],
      'Shopping': ['Clothing', 'Electronics', 'Home Goods', 'Books'],
      'Utilities': ['Electric', 'Gas', 'Water', 'Internet', 'Phone'],
      'Healthcare': ['Doctor', 'Pharmacy', 'Dental', 'Vision'],
      'Housing': ['Rent', 'Mortgage', 'Repairs', 'Furniture']
    };

    const subs = subcategories[category];
    return subs ? faker.helpers.arrayElement(subs) : undefined;
  }

  private static generateTransactionTags(category: string, type: string): string[] {
    const baseTags = [category.toLowerCase(), type];
    const additionalTags = [];

    if (faker.datatype.boolean(0.3)) {
      additionalTags.push('business');
    }
    if (faker.datatype.boolean(0.2)) {
      additionalTags.push('tax-deductible');
    }
    if (faker.datatype.boolean(0.1)) {
      additionalTags.push('reimbursable');
    }

    return [...baseTags, ...additionalTags];
  }

  private static isRecurringTransaction(category: string): boolean {
    const recurringCategories = ['Housing', 'Utilities', 'Insurance', 'Savings'];
    return recurringCategories.includes(category) && faker.datatype.boolean(0.7);
  }

  private static calculateNextRecurringDate(currentDate: Date): Date {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  }

  // Helper methods for configuration
  static getDefaultTransactionsPerMonth(): number {
    return faker.number.int({ min: 50, max: 100 });
  }

  static getDefaultMonthsOfHistory(): number {
    return 12;
  }
}
