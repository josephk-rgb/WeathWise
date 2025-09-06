import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { Investment, IInvestment } from '../../models/Investment';
import { Account, IAccount } from '../../models/Account';
import { MockDataHelpers } from '../../utils/MockDataHelpers';

export interface InvestmentGenerationConfig {
  userId: mongoose.Types.ObjectId;
  accounts: IAccount[];
  generateDividends: boolean;
}

export class InvestmentMockGenerator {
  static async generateInvestmentsForUser(config: InvestmentGenerationConfig): Promise<IInvestment[]> {
    const investments: IInvestment[] = [];
    
    try {
      // Clear existing investments for this user first
      await Investment.deleteMany({ userId: config.userId });
      
      // Get investment accounts only
      const investmentAccounts = config.accounts.filter(acc => 
        (acc.type === 'investment' || acc.type === 'retirement') && acc.isActive
      );
      
      if (investmentAccounts.length === 0) {
        console.log('No investment accounts found, skipping investment generation');
        return [];
      }
      
      // Generate investments for each investment account
      for (const account of investmentAccounts) {
        const accountInvestments = await this.generateInvestmentsForAccount(
          config.userId,
          account,
          config.generateDividends
        );
        investments.push(...accountInvestments);
      }
      
      console.log(`Generated ${investments.length} investments for admin user`);
      return investments;
    } catch (error) {
      console.error('Error generating investments:', error);
      throw error;
    }
  }

  private static async generateInvestmentsForAccount(
    userId: mongoose.Types.ObjectId,
    account: IAccount,
    generateDividends: boolean
  ): Promise<IInvestment[]> {
    const investments: IInvestment[] = [];
    const numberOfInvestments = faker.number.int({ min: 5, max: 15 });

    for (let i = 0; i < numberOfInvestments; i++) {
      const investment = await this.createSingleInvestment(
        userId,
        account._id as mongoose.Types.ObjectId,
        generateDividends
      );
      investments.push(investment);
    }

    return investments;
  }

  private static async createSingleInvestment(
    userId: mongoose.Types.ObjectId,
    accountId: mongoose.Types.ObjectId,
    generateDividends: boolean
  ): Promise<IInvestment> {
    
    const securityType = faker.helpers.arrayElement([
      'stock', 'etf', 'mutual_fund', 'bond'
    ]) as 'stock' | 'etf' | 'mutual_fund' | 'bond';

    const symbol = this.generateSecuritySymbol(securityType);
    const currentPrice = MockDataHelpers.generateStockPrice();
    const shares = faker.number.float({ min: 1, max: 100, precision: 0.001 });
    const averageCost = currentPrice * faker.number.float({ min: 0.7, max: 1.3 });
    const totalCost = averageCost * shares;
    const marketValue = currentPrice * shares;
    const gainLoss = marketValue - totalCost;
    const gainLossPercent = (gainLoss / totalCost) * 100;

    const investmentData = {
      userId,
      accountId,
      securityInfo: {
        symbol,
        name: this.generateSecurityName(symbol, securityType),
        type: securityType,
        exchange: faker.helpers.arrayElement(['NYSE', 'NASDAQ', 'AMEX']),
        currency: 'USD',
        isin: faker.finance.bic(),
        cusip: faker.string.alphanumeric(9).toUpperCase()
      },
      position: {
        shares,
        averageCost: parseFloat(averageCost.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        marketValue: parseFloat(marketValue.toFixed(2)),
        gainLoss: parseFloat(gainLoss.toFixed(2)),
        gainLossPercent: parseFloat(gainLossPercent.toFixed(2)),
        dayChange: parseFloat((currentPrice * faker.number.float({ min: -0.05, max: 0.05 })).toFixed(2)),
        dayChangePercent: parseFloat(faker.number.float({ min: -5, max: 5 }).toFixed(2))
      },
      acquisition: {
        purchaseDate: MockDataHelpers.generateDateInPastMonths(24), // Up to 2 years ago
        purchaseMethod: faker.helpers.arrayElement(['buy', 'transfer', 'dividend_reinvestment']),
        purchasePrice: parseFloat(averageCost.toFixed(2)),
        fees: parseFloat(faker.number.float({ min: 0, max: 10 }).toFixed(2)),
        brokerage: faker.helpers.arrayElement([
          'Charles Schwab', 'Fidelity', 'Vanguard', 'E*TRADE', 'TD Ameritrade', 'Robinhood'
        ])
      },
      analytics: this.generateAnalytics(securityType),
      alerts: {
        priceTargets: this.generatePriceTargets(currentPrice),
        notifications: {
          priceMovement: faker.datatype.boolean(0.3),
          dividendAnnouncements: generateDividends && faker.datatype.boolean(0.5),
          earningsReports: faker.datatype.boolean(0.2),
          newsAlerts: faker.datatype.boolean(0.1)
        }
      },
      performance: {
        monthlyReturns: this.generateMonthlyReturns(),
        benchmarkComparison: {
          benchmark: 'S&P 500',
          alpha: parseFloat(faker.number.float({ min: -5, max: 5 }).toFixed(2)),
          beta: parseFloat(faker.number.float({ min: 0.5, max: 1.5 }).toFixed(2))
        },
        riskMetrics: {
          volatility: parseFloat(faker.number.float({ min: 10, max: 40 }).toFixed(2)),
          sharpeRatio: parseFloat(faker.number.float({ min: 0.5, max: 2.5 }).toFixed(2)),
          maxDrawdown: parseFloat(faker.number.float({ min: -30, max: -5 }).toFixed(2))
        }
      },
      dividends: generateDividends ? this.generateDividendHistory() : [],
      transactions: this.generateInvestmentTransactions(shares, averageCost),
      watchlist: {
        isWatched: faker.datatype.boolean(0.3),
        addedAt: faker.datatype.boolean(0.3) ? faker.date.past() : undefined,
        notes: faker.datatype.boolean(0.2) ? faker.lorem.sentence() : undefined
      }
    };

    const investment = new Investment(investmentData);
    return await investment.save();
  }

  private static generateSecuritySymbol(type: string): string {
    if (type === 'etf') {
      const etfSymbols = ['SPY', 'QQQ', 'VTI', 'VOO', 'IVV', 'VEA', 'VWO', 'AGG', 'BND', 'VNQ'];
      return faker.helpers.arrayElement(etfSymbols);
    }
    return MockDataHelpers.generateStockSymbol();
  }

  private static generateSecurityName(symbol: string, type: string): string {
    const companyNames = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corporation',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'SPY': 'SPDR S&P 500 ETF Trust',
      'QQQ': 'Invesco QQQ Trust',
      'VTI': 'Vanguard Total Stock Market ETF'
    };

    return companyNames[symbol] || faker.company.name() + (type === 'etf' ? ' ETF' : ' Inc.');
  }

  private static generateAnalytics(type: string) {
    if (type === 'bond') {
      return {
        dividend_yield: parseFloat(faker.number.float({ min: 2, max: 8 }).toFixed(2)),
        sector: 'Fixed Income',
        industry: 'Government Bonds'
      };
    }

    return {
      beta: parseFloat(faker.number.float({ min: 0.5, max: 1.8 }).toFixed(2)),
      pe_ratio: parseFloat(faker.number.float({ min: 8, max: 40 }).toFixed(1)),
      dividend_yield: parseFloat(faker.number.float({ min: 0, max: 6 }).toFixed(2)),
      expense_ratio: type === 'etf' ? parseFloat(faker.number.float({ min: 0.03, max: 0.75 }).toFixed(3)) : undefined,
      sector: faker.helpers.arrayElement([
        'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
        'Communication Services', 'Industrials', 'Energy', 'Utilities',
        'Consumer Defensive', 'Real Estate', 'Basic Materials'
      ]),
      industry: faker.helpers.arrayElement([
        'Software', 'Semiconductors', 'Banks', 'Biotechnology',
        'Internet Retail', 'Auto Manufacturers', 'Oil & Gas'
      ]),
      marketCap: faker.number.int({ min: 1000000000, max: 3000000000000 }),
      lastAnalyzed: faker.date.recent({ days: 30 })
    };
  }

  private static generatePriceTargets(currentPrice: number) {
    return [
      {
        type: 'above' as const,
        price: parseFloat((currentPrice * 1.1).toFixed(2)),
        isActive: faker.datatype.boolean(0.7),
        createdAt: faker.date.past(),
        triggeredAt: undefined
      },
      {
        type: 'below' as const,
        price: parseFloat((currentPrice * 0.9).toFixed(2)),
        isActive: faker.datatype.boolean(0.5),
        createdAt: faker.date.past(),
        triggeredAt: undefined
      }
    ];
  }

  private static generateMonthlyReturns() {
    const returns = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      returns.push({
        month: date.toISOString().substring(0, 7), // YYYY-MM format
        return: parseFloat(faker.number.float({ min: -15, max: 20 }).toFixed(2))
      });
    }
    return returns.reverse(); // Oldest first
  }

  private static generateDividendHistory() {
    const dividends = [];
    const numberOfDividends = faker.number.int({ min: 0, max: 4 }); // 0-4 dividend payments

    for (let i = 0; i < numberOfDividends; i++) {
      const paymentDate = MockDataHelpers.generateDateInPastMonths(12);
      dividends.push({
        exDividendDate: new Date(paymentDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before payment
        paymentDate,
        amount: parseFloat(faker.number.float({ min: 0.25, max: 2.5 }).toFixed(2)),
        currency: 'USD',
        type: faker.helpers.arrayElement(['regular', 'special', 'capital_gains'])
      });
    }

    return dividends.sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());
  }

  private static generateInvestmentTransactions(shares: number, averagePrice: number) {
    const transactions = [];
    const numberOfTransactions = faker.number.int({ min: 1, max: 5 });
    let remainingShares = shares;

    for (let i = 0; i < numberOfTransactions; i++) {
      const transactionShares = i === numberOfTransactions - 1 
        ? remainingShares 
        : faker.number.float({ min: 1, max: remainingShares * 0.8 });
      
      remainingShares -= transactionShares;

      transactions.push({
        date: MockDataHelpers.generateDateInPastMonths(24),
        type: faker.helpers.arrayElement(['buy', 'sell', 'dividend_reinvestment']),
        shares: parseFloat(transactionShares.toFixed(3)),
        price: parseFloat((averagePrice * faker.number.float({ min: 0.8, max: 1.2 })).toFixed(2)),
        fees: parseFloat(faker.number.float({ min: 0, max: 10 }).toFixed(2)),
        totalValue: parseFloat((transactionShares * averagePrice).toFixed(2))
      });

      if (remainingShares <= 0) break;
    }

    return transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
