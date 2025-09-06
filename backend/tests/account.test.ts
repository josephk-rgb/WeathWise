import { connectDB, disconnectDB } from '../src/utils/database';
import { Account } from '../src/models/Account';
import { User } from '../src/models/User';

describe('Account Model', () => {
  let testUser: any;

  beforeAll(async () => {
    await connectDB();
    
    // Create a test user
    testUser = await new User({
      auth0Id: 'auth0|accounttest1234567890123456789012',
      email: 'accounttest@example.com',
      profile: {
        firstName: 'Account',
        lastName: 'Test'
      }
    }).save();
  });

  afterAll(async () => {
    // Clean up test user
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
    }
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up the accounts collection before each test
    await Account.deleteMany({});
  });

  it('should create a new checking account with valid data', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'checking',
      provider: {
        name: 'Chase Bank',
        id: 'chase_123',
        logo: 'https://example.com/chase-logo.png'
      },
      accountInfo: {
        name: 'Primary Checking',
        accountNumber: '1234567890',
        routingNumber: '021000021',
        balance: 5000.00,
        currency: 'USD'
      },
      connectionStatus: {
        isConnected: true,
        lastConnected: new Date(),
        provider: 'plaid'
      }
    };

    const account = new Account(accountData);
    const savedAccount = await account.save();

    expect(savedAccount).toBeDefined();
    expect(savedAccount.type).toBe('checking');
    expect(savedAccount.provider.name).toBe('Chase Bank');
    expect(savedAccount.accountInfo.name).toBe('Primary Checking');
    expect(savedAccount.accountInfo.balance).toBe(5000.00);
    expect(savedAccount.connectionStatus.isConnected).toBe(true);
    expect(savedAccount.isActive).toBe(true);
  });

  it('should create an investment account', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'investment',
      provider: {
        name: 'Fidelity',
        id: 'fidelity_456'
      },
      accountInfo: {
        name: '401(k) Account',
        accountNumber: 'FID123456789',
        balance: 25000.00,
        currency: 'USD'
      },
      connectionStatus: {
        isConnected: false,
        provider: 'manual'
      }
    };

    const account = new Account(accountData);
    const savedAccount = await account.save();

    expect(savedAccount).toBeDefined();
    expect(savedAccount.type).toBe('investment');
    expect(savedAccount.provider.name).toBe('Fidelity');
    expect(savedAccount.accountInfo.name).toBe('401(k) Account');
    expect(savedAccount.connectionStatus.isConnected).toBe(false);
  });

  it('should create a credit card account', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'credit',
      provider: {
        name: 'American Express',
        id: 'amex_789'
      },
      accountInfo: {
        name: 'Platinum Card',
        accountNumber: '****1234',
        balance: -1500.00, // Negative for credit cards
        currency: 'USD'
      },
      connectionStatus: {
        isConnected: true,
        provider: 'plaid'
      }
    };

    const account = new Account(accountData);
    const savedAccount = await account.save();

    expect(savedAccount).toBeDefined();
    expect(savedAccount.type).toBe('credit');
    expect(savedAccount.accountInfo.balance).toBe(-1500.00);
  });

  it('should validate required fields', async () => {
    const invalidAccountData = {
      // Missing required fields
      userId: testUser._id,
      type: 'checking'
      // Missing provider and accountInfo
    };

    await expect(new Account(invalidAccountData).save()).rejects.toThrow();
  });

  it('should validate account type enum', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'invalid_type', // Invalid type
      provider: {
        name: 'Test Bank'
      },
      accountInfo: {
        name: 'Test Account',
        accountNumber: '1234567890',
        balance: 1000.00,
        currency: 'USD'
      }
    };

    await expect(new Account(accountData).save()).rejects.toThrow();
  });

  it('should validate currency format', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'checking',
      provider: {
        name: 'Test Bank'
      },
      accountInfo: {
        name: 'Test Account',
        accountNumber: '1234567890',
        balance: 1000.00,
        currency: 'INVALID' // Invalid currency
      }
    };

    await expect(new Account(accountData).save()).rejects.toThrow();
  });

  it('should validate balance is a number', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'checking',
      provider: {
        name: 'Test Bank'
      },
      accountInfo: {
        name: 'Test Account',
        accountNumber: '1234567890',
        balance: 'not_a_number', // Invalid balance
        currency: 'USD'
      }
    };

    await expect(new Account(accountData).save()).rejects.toThrow();
  });

  it('should validate connection status provider enum', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'checking',
      provider: {
        name: 'Test Bank'
      },
      accountInfo: {
        name: 'Test Account',
        accountNumber: '1234567890',
        balance: 1000.00,
        currency: 'USD'
      },
      connectionStatus: {
        isConnected: true,
        provider: 'invalid_provider' // Invalid provider
      }
    };

    await expect(new Account(accountData).save()).rejects.toThrow();
  });

  it('should trim account name and provider name', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'checking',
      provider: {
        name: '  Test Bank  ' // With spaces
      },
      accountInfo: {
        name: '  Test Account  ', // With spaces
        accountNumber: '1234567890',
        balance: 1000.00,
        currency: 'USD'
      }
    };

    const account = new Account(accountData);
    const savedAccount = await account.save();

    expect(savedAccount.provider.name).toBe('Test Bank');
    expect(savedAccount.accountInfo.name).toBe('Test Account');
  });

  it('should find account by user ID', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'savings',
      provider: {
        name: 'Savings Bank'
      },
      accountInfo: {
        name: 'High Yield Savings',
        accountNumber: 'SAV123456789',
        balance: 10000.00,
        currency: 'USD'
      }
    };

    await new Account(accountData).save();

    const foundAccounts = await Account.find({ userId: testUser._id });
    expect(foundAccounts).toHaveLength(1);
    expect(foundAccounts[0]?.type).toBe('savings');
  });

  it('should find active accounts only', async () => {
    const accountData1 = {
      userId: testUser._id,
      type: 'checking',
      provider: { name: 'Bank 1' },
      accountInfo: {
        name: 'Active Account',
        accountNumber: '1234567890',
        balance: 1000.00,
        currency: 'USD'
      },
      isActive: true
    };

    const accountData2 = {
      userId: testUser._id,
      type: 'savings',
      provider: { name: 'Bank 2' },
      accountInfo: {
        name: 'Inactive Account',
        accountNumber: '0987654321',
        balance: 2000.00,
        currency: 'USD'
      },
      isActive: false
    };

    await Promise.all([
      new Account(accountData1).save(),
      new Account(accountData2).save()
    ]);

    const activeAccounts = await Account.find({ userId: testUser._id, isActive: true });
    expect(activeAccounts).toHaveLength(1);
    expect(activeAccounts[0]?.accountInfo.name).toBe('Active Account');
  });

  it('should update account balance', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'checking',
      provider: { name: 'Test Bank' },
      accountInfo: {
        name: 'Test Account',
        accountNumber: '1234567890',
        balance: 1000.00,
        currency: 'USD'
      }
    };

    const account = await new Account(accountData).save();

    const updatedAccount = await Account.findByIdAndUpdate(
      account._id,
      { 'accountInfo.balance': 1500.00 },
      { new: true }
    );

    expect(updatedAccount).toBeDefined();
    expect(updatedAccount?.accountInfo.balance).toBe(1500.00);
  });

  it('should delete account', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'checking',
      provider: { name: 'Test Bank' },
      accountInfo: {
        name: 'Test Account',
        accountNumber: '1234567890',
        balance: 1000.00,
        currency: 'USD'
      }
    };

    const account = await new Account(accountData).save();
    const accountId = account._id;

    await Account.findByIdAndDelete(accountId);

    const deletedAccount = await Account.findById(accountId);
    expect(deletedAccount).toBeNull();
  });

  it('should have virtual properties', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'checking',
      provider: { name: 'Test Bank' },
      accountInfo: {
        name: 'Test Account',
        accountNumber: '1234567890',
        balance: 1234.56,
        currency: 'USD'
      }
    };

    const account = await new Account(accountData).save();
    const accountJson = account.toJSON() as any;

    expect(accountJson.displayName).toBe('Test Account');
    expect(accountJson.formattedBalance).toBe('$1,234.56');
  });

  it('should handle different currencies', async () => {
    const accountData = {
      userId: testUser._id,
      type: 'checking',
      provider: { name: 'European Bank' },
      accountInfo: {
        name: 'Euro Account',
        accountNumber: 'EUR123456789',
        balance: 1000.00,
        currency: 'EUR'
      }
    };

    const account = await new Account(accountData).save();
    const accountJson = account.toJSON() as any;

    expect(accountJson.formattedBalance).toContain('€');
  });
});
