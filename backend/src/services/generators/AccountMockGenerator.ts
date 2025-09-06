import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { Account, IAccount } from '../../models/Account';
import { MockDataHelpers } from '../../utils/MockDataHelpers';

export interface AccountGenerationConfig {
  userId: mongoose.Types.ObjectId;
  accountTypes: ('checking' | 'savings' | 'investment' | 'retirement' | 'credit' | 'loan')[];
  numberOfAccounts: number;
}

export class AccountMockGenerator {
  static async generateAccountsForUser(config: AccountGenerationConfig): Promise<IAccount[]> {
    const accounts: IAccount[] = [];
    
    try {
      // Clear existing accounts for this user first
      await Account.deleteMany({ userId: config.userId });
      
      // Generate the specified number of accounts
      for (let i = 0; i < config.numberOfAccounts; i++) {
        const accountType = faker.helpers.arrayElement(config.accountTypes);
        const account = await this.createSingleAccount(config.userId, accountType);
        accounts.push(account);
      }
      
      console.log(`Generated ${accounts.length} accounts for admin user`);
      return accounts;
    } catch (error) {
      console.error('Error generating accounts:', error);
      throw error;
    }
  }

  private static async createSingleAccount(
    userId: mongoose.Types.ObjectId, 
    accountType: 'checking' | 'savings' | 'investment' | 'retirement' | 'credit' | 'loan'
  ): Promise<IAccount> {
    
    const bankNames = [
      'Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank',
      'Capital One', 'TD Bank', 'U.S. Bank', 'PNC Bank',
      'Truist Bank', 'Charles Schwab', 'Fidelity', 'Vanguard'
    ];

    const accountData = {
      userId,
      type: accountType,
      provider: {
        name: faker.helpers.arrayElement(bankNames),
        id: faker.string.alphanumeric(10),
        logo: faker.image.url()
      },
      accountInfo: {
        name: this.generateAccountName(accountType),
        accountNumber: MockDataHelpers.generateAccountNumber(),
        routingNumber: MockDataHelpers.generateRoutingNumber(),
        balance: MockDataHelpers.generateAccountBalance(accountType),
        currency: 'USD',
        lastSyncedAt: faker.date.recent({ days: 7 })
      },
      connectionStatus: {
        isConnected: faker.datatype.boolean(0.8), // 80% chance of being connected
        lastConnected: faker.date.recent({ days: 30 }),
        errorMessage: faker.datatype.boolean(0.1) ? 'Connection timeout' : undefined,
        provider: faker.helpers.arrayElement(['plaid', 'yodlee', 'manual'])
      },
      isActive: faker.datatype.boolean(0.95) // 95% chance of being active
    };

    const account = new Account(accountData);
    return await account.save();
  }

  private static generateAccountName(accountType: string): string {
    const accountNames: { [key: string]: string[] } = {
      'checking': [
        'Primary Checking',
        'Everyday Checking',
        'Main Checking Account',
        'Personal Checking',
        'Premium Checking'
      ],
      'savings': [
        'High Yield Savings',
        'Emergency Fund',
        'Primary Savings',
        'Personal Savings',
        'Money Market Account'
      ],
      'credit': [
        'Rewards Credit Card',
        'Cashback Card',
        'Travel Rewards Card',
        'Premium Credit Card',
        'Business Credit Card'
      ],
      'investment': [
        'Brokerage Account',
        'Investment Portfolio',
        'Trading Account',
        'Growth Portfolio',
        'Diversified Investments'
      ],
      'retirement': [
        '401(k) Account',
        'Traditional IRA',
        'Roth IRA',
        'Retirement Savings',
        'Pension Account'
      ],
      'loan': [
        'Personal Loan',
        'Auto Loan',
        'Home Equity Loan',
        'Student Loan',
        'Line of Credit'
      ]
    };

    const names = accountNames[accountType] || ['Account'];
    return faker.helpers.arrayElement(names);
  }

  // Helper method to get default account types for generation
  static getDefaultAccountTypes(): ('checking' | 'savings' | 'investment' | 'retirement' | 'credit' | 'loan')[] {
    return ['checking', 'savings', 'credit', 'investment'];
  }

  // Get realistic number of accounts
  static getDefaultAccountCount(): number {
    return faker.number.int({ min: 3, max: 5 });
  }
}
