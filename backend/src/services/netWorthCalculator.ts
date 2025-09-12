import mongoose from 'mongoose';
import { Account, Investment, Debt, PhysicalAsset } from '../models';
import { logger } from '../utils/logger';
import { PerformanceOptimizer } from '../utils/performanceOptimizer';

// TypeScript interfaces
export interface NetWorthBreakdown {
  netWorth: number;
  breakdown: {
    liquidAssets: number;
    portfolioValue: number;
    physicalAssets: number;
    totalLiabilities: number;
  };
  calculatedAt: Date;
}

export interface NetWorthByCategory {
  netWorth: number;
  breakdown: {
    liquidAssets: number;
    portfolioValue: number;
    physicalAssets: number;
    totalLiabilities: number;
  };
  categories: {
    assets: {
      liquid: number;
      investments: number;
      physical: number;
    };
    liabilities: {
      total: number;
      creditCards: number;
      loans: number;
      mortgages: number;
    };
  };
  calculatedAt: Date;
}

export class NetWorthCalculator {
  /**
   * Calculate current net worth for a user with caching
   */
  static async getCurrentNetWorth(userId: mongoose.Types.ObjectId): Promise<NetWorthBreakdown> {
    // Check cache first
    const cacheKey = `networth:${userId}`;
    const cached = await PerformanceOptimizer.getCached<NetWorthBreakdown>(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate fresh if not cached
    const result = await PerformanceOptimizer.trackCalculation(
      'net_worth_calculation',
      () => this.calculateNetWorthFresh(userId)
    );

    // Cache the result for 5 minutes
    await PerformanceOptimizer.setCache(cacheKey, result, 300);

    return result;
  }

  /**
   * Calculate current net worth for a user (without caching)
   */
  private static async calculateNetWorthFresh(userId: mongoose.Types.ObjectId): Promise<NetWorthBreakdown> {
    try {
      // Parallel fetch all financial data
      const [accounts, investments, debts, physicalAssets] = await Promise.all([
        Account.find({ userId, isActive: true }),
        Investment.find({ userId, isActive: true }),
        Debt.find({ userId, isActive: true }),
        PhysicalAsset.find({ userId, isActive: true })
      ]);

      // Calculate liquid assets (checking, savings accounts)
      const liquidAssets = accounts
        .filter(acc => ['checking', 'savings'].includes(acc.type))
        .reduce((sum, acc) => sum + (acc.accountInfo?.balance || 0), 0);

      // Calculate portfolio value (use existing investment data)
      const portfolioValue = investments
        .reduce((sum, inv) => sum + (inv.position?.marketValue || 0), 0);

      // Calculate physical assets value (including equity from financed assets)
      const physicalValue = physicalAssets
        .reduce((sum, asset) => sum + (asset.equity || 0), 0);

      // Calculate total debt (including loans on physical assets)
      const debtFromDebts = debts
        .reduce((sum, debt) => sum + (debt.remainingBalance || 0), 0);

      const loansOnAssets = physicalAssets
        .reduce((sum, asset) => sum + (asset.loanInfo?.loanBalance || 0), 0);

      const totalLiabilities = debtFromDebts + loansOnAssets;

      const netWorth = liquidAssets + portfolioValue + physicalValue - totalLiabilities;

      logger.info(`Net worth calculated for user ${userId}: ${netWorth}`);

      return {
        netWorth,
        breakdown: {
          liquidAssets,
          portfolioValue,
          physicalAssets: physicalValue,
          totalLiabilities
        },
        calculatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error calculating net worth:', error);
      throw new Error('Failed to calculate net worth');
    }
  }

  /**
   * Get net worth with detailed category breakdown
   */
  static async getNetWorthByCategory(userId: mongoose.Types.ObjectId): Promise<NetWorthByCategory> {
    try {
      const netWorthData = await this.getCurrentNetWorth(userId);

      // Get detailed category breakdown
      const [accounts, debts, physicalAssets] = await Promise.all([
        Account.find({ userId, isActive: true }),
        Debt.find({ userId, isActive: true }),
        PhysicalAsset.find({ userId, isActive: true })
      ]);

      // Categorize liabilities
      const creditCards = debts
        .filter(debt => debt.type === 'credit_card')
        .reduce((sum, debt) => sum + (debt.remainingBalance || 0), 0);

      const loans = debts
        .filter(debt => ['loan', 'student_loan'].includes(debt.type))
        .reduce((sum, debt) => sum + (debt.remainingBalance || 0), 0);

      const mortgages = debts
        .filter(debt => debt.type === 'mortgage')
        .reduce((sum, debt) => sum + (debt.remainingBalance || 0), 0) +
        physicalAssets
        .filter(asset => asset.type === 'real_estate')
        .reduce((sum, asset) => sum + (asset.loanInfo?.loanBalance || 0), 0);

      return {
        ...netWorthData,
        categories: {
          assets: {
            liquid: netWorthData.breakdown.liquidAssets,
            investments: netWorthData.breakdown.portfolioValue,
            physical: netWorthData.breakdown.physicalAssets
          },
          liabilities: {
            total: netWorthData.breakdown.totalLiabilities,
            creditCards,
            loans,
            mortgages
          }
        }
      };
    } catch (error) {
      logger.error('Error calculating categorized net worth:', error);
      throw new Error('Failed to calculate categorized net worth');
    }
  }

  /**
   * Get net worth history over a date range
   */
  static async getNetWorthHistory(
    userId: mongoose.Types.ObjectId, 
    startDate: Date, 
    endDate: Date
  ): Promise<{ date: Date; netWorth: number }[]> {
    try {
      // For now, return current net worth as a single point
      // In a real implementation, you would query historical data
      const currentNetWorth = await this.getCurrentNetWorth(userId);
      
      return [{
        date: new Date(),
        netWorth: currentNetWorth.netWorth
      }];
    } catch (error) {
      logger.error('Error calculating net worth history:', error);
      throw new Error('Failed to calculate net worth history');
    }
  }

  /**
   * Get net worth summary for dashboard
   */
  static async getNetWorthSummary(userId: mongoose.Types.ObjectId): Promise<{
    current: number;
    change: number;
    changePercent: number;
    changeType: 'positive' | 'negative' | 'neutral';
  }> {
    try {
      const currentNetWorth = await this.getCurrentNetWorth(userId);
      
      // For now, use placeholder for historical comparison
      // This will be implemented in Phase 4 with actual historical data
      const mockPreviousNetWorth = currentNetWorth.netWorth * 0.95; // 5% growth placeholder
      
      const change = currentNetWorth.netWorth - mockPreviousNetWorth;
      const changePercent = mockPreviousNetWorth > 0 
        ? (change / mockPreviousNetWorth) * 100 
        : 0;

      return {
        current: currentNetWorth.netWorth,
        change,
        changePercent,
        changeType: changePercent > 0 ? 'positive' : changePercent < 0 ? 'negative' : 'neutral'
      };
    } catch (error) {
      logger.error('Error calculating net worth summary:', error);
      throw new Error('Failed to calculate net worth summary');
    }
  }

  /**
   * Validate net worth calculation inputs
   */
  static validateInputs(assets: number, liabilities: number): void {
    if (typeof assets !== 'number' || !isFinite(assets)) {
      throw new Error('Total assets must be a valid number');
    }

    if (typeof liabilities !== 'number' || !isFinite(liabilities)) {
      throw new Error('Total liabilities must be a valid number');
    }

    if (assets < 0) {
      logger.warn('Total assets is negative, this may indicate data quality issues');
    }

    if (liabilities < 0) {
      throw new Error('Total liabilities cannot be negative');
    }

    if (Math.abs(assets) > 1e12 || Math.abs(liabilities) > 1e12) {
      throw new Error('Financial values exceed reasonable limits (> $1 trillion)');
    }
  }
}

export default NetWorthCalculator;
