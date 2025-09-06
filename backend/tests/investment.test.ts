import { connectDB, disconnectDB } from '../src/utils/database';
import { Investment } from '../src/models/Investment';
import { User } from '../src/models/User';
import { Account } from '../src/models/Account';

describe('Investment Model', () => {
  let testUser: any;
  let testAccount: any;

  beforeAll(async () => {
    await connectDB();
    
    // Create a test user
    testUser = await new User({
      auth0Id: 'auth0|investmenttest1234567890123456789012',
      email: 'investmenttest@example.com',
      profile: {
        firstName: 'Investment',
        lastName: 'Test'
      }
    }).save();

    // Create a test investment account
    testAccount = await new Account({
      userId: testUser._id,
      type: 'investment',
      provider: { name: 'Fidelity' },
      accountInfo: {
        name: 'Investment Account',
        accountNumber: 'FID123456789',
        balance: 50000.00,
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
    // Clean up the investments collection before each test
    await Investment.deleteMany({});
  });

  it('should create a new stock investment with valid data', async () => {
    const investmentData = {
      userId: testUser._id,
      accountId: testAccount._id,
      securityInfo: {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        exchange: 'NASDAQ',
        currency: 'USD',
        isin: 'US0378331005',
        cusip: '037833100'
      },
      position: {
        shares: 100,
        averageCost: 150.00,
        totalCost: 15000.00,
        currentPrice: 175.00,
        marketValue: 17500.00,
        gainLoss: 2500.00,
        gainLossPercent: 16.67,
        dayChange: 2.50,
        dayChangePercent: 1.45
      },
      acquisition: {
        purchaseDate: new Date('2023-01-15'),
        purchaseMethod: 'buy',
        purchasePrice: 150.00,
        fees: 9.99,
        brokerage: 'Fidelity'
      },
      analytics: {
        beta: 1.2,
        pe_ratio: 25.5,
        dividend_yield: 0.5,
        sector: 'Technology',
        industry: 'Consumer Electronics',
        marketCap: 2500000000000,
        lastAnalyzed: new Date()
      },
      alerts: {
        priceTargets: [{
          type: 'above',
          price: 200.00,
          isActive: true,
          createdAt: new Date()
        }],
        percentageTargets: [{
          type: 'gain',
          percentage: 20.0,
          isActive: true,
          createdAt: new Date()
        }]
      }
    };

    const investment = new Investment(investmentData);
    const savedInvestment = await investment.save();

    expect(savedInvestment).toBeDefined();
    expect(savedInvestment.securityInfo.symbol).toBe('AAPL');
    expect(savedInvestment.securityInfo.type).toBe('stock');
    expect(savedInvestment.position.shares).toBe(100);
    expect(savedInvestment.position.marketValue).toBe(17500.00);
    expect(savedInvestment.position.gainLoss).toBe(2500.00);
    expect(savedInvestment.acquisition.purchaseMethod).toBe('buy');
    expect(savedInvestment.analytics.sector).toBe('Technology');
    expect(savedInvestment.alerts.priceTargets).toHaveLength(1);
    expect(savedInvestment.isActive).toBe(true);
  });

  it('should create an ETF investment', async () => {
    const investmentData = {
      userId: testUser._id,
      accountId: testAccount._id,
      securityInfo: {
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF Trust',
        type: 'etf',
        exchange: 'NYSE',
        currency: 'USD'
      },
      position: {
        shares: 50,
        averageCost: 400.00,
        totalCost: 20000.00,
        currentPrice: 420.00,
        marketValue: 21000.00,
        gainLoss: 1000.00,
        gainLossPercent: 5.0,
        dayChange: -1.00,
        dayChangePercent: -0.24
      },
      acquisition: {
        purchaseDate: new Date('2023-06-01'),
        purchaseMethod: 'buy',
        purchasePrice: 400.00,
        brokerage: 'Fidelity'
      },
      analytics: {
        expense_ratio: 0.09,
        sector: 'Diversified',
        lastAnalyzed: new Date()
      }
    };

    const investment = new Investment(investmentData);
    const savedInvestment = await investment.save();

    expect(savedInvestment).toBeDefined();
    expect(savedInvestment.securityInfo.symbol).toBe('SPY');
    expect(savedInvestment.securityInfo.type).toBe('etf');
    expect(savedInvestment.position.shares).toBe(50);
    expect(savedInvestment.analytics.expense_ratio).toBe(0.09);
  });

  it('should create a crypto investment', async () => {
    const investmentData = {
      userId: testUser._id,
      accountId: testAccount._id,
      securityInfo: {
        symbol: 'BTC',
        name: 'Bitcoin',
        type: 'crypto',
        currency: 'USD'
      },
      position: {
        shares: 0.5,
        averageCost: 45000.00,
        totalCost: 22500.00,
        currentPrice: 50000.00,
        marketValue: 25000.00,
        gainLoss: 2500.00,
        gainLossPercent: 11.11,
        dayChange: 1000.00,
        dayChangePercent: 2.0
      },
      acquisition: {
        purchaseDate: new Date('2023-03-15'),
        purchaseMethod: 'buy',
        purchasePrice: 45000.00
      }
    };

    const investment = new Investment(investmentData);
    const savedInvestment = await investment.save();

    expect(savedInvestment).toBeDefined();
    expect(savedInvestment.securityInfo.symbol).toBe('BTC');
    expect(savedInvestment.securityInfo.type).toBe('crypto');
    expect(savedInvestment.position.shares).toBe(0.5);
  });

  it('should validate required fields', async () => {
    const invalidInvestmentData = {
      userId: testUser._id,
      // Missing securityInfo and position
    };

    await expect(new Investment(invalidInvestmentData).save()).rejects.toThrow();
  });

  it('should validate security type enum', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'TEST',
        name: 'Test Security',
        type: 'invalid_type', // Invalid type
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: 12.00,
        marketValue: 1200.00,
        gainLoss: 200.00,
        gainLossPercent: 20.0,
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 10.00
      }
    };

    await expect(new Investment(investmentData).save()).rejects.toThrow();
  });

  it('should validate purchase method enum', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'TEST',
        name: 'Test Security',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: 12.00,
        marketValue: 1200.00,
        gainLoss: 200.00,
        gainLossPercent: 20.0,
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'invalid_method', // Invalid method
        purchasePrice: 10.00
      }
    };

    await expect(new Investment(investmentData).save()).rejects.toThrow();
  });

  it('should validate shares is positive', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'TEST',
        name: 'Test Security',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: -100, // Negative shares
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: 12.00,
        marketValue: 1200.00,
        gainLoss: 200.00,
        gainLossPercent: 20.0,
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 10.00
      }
    };

    await expect(new Investment(investmentData).save()).rejects.toThrow();
  });

  it('should validate current price is non-negative', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'TEST',
        name: 'Test Security',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: -5.00, // Negative price
        marketValue: 1200.00,
        gainLoss: 200.00,
        gainLossPercent: 20.0,
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 10.00
      }
    };

    await expect(new Investment(investmentData).save()).rejects.toThrow();
  });

  it('should convert symbol to uppercase', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'aapl', // Lowercase
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 150.00,
        totalCost: 15000.00,
        currentPrice: 175.00,
        marketValue: 17500.00,
        gainLoss: 2500.00,
        gainLossPercent: 16.67,
        dayChange: 2.50,
        dayChangePercent: 1.45
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 150.00
      }
    };

    const investment = new Investment(investmentData);
    const savedInvestment = await investment.save();

    expect(savedInvestment.securityInfo.symbol).toBe('AAPL');
  });

  it('should calculate market value automatically', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'TEST',
        name: 'Test Security',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: 12.00,
        // marketValue not set - should be calculated
        gainLoss: 200.00,
        gainLossPercent: 20.0,
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 10.00
      }
    };

    const investment = new Investment(investmentData);
    const savedInvestment = await investment.save();

    expect(savedInvestment.position.marketValue).toBe(1200.00); // 100 * 12.00
  });

  it('should calculate gain/loss automatically', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'TEST',
        name: 'Test Security',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: 12.00,
        marketValue: 1200.00,
        // gainLoss not set - should be calculated
        gainLossPercent: 20.0,
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 10.00
      }
    };

    const investment = new Investment(investmentData);
    const savedInvestment = await investment.save();

    expect(savedInvestment.position.gainLoss).toBe(200.00); // 1200 - 1000
  });

  it('should calculate gain/loss percentage automatically', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'TEST',
        name: 'Test Security',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: 12.00,
        marketValue: 1200.00,
        gainLoss: 200.00,
        // gainLossPercent not set - should be calculated
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 10.00
      }
    };

    const investment = new Investment(investmentData);
    const savedInvestment = await investment.save();

    expect(savedInvestment.position.gainLossPercent).toBe(20.0); // (200 / 1000) * 100
  });

  it('should find investment by user ID', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'TEST',
        name: 'Test Security',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: 12.00,
        marketValue: 1200.00,
        gainLoss: 200.00,
        gainLossPercent: 20.0,
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 10.00
      }
    };

    await new Investment(investmentData).save();

    const foundInvestments = await Investment.find({ userId: testUser._id });
    expect(foundInvestments).toHaveLength(1);
    expect(foundInvestments[0]?.securityInfo.symbol).toBe('TEST');
  });

  it('should find active investments only', async () => {
    const investmentData1 = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'ACTIVE',
        name: 'Active Investment',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: 12.00,
        marketValue: 1200.00,
        gainLoss: 200.00,
        gainLossPercent: 20.0,
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 10.00
      },
      isActive: true
    };

    const investmentData2 = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'INACTIVE',
        name: 'Inactive Investment',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 50,
        averageCost: 20.00,
        totalCost: 1000.00,
        currentPrice: 22.00,
        marketValue: 1100.00,
        gainLoss: 100.00,
        gainLossPercent: 10.0,
        dayChange: 1.00,
        dayChangePercent: 4.76
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 20.00
      },
      isActive: false
    };

    await Promise.all([
      new Investment(investmentData1).save(),
      new Investment(investmentData2).save()
    ]);

    const activeInvestments = await Investment.find({ userId: testUser._id, isActive: true });
    expect(activeInvestments).toHaveLength(1);
    expect(activeInvestments[0]?.securityInfo.symbol).toBe('ACTIVE');
  });

  it('should update investment position', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'TEST',
        name: 'Test Security',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: 12.00,
        marketValue: 1200.00,
        gainLoss: 200.00,
        gainLossPercent: 20.0,
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 10.00
      }
    };

    const investment = await new Investment(investmentData).save();

    const updatedInvestment = await Investment.findByIdAndUpdate(
      investment._id,
      { 
        'position.currentPrice': 15.00,
        'position.dayChange': 3.00,
        'position.dayChangePercent': 25.0
      },
      { new: true }
    );

    expect(updatedInvestment).toBeDefined();
    expect(updatedInvestment?.position.currentPrice).toBe(15.00);
    expect(updatedInvestment?.position.dayChange).toBe(3.00);
  });

  it('should delete investment', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'TEST',
        name: 'Test Security',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: 12.00,
        marketValue: 1200.00,
        gainLoss: 200.00,
        gainLossPercent: 20.0,
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 10.00
      }
    };

    const investment = await new Investment(investmentData).save();
    const investmentId = investment._id;

    await Investment.findByIdAndDelete(investmentId);

    const deletedInvestment = await Investment.findById(investmentId);
    expect(deletedInvestment).toBeNull();
  });

  it('should have virtual properties', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'TEST',
        name: 'Test Security',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: 12.00,
        marketValue: 1200.00,
        gainLoss: 200.00,
        gainLossPercent: 20.0,
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date('2023-01-01'),
        purchaseMethod: 'buy',
        purchasePrice: 10.00
      }
    };

    const investment = await new Investment(investmentData).save();
    const investmentJson = investment.toJSON() as any;

    expect(investmentJson.formattedMarketValue).toBe('$1,200.00');
    expect(investmentJson.formattedGainLoss).toBe('$200.00');
    expect(investmentJson.formattedGainLossPercent).toBe('20.00%');
    expect(investmentJson.isProfitable).toBe(true);
    expect(investmentJson.isLosing).toBe(false);
    expect(investmentJson.holdingPeriodDays).toBeGreaterThan(0);
  });

  it('should handle losing positions correctly', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'LOSS',
        name: 'Losing Investment',
        type: 'stock',
        currency: 'USD'
      },
      position: {
        shares: 100,
        averageCost: 15.00,
        totalCost: 1500.00,
        currentPrice: 12.00,
        marketValue: 1200.00,
        gainLoss: -300.00,
        gainLossPercent: -20.0,
        dayChange: -0.50,
        dayChangePercent: -4.0
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 15.00
      }
    };

    const investment = await new Investment(investmentData).save();
    const investmentJson = investment.toJSON() as any;

    expect(investmentJson.formattedGainLoss).toBe('-$300.00');
    expect(investmentJson.formattedGainLossPercent).toBe('-20.00%');
    expect(investmentJson.isProfitable).toBe(false);
    expect(investmentJson.isLosing).toBe(true);
  });

  it('should handle different currencies', async () => {
    const investmentData = {
      userId: testUser._id,
      securityInfo: {
        symbol: 'EUR',
        name: 'Euro Investment',
        type: 'stock',
        currency: 'EUR'
      },
      position: {
        shares: 100,
        averageCost: 10.00,
        totalCost: 1000.00,
        currentPrice: 12.00,
        marketValue: 1200.00,
        gainLoss: 200.00,
        gainLossPercent: 20.0,
        dayChange: 0.50,
        dayChangePercent: 4.17
      },
      acquisition: {
        purchaseDate: new Date(),
        purchaseMethod: 'buy',
        purchasePrice: 10.00
      }
    };

    const investment = await new Investment(investmentData).save();
    const investmentJson = investment.toJSON() as any;

    expect(investmentJson.formattedMarketValue).toContain('€');
    expect(investmentJson.formattedGainLoss).toContain('€');
  });
});
