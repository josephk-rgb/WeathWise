import { connectDB, disconnectDB } from '../src/utils/database';
import { Transaction } from '../src/models/Transaction';
import { User } from '../src/models/User';
import { Account } from '../src/models/Account';

describe('Transaction Model', () => {
  let testUser: any;
  let testAccount: any;

  beforeAll(async () => {
    await connectDB();
    
    // Create a test user
    testUser = await new User({
      auth0Id: 'auth0|transactiontest1234567890123456789012',
      email: 'transactiontest@example.com',
      profile: {
        firstName: 'Transaction',
        lastName: 'Test'
      }
    }).save();

    // Create a test account
    testAccount = await new Account({
      userId: testUser._id,
      type: 'checking',
      provider: { name: 'Test Bank' },
      accountInfo: {
        name: 'Test Account',
        accountNumber: '1234567890',
        balance: 1000.00,
        currency: 'USD'
      }
    }).save();
  });

  afterAll(async () => {
    // Clean up test data
    if (testAccount) {
      await Account.findByIdAndDelete(testAccount._id);
    }
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
    }
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up the transactions collection before each test
    await Transaction.deleteMany({});
  });

  it('should create a new expense transaction with valid data', async () => {
    const transactionData = {
      userId: testUser._id,
      accountId: testAccount._id,
      externalId: 'ext_123456',
      transactionInfo: {
        amount: -50.00,
        currency: 'USD',
        description: 'Grocery shopping at Walmart',
        type: 'expense',
        category: 'Food & Dining',
        subcategory: 'Groceries',
        date: new Date()
      },
      categorization: {
        automatic: true,
        confidence: 0.95,
        userOverridden: false,
        suggestedCategories: ['Food & Dining', 'Shopping']
      },
      location: {
        merchant: 'Walmart',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'US'
      },
      metadata: {
        tags: ['groceries', 'essential'],
        notes: 'Weekly grocery shopping',
        isRecurring: false
      },
      audit: {
        source: 'api'
      }
    };

    const transaction = new Transaction(transactionData);
    const savedTransaction = await transaction.save();

    expect(savedTransaction).toBeDefined();
    expect(savedTransaction.transactionInfo.amount).toBe(-50.00);
    expect(savedTransaction.transactionInfo.type).toBe('expense');
    expect(savedTransaction.transactionInfo.category).toBe('Food & Dining');
    expect(savedTransaction.categorization.automatic).toBe(true);
    expect(savedTransaction.location?.merchant).toBe('Walmart');
    expect(savedTransaction.metadata.tags).toContain('groceries');
    expect(savedTransaction.audit.source).toBe('api');
  });

  it('should create an income transaction', async () => {
    const transactionData = {
      userId: testUser._id,
      accountId: testAccount._id,
      transactionInfo: {
        amount: 3000.00,
        currency: 'USD',
        description: 'Salary payment',
        type: 'income',
        category: 'Salary',
        date: new Date()
      },
      categorization: {
        automatic: false,
        userOverridden: true
      },
      metadata: {
        tags: ['salary', 'income'],
        isRecurring: true,
        recurringPattern: {
          frequency: 'monthly',
          nextDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      },
      audit: {
        source: 'manual'
      }
    };

    const transaction = new Transaction(transactionData);
    const savedTransaction = await transaction.save();

    expect(savedTransaction).toBeDefined();
    expect(savedTransaction.transactionInfo.amount).toBe(3000.00);
    expect(savedTransaction.transactionInfo.type).toBe('income');
    expect(savedTransaction.metadata.isRecurring).toBe(true);
    expect(savedTransaction.metadata.recurringPattern?.frequency).toBe('monthly');
  });

  it('should create a transfer transaction', async () => {
    const transactionData = {
      userId: testUser._id,
      accountId: testAccount._id,
      transactionInfo: {
        amount: -500.00,
        currency: 'USD',
        description: 'Transfer to savings account',
        type: 'transfer',
        category: 'Transfer',
        date: new Date()
      },
      metadata: {
        tags: ['transfer', 'savings'],
        notes: 'Monthly savings transfer'
      },
      audit: {
        source: 'manual'
      }
    };

    const transaction = new Transaction(transactionData);
    const savedTransaction = await transaction.save();

    expect(savedTransaction).toBeDefined();
    expect(savedTransaction.transactionInfo.type).toBe('transfer');
    expect(savedTransaction.transactionInfo.amount).toBe(-500.00);
  });

  it('should create an investment transaction', async () => {
    const transactionData = {
      userId: testUser._id,
      accountId: testAccount._id,
      transactionInfo: {
        amount: -1000.00,
        currency: 'USD',
        description: 'Purchase of AAPL stock',
        type: 'investment',
        category: 'Investment',
        subcategory: 'Stock Purchase',
        date: new Date()
      },
      metadata: {
        tags: ['investment', 'stocks', 'aapl']
      },
      audit: {
        source: 'api'
      }
    };

    const transaction = new Transaction(transactionData);
    const savedTransaction = await transaction.save();

    expect(savedTransaction).toBeDefined();
    expect(savedTransaction.transactionInfo.type).toBe('investment');
    expect(savedTransaction.transactionInfo.subcategory).toBe('Stock Purchase');
  });

  it('should validate required fields', async () => {
    const invalidTransactionData = {
      userId: testUser._id,
      // Missing transactionInfo
      audit: { source: 'manual' }
    };

    await expect(new Transaction(invalidTransactionData).save()).rejects.toThrow();
  });

  it('should validate transaction type enum', async () => {
    const transactionData = {
      userId: testUser._id,
      transactionInfo: {
        amount: 100.00,
        currency: 'USD',
        description: 'Test transaction',
        type: 'invalid_type', // Invalid type
        category: 'Test',
        date: new Date()
      },
      audit: { source: 'manual' }
    };

    await expect(new Transaction(transactionData).save()).rejects.toThrow();
  });

  it('should validate amount range', async () => {
    const transactionData = {
      userId: testUser._id,
      transactionInfo: {
        amount: 2000000.00, // Too large
        currency: 'USD',
        description: 'Test transaction',
        type: 'income',
        category: 'Test',
        date: new Date()
      },
      audit: { source: 'manual' }
    };

    await expect(new Transaction(transactionData).save()).rejects.toThrow();
  });

  it('should validate currency format', async () => {
    const transactionData = {
      userId: testUser._id,
      transactionInfo: {
        amount: 100.00,
        currency: 'INVALID', // Invalid currency
        description: 'Test transaction',
        type: 'expense',
        category: 'Test',
        date: new Date()
      },
      audit: { source: 'manual' }
    };

    await expect(new Transaction(transactionData).save()).rejects.toThrow();
  });

  it('should validate audit source enum', async () => {
    const transactionData = {
      userId: testUser._id,
      transactionInfo: {
        amount: 100.00,
        currency: 'USD',
        description: 'Test transaction',
        type: 'expense',
        category: 'Test',
        date: new Date()
      },
      audit: {
        source: 'invalid_source' // Invalid source
      }
    };

    await expect(new Transaction(transactionData).save()).rejects.toThrow();
  });

  it('should trim description and category', async () => {
    const transactionData = {
      userId: testUser._id,
      transactionInfo: {
        amount: 100.00,
        currency: 'USD',
        description: '  Test transaction  ', // With spaces
        type: 'expense',
        category: '  Test Category  ', // With spaces
        date: new Date()
      },
      audit: { source: 'manual' }
    };

    const transaction = new Transaction(transactionData);
    const savedTransaction = await transaction.save();

    expect(savedTransaction.transactionInfo.description).toBe('Test transaction');
    expect(savedTransaction.transactionInfo.category).toBe('Test Category');
  });

  it('should set processed date automatically', async () => {
    const transactionData = {
      userId: testUser._id,
      transactionInfo: {
        amount: 100.00,
        currency: 'USD',
        description: 'Test transaction',
        type: 'expense',
        category: 'Test',
        date: new Date()
        // No processedDate set
      },
      audit: { source: 'manual' }
    };

    const transaction = new Transaction(transactionData);
    const savedTransaction = await transaction.save();

    expect(savedTransaction.transactionInfo.processedDate).toBeDefined();
    expect(savedTransaction.audit.modifiedAt).toBeDefined();
  });

  it('should find transactions by user ID', async () => {
    const transactionData = {
      userId: testUser._id,
      transactionInfo: {
        amount: 100.00,
        currency: 'USD',
        description: 'Test transaction',
        type: 'expense',
        category: 'Test',
        date: new Date()
      },
      audit: { source: 'manual' }
    };

    await new Transaction(transactionData).save();

    const foundTransactions = await Transaction.find({ userId: testUser._id });
    expect(foundTransactions).toHaveLength(1);
    expect(foundTransactions[0]?.transactionInfo.amount).toBe(100.00);
  });

  it('should find transactions by account ID', async () => {
    const transactionData = {
      userId: testUser._id,
      accountId: testAccount._id,
      transactionInfo: {
        amount: 200.00,
        currency: 'USD',
        description: 'Test transaction',
        type: 'expense',
        category: 'Test',
        date: new Date()
      },
      audit: { source: 'manual' }
    };

    await new Transaction(transactionData).save();

    const foundTransactions = await Transaction.find({ accountId: testAccount._id });
    expect(foundTransactions).toHaveLength(1);
    expect(foundTransactions[0]?.transactionInfo.amount).toBe(200.00);
  });

  it('should find transactions by type', async () => {
    const expenseData = {
      userId: testUser._id,
      transactionInfo: {
        amount: -50.00,
        currency: 'USD',
        description: 'Expense transaction',
        type: 'expense',
        category: 'Test',
        date: new Date()
      },
      audit: { source: 'manual' }
    };

    const incomeData = {
      userId: testUser._id,
      transactionInfo: {
        amount: 100.00,
        currency: 'USD',
        description: 'Income transaction',
        type: 'income',
        category: 'Test',
        date: new Date()
      },
      audit: { source: 'manual' }
    };

    await Promise.all([
      new Transaction(expenseData).save(),
      new Transaction(incomeData).save()
    ]);

    const expenseTransactions = await Transaction.find({ 
      userId: testUser._id, 
      'transactionInfo.type': 'expense' 
    });
    expect(expenseTransactions).toHaveLength(1);
    expect(expenseTransactions[0]?.transactionInfo.type).toBe('expense');
  });

  it('should update transaction category', async () => {
    const transactionData = {
      userId: testUser._id,
      transactionInfo: {
        amount: 100.00,
        currency: 'USD',
        description: 'Test transaction',
        type: 'expense',
        category: 'Old Category',
        date: new Date()
      },
      audit: { source: 'manual' }
    };

    const transaction = await new Transaction(transactionData).save();

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transaction._id,
      { 
        'transactionInfo.category': 'New Category',
        'categorization.userOverridden': true
      },
      { new: true }
    );

    expect(updatedTransaction).toBeDefined();
    expect(updatedTransaction?.transactionInfo.category).toBe('New Category');
    expect(updatedTransaction?.categorization.userOverridden).toBe(true);
  });

  it('should delete transaction', async () => {
    const transactionData = {
      userId: testUser._id,
      transactionInfo: {
        amount: 100.00,
        currency: 'USD',
        description: 'Test transaction',
        type: 'expense',
        category: 'Test',
        date: new Date()
      },
      audit: { source: 'manual' }
    };

    const transaction = await new Transaction(transactionData).save();
    const transactionId = transaction._id;

    await Transaction.findByIdAndDelete(transactionId);

    const deletedTransaction = await Transaction.findById(transactionId);
    expect(deletedTransaction).toBeNull();
  });

  it('should have virtual properties', async () => {
    const transactionData = {
      userId: testUser._id,
      transactionInfo: {
        amount: 1234.56,
        currency: 'USD',
        description: 'Test transaction',
        type: 'expense',
        category: 'Test',
        date: new Date('2024-01-01')
      },
      audit: { source: 'manual' }
    };

    const transaction = await new Transaction(transactionData).save();
    const transactionJson = transaction.toJSON() as any;

    expect(transactionJson.formattedAmount).toBe('$1,234.56');
    expect(transactionJson.isPositive).toBe(true);
    expect(transactionJson.ageInDays).toBeGreaterThan(0);
  });

  it('should handle negative amounts correctly', async () => {
    const transactionData = {
      userId: testUser._id,
      transactionInfo: {
        amount: -50.00,
        currency: 'USD',
        description: 'Expense transaction',
        type: 'expense',
        category: 'Test',
        date: new Date()
      },
      audit: { source: 'manual' }
    };

    const transaction = await new Transaction(transactionData).save();
    const transactionJson = transaction.toJSON() as any;

    expect(transactionJson.formattedAmount).toBe('-$50.00');
    expect(transactionJson.isPositive).toBe(false);
  });

  it('should handle different currencies', async () => {
    const transactionData = {
      userId: testUser._id,
      transactionInfo: {
        amount: 100.00,
        currency: 'EUR',
        description: 'Euro transaction',
        type: 'expense',
        category: 'Test',
        date: new Date()
      },
      audit: { source: 'manual' }
    };

    const transaction = await new Transaction(transactionData).save();
    const transactionJson = transaction.toJSON() as any;

    expect(transactionJson.formattedAmount).toContain('€');
  });
});
