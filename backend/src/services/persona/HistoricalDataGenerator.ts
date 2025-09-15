import mongoose from 'mongoose';
import { logger } from '../../utils/logger';
import { Account, Investment, AccountBalanceHistory, NetWorthMilestone, DailyPrice } from '../../models';
import { NetWorthCalculator } from '../netWorthCalculator';
import { MarketDataService } from '../marketDataService';

/**
 * HistoricalDataGenerator - Advanced Historical Data Generation
 * 
 * This service generates comprehensive historical data for persona users,
 * including detailed account balance progression, investment price history,
 * and net worth trend calculations with realistic market movements.
 */

export interface HistoricalDataConfig {
  startDate: Date;
  endDate: Date;
  accountBalanceGranularity: 'daily' | 'weekly' | 'monthly';
  investmentPriceGranularity: 'daily' | 'weekly';
  netWorthSnapshotFrequency: 'daily' | 'weekly' | 'monthly';
  includeMarketVolatility: boolean;
  includeSeasonalVariations: boolean;
  generateTransactionHistory: boolean;
}

export interface GeneratedHistoricalData {
  accountBalanceHistory: {
    totalRecords: number;
    accountsProcessed: number;
    dateRange: { start: Date; end: Date };
  };
  investmentPriceHistory: {
    totalRecords: number;
    symbolsProcessed: string[];
    dateRange: { start: Date; end: Date };
  };
  netWorthMilestones: {
    totalRecords: number;
    dateRange: { start: Date; end: Date };
  };
  processingTime: number;
  errors: string[];
}

export interface AccountBalanceProgression {
  accountId: string;
  accountName: string;
  accountType: string;
  progression: Array<{
    date: Date;
    balance: number;
    changeAmount: number;
    changeType: 'manual_update' | 'transaction_link' | 'interest' | 'fee' | 'initial';
    description: string;
  }>;
}

export interface InvestmentPriceProgression {
  symbol: string;
  name: string;
  progression: Array<{
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjustedClose: number;
  }>;
}

export class HistoricalDataGenerator {
  private static marketDataService = new MarketDataService();
  private static readonly DEFAULT_CONFIG: HistoricalDataConfig = {
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    endDate: new Date(),
    accountBalanceGranularity: 'daily',
    investmentPriceGranularity: 'daily',
    netWorthSnapshotFrequency: 'daily',
    includeMarketVolatility: true,
    includeSeasonalVariations: true,
    generateTransactionHistory: false
  };

  /**
   * Generate comprehensive historical data for a user
   */
  static async generateHistoricalDataForUser(
    userId: mongoose.Types.ObjectId,
    config: Partial<HistoricalDataConfig> = {}
  ): Promise<GeneratedHistoricalData> {
    const startTime = Date.now();
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const result: GeneratedHistoricalData = {
      accountBalanceHistory: {
        totalRecords: 0,
        accountsProcessed: 0,
        dateRange: { start: finalConfig.startDate, end: finalConfig.endDate }
      },
      investmentPriceHistory: {
        totalRecords: 0,
        symbolsProcessed: [],
        dateRange: { start: finalConfig.startDate, end: finalConfig.endDate }
      },
      netWorthMilestones: {
        totalRecords: 0,
        dateRange: { start: finalConfig.startDate, end: finalConfig.endDate }
      },
      processingTime: 0,
      errors: []
    };

    try {
      logger.info(`📊 Generating historical data for user ${userId}`);
      logger.info(`📅 Date range: ${finalConfig.startDate.toISOString()} to ${finalConfig.endDate.toISOString()}`);

      // Generate account balance history
      const accountHistory = await this.generateAccountBalanceHistory(userId, finalConfig);
      result.accountBalanceHistory = accountHistory;

      // Generate investment price history
      const investmentHistory = await this.generateInvestmentPriceHistory(userId, finalConfig);
      result.investmentPriceHistory = investmentHistory;

      // Generate net worth milestones
      const netWorthHistory = await this.generateNetWorthMilestones(userId, finalConfig);
      result.netWorthMilestones = netWorthHistory;

      result.processingTime = Date.now() - startTime;

      logger.info(`✅ Historical data generation completed in ${result.processingTime}ms`);
      logger.info(`📊 Records generated: ${result.accountBalanceHistory.totalRecords} account balances, ${result.investmentPriceHistory.totalRecords} price records, ${result.netWorthMilestones.totalRecords} net worth milestones`);

      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.processingTime = Date.now() - startTime;
      
      logger.error(`❌ Failed to generate historical data for user ${userId}:`, error);
      return result;
    }
  }

  /**
   * Generate detailed account balance history
   */
  private static async generateAccountBalanceHistory(
    userId: mongoose.Types.ObjectId,
    config: HistoricalDataConfig
  ): Promise<GeneratedHistoricalData['accountBalanceHistory']> {
    try {
      const accounts = await Account.find({ userId, isActive: true });
      let totalRecords = 0;
      let accountsProcessed = 0;

      for (const account of accounts) {
        try {
          const progression = await this.generateAccountBalanceProgression(account, config);
          const records = await this.saveAccountBalanceHistory(account._id as mongoose.Types.ObjectId, userId, progression);
          
          totalRecords += records;
          accountsProcessed++;
          
          logger.debug(`📊 Generated ${records} balance records for account ${account.accountInfo.name}`);
        } catch (error) {
          logger.error(`❌ Failed to generate balance history for account ${account._id}:`, error);
        }
      }

      return {
        totalRecords,
        accountsProcessed,
        dateRange: { start: config.startDate, end: config.endDate }
      };
    } catch (error) {
      throw new Error(`Failed to generate account balance history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate account balance progression for a specific account
   */
  private static async generateAccountBalanceProgression(
    account: any,
    config: HistoricalDataConfig
  ): Promise<AccountBalanceProgression['progression']> {
    const progression = [];
    const currentBalance = account.accountInfo.balance;
    const accountType = account.type;
    const startBalance = this.calculateStartingBalance(currentBalance, config, accountType);

    // Generate progression based on account type
    switch (accountType) {
      case 'checking':
        progression.push(...this.generateCheckingAccountProgression(startBalance, currentBalance, config));
        break;
      case 'savings':
        progression.push(...this.generateSavingsAccountProgression(startBalance, currentBalance, config));
        break;
      case 'investment':
        progression.push(...this.generateInvestmentAccountProgression(startBalance, currentBalance, config));
        break;
      case 'credit':
        progression.push(...this.generateCreditAccountProgression(startBalance, currentBalance, config));
        break;
      default:
        progression.push(...this.generateGenericAccountProgression(startBalance, currentBalance, config));
    }

    return progression;
  }

  /**
   * Generate checking account progression (more volatile)
   */
  private static generateCheckingAccountProgression(
    startBalance: number,
    endBalance: number,
    config: HistoricalDataConfig
  ): Array<any> {
    const progression = [];
    const days = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyChange = (endBalance - startBalance) / days;
    
    let currentBalance = startBalance;
    const currentDate = new Date(config.startDate);

    for (let day = 0; day <= days; day++) {
      // Add daily volatility for checking accounts
      const volatility = config.includeMarketVolatility ? (Math.random() - 0.5) * 0.02 : 0;
      const seasonalAdjustment = config.includeSeasonalVariations ? this.getSeasonalAdjustment(currentDate) : 0;
      
      const changeAmount = dailyChange * (1 + volatility + seasonalAdjustment);
      currentBalance += changeAmount;

      // Ensure balance doesn't go negative (unless it's a credit account)
      if (currentBalance < 0) {
        currentBalance = 0;
      }

      progression.push({
        date: new Date(currentDate),
        balance: Math.round(currentBalance * 100) / 100,
        changeAmount: Math.round(changeAmount * 100) / 100,
        changeType: changeAmount >= 0 ? 'transaction_link' : 'transaction_link',
        description: `Daily balance progression - ${changeAmount >= 0 ? 'increase' : 'decrease'}`
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return progression;
  }

  /**
   * Generate savings account progression (steady growth)
   */
  private static generateSavingsAccountProgression(
    startBalance: number,
    endBalance: number,
    config: HistoricalDataConfig
  ): Array<any> {
    const progression = [];
    const days = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyChange = (endBalance - startBalance) / days;
    
    let currentBalance = startBalance;
    const currentDate = new Date(config.startDate);

    for (let day = 0; day <= days; day++) {
      // Savings accounts have less volatility
      const volatility = config.includeMarketVolatility ? (Math.random() - 0.5) * 0.005 : 0;
      const interestRate = 0.0001; // Daily interest rate
      
      const changeAmount = dailyChange + (currentBalance * interestRate) + (currentBalance * volatility);
      currentBalance += changeAmount;

      progression.push({
        date: new Date(currentDate),
        balance: Math.round(currentBalance * 100) / 100,
        changeAmount: Math.round(changeAmount * 100) / 100,
        changeType: changeAmount >= 0 ? 'interest' : 'transaction_link',
        description: `Savings account progression - ${changeAmount >= 0 ? 'interest earned' : 'transaction'}`
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return progression;
  }

  /**
   * Generate investment account progression (market-linked)
   */
  private static generateInvestmentAccountProgression(
    startBalance: number,
    endBalance: number,
    config: HistoricalDataConfig
  ): Array<any> {
    const progression = [];
    const days = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalReturn = (endBalance - startBalance) / startBalance;
    
    let currentBalance = startBalance;
    const currentDate = new Date(config.startDate);

    for (let day = 0; day <= days; day++) {
      // Investment accounts follow market patterns
      const marketVolatility = config.includeMarketVolatility ? (Math.random() - 0.5) * 0.03 : 0;
      const trendFactor = totalReturn / days;
      
      const changeAmount = currentBalance * (trendFactor + marketVolatility);
      currentBalance += changeAmount;

      // Ensure balance doesn't go negative
      if (currentBalance < 0) {
        currentBalance = 0;
      }

      progression.push({
        date: new Date(currentDate),
        balance: Math.round(currentBalance * 100) / 100,
        changeAmount: Math.round(changeAmount * 100) / 100,
        changeType: changeAmount >= 0 ? 'interest' : 'fee',
        description: `Investment account progression - market movement`
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return progression;
  }

  /**
   * Generate credit account progression (debt reduction)
   */
  private static generateCreditAccountProgression(
    startBalance: number,
    endBalance: number,
    config: HistoricalDataConfig
  ): Array<any> {
    const progression = [];
    const days = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyChange = (endBalance - startBalance) / days;
    
    let currentBalance = startBalance;
    const currentDate = new Date(config.startDate);

    for (let day = 0; day <= days; day++) {
      // Credit accounts have payment patterns
      const isPaymentDay = day % 30 === 0; // Monthly payments
      const paymentAmount = isPaymentDay ? Math.abs(dailyChange) * 30 : 0;
      
      // Add some spending volatility
      const spendingVolatility = config.includeMarketVolatility ? Math.random() * 0.01 : 0;
      const spendingAmount = currentBalance * spendingVolatility;
      
      const changeAmount = -paymentAmount + spendingAmount; // Negative for payments, positive for spending
      currentBalance += changeAmount;

      progression.push({
        date: new Date(currentDate),
        balance: Math.round(currentBalance * 100) / 100,
        changeAmount: Math.round(changeAmount * 100) / 100,
        changeType: changeAmount < 0 ? 'transaction_link' : 'transaction_link', // Payment reduces debt
        description: isPaymentDay ? 'Monthly payment' : 'Daily spending/interest'
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return progression;
  }

  /**
   * Generate generic account progression
   */
  private static generateGenericAccountProgression(
    startBalance: number,
    endBalance: number,
    config: HistoricalDataConfig
  ): Array<any> {
    const progression = [];
    const days = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyChange = (endBalance - startBalance) / days;
    
    let currentBalance = startBalance;
    const currentDate = new Date(config.startDate);

    for (let day = 0; day <= days; day++) {
      const volatility = config.includeMarketVolatility ? (Math.random() - 0.5) * 0.01 : 0;
      const changeAmount = dailyChange * (1 + volatility);
      currentBalance += changeAmount;

      progression.push({
        date: new Date(currentDate),
        balance: Math.round(currentBalance * 100) / 100,
        changeAmount: Math.round(changeAmount * 100) / 100,
        changeType: changeAmount >= 0 ? 'transaction_link' : 'transaction_link',
        description: `Generic account progression`
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return progression;
  }

  /**
   * Generate investment price history
   */
  private static async generateInvestmentPriceHistory(
    userId: mongoose.Types.ObjectId,
    config: HistoricalDataConfig
  ): Promise<GeneratedHistoricalData['investmentPriceHistory']> {
    try {
      const investments = await Investment.find({ userId, isActive: true });
      let totalRecords = 0;
      const symbolsProcessed: string[] = [];

      for (const investment of investments) {
        try {
          const symbol = investment.securityInfo.symbol;
          if (!symbol) continue;

          const progression = await this.generateInvestmentPriceProgression(investment, config);
          const records = await this.saveInvestmentPriceHistory(symbol, progression);
          
          totalRecords += records;
          symbolsProcessed.push(symbol);
          
          logger.debug(`📈 Generated ${records} price records for ${symbol}`);
        } catch (error) {
          logger.error(`❌ Failed to generate price history for investment ${investment._id}:`, error);
        }
      }

      return {
        totalRecords,
        symbolsProcessed,
        dateRange: { start: config.startDate, end: config.endDate }
      };
    } catch (error) {
      throw new Error(`Failed to generate investment price history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate investment price progression
   */
  private static async generateInvestmentPriceProgression(
    investment: any,
    config: HistoricalDataConfig
  ): Promise<InvestmentPriceProgression['progression']> {
    const progression = [];
    const currentPrice = investment.position.currentPrice;
    const startPrice = this.calculateStartingPrice(currentPrice, config);
    
    const days = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyReturn = Math.pow(currentPrice / startPrice, 1 / days) - 1;
    
    let currentPriceValue = startPrice;
    const currentDate = new Date(config.startDate);

    for (let day = 0; day <= days; day++) {
      // Generate OHLC data
      const volatility = config.includeMarketVolatility ? (Math.random() - 0.5) * 0.04 : 0;
      const trendFactor = dailyReturn;
      
      const changeFactor = 1 + trendFactor + volatility;
      const newPrice = currentPriceValue * changeFactor;
      
      const open = currentPriceValue;
      const close = newPrice;
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      const volume = Math.floor(Math.random() * 1000000) + 100000;

      progression.push({
        date: new Date(currentDate),
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume,
        adjustedClose: Math.round(close * 100) / 100
      });

      currentPriceValue = close;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return progression;
  }

  /**
   * Generate net worth milestones
   */
  private static async generateNetWorthMilestones(
    userId: mongoose.Types.ObjectId,
    config: HistoricalDataConfig
  ): Promise<GeneratedHistoricalData['netWorthMilestones']> {
    try {
      const days = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentNetWorth = await NetWorthCalculator.getCurrentNetWorth(userId);
      
      let totalRecords = 0;
      const currentDate = new Date(config.startDate);

      for (let day = 0; day <= days; day++) {
        try {
          // Generate net worth progression
          const netWorthData = await this.generateNetWorthForDate(userId, currentDate, currentNetWorth, config);
          
          if (netWorthData) {
            await NetWorthMilestone.create({
              userId,
              date: new Date(currentDate),
              trigger: 'daily_snapshot',
              netWorth: netWorthData.netWorth,
              breakdown: netWorthData.breakdown,
              metadata: {
                triggerDetails: 'Historical data generation',
                snapshotData: {
                  dataQuality: 'complete',
                  source: 'manual'
                }
              }
            });
            
            totalRecords++;
          }
        } catch (error) {
          logger.warn(`⚠️ Failed to generate net worth milestone for ${currentDate.toISOString()}:`, error);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      logger.debug(`📊 Generated ${totalRecords} net worth milestones`);

      return {
        totalRecords,
        dateRange: { start: config.startDate, end: config.endDate }
      };
    } catch (error) {
      throw new Error(`Failed to generate net worth milestones: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate net worth for a specific date
   */
  private static async generateNetWorthForDate(
    userId: mongoose.Types.ObjectId,
    date: Date,
    currentNetWorth: any,
    config: HistoricalDataConfig
  ): Promise<any> {
    try {
      // This is a simplified version - in a real implementation, you'd calculate
      // net worth based on historical account balances and investment values
      const daysFromStart = Math.ceil((date.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalDays = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const progress = daysFromStart / totalDays;
      const netWorth = currentNetWorth.netWorth * progress;
      
      return {
        netWorth,
        breakdown: {
          liquidAssets: currentNetWorth.breakdown.liquidAssets * progress,
          portfolioValue: currentNetWorth.breakdown.portfolioValue * progress,
          physicalAssets: currentNetWorth.breakdown.physicalAssets * progress,
          totalLiabilities: currentNetWorth.breakdown.totalLiabilities * progress
        }
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Save account balance history to database
   */
  private static async saveAccountBalanceHistory(
    accountId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    progression: AccountBalanceProgression['progression']
  ): Promise<number> {
    try {
      const records = [];
      
      for (const point of progression) {
        // Validate and fix NaN values
        const balance = isNaN(point.balance) ? 0 : point.balance;
        const changeAmount = isNaN(point.changeAmount) ? 0 : point.changeAmount;
        
        records.push({
          accountId,
          userId,
          date: point.date,
          balance: balance,
          changeType: point.changeType,
          changeAmount: changeAmount,
          previousBalance: 0, // Would be calculated in real implementation
          description: point.description
        });
      }

      await AccountBalanceHistory.insertMany(records);
      return records.length;
    } catch (error) {
      throw new Error(`Failed to save account balance history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save investment price history to database
   */
  private static async saveInvestmentPriceHistory(
    symbol: string,
    progression: InvestmentPriceProgression['progression']
  ): Promise<number> {
    try {
      const records = [];
      
      for (const point of progression) {
        records.push({
          symbol: symbol.toUpperCase(),
          date: point.date,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: point.volume,
          adjustedClose: point.adjustedClose,
          source: 'manual'
        });
      }

      await DailyPrice.insertMany(records);
      return records.length;
    } catch (error) {
      throw new Error(`Failed to save investment price history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate starting balance based on current balance and timeframe
   */
  private static calculateStartingBalance(currentBalance: number, config: HistoricalDataConfig, accountType: string): number {
    const days = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Different growth patterns for different account types
    switch (accountType) {
      case 'checking':
        return currentBalance * 0.3; // Checking accounts start lower
      case 'savings':
        return currentBalance * 0.5; // Savings accounts grow steadily
      case 'investment':
        return currentBalance * 0.4; // Investment accounts can grow significantly
      case 'credit':
        return currentBalance * 1.5; // Credit accounts start with higher debt
      default:
        return currentBalance * 0.6; // Generic growth
    }
  }

  /**
   * Calculate starting price based on current price and timeframe
   */
  private static calculateStartingPrice(currentPrice: number, config: HistoricalDataConfig): number {
    const days = Math.ceil((config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const annualReturn = 0.1; // 10% annual return assumption
    const dailyReturn = annualReturn / 365;
    const totalReturn = Math.pow(1 + dailyReturn, days);
    
    return currentPrice / totalReturn;
  }

  /**
   * Get seasonal adjustment factor
   */
  private static getSeasonalAdjustment(date: Date): number {
    const month = date.getMonth();
    const day = date.getDate();
    
    // Seasonal patterns (simplified)
    const seasonalFactors = {
      0: 0.02,  // January - New Year spending
      1: 0.01,  // February - Valentine's
      2: 0.03,  // March - Spring spending
      3: 0.01,  // April - Tax season
      4: 0.02,  // May - Mother's Day
      5: 0.01,  // June - Father's Day
      6: 0.02,  // July - Summer spending
      7: 0.01,  // August - Back to school
      8: 0.02,  // September - Fall spending
      9: 0.03,  // October - Halloween
      10: -0.01, // November - Thanksgiving (saving)
      11: 0.04   // December - Holiday spending
    };
    
    return seasonalFactors[month as keyof typeof seasonalFactors] || 0;
  }
}

export default HistoricalDataGenerator;
