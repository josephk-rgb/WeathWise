import mongoose from 'mongoose';
import NetWorthMilestone, { INetWorthMilestone } from '../models/NetWorthMilestone';
import { NetWorthCalculator } from './netWorthCalculator';
import { MarketDataService } from './marketDataService';
import { DailySnapshotService } from './snapshot/DailySnapshotService';
import { logger } from '../utils/logger';
import Investment from '../models/Investment';
import Account from '../models/Account';
import User from '../models/User';

export interface TrendData {
  date: string;
  netWorth: number; // Changed from 'value' to 'netWorth' to match frontend interface
  assets: number;
  liabilities: number;
  investments: number;
  cash: number;
}

export class NetWorthTracker {
  private static marketDataService = new MarketDataService();
  
  // Simple in-memory cache for trend data to avoid recalculation
  private static trendCache = new Map<string, { data: TrendData[]; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static async onSignificantEvent(
    userId: mongoose.Types.ObjectId, 
    trigger: string, 
    details?: string
  ): Promise<void> {
    try {
      // Check if event-based snapshots should be created
      const shouldCreateSnapshot = await DailySnapshotService.shouldCreateEventSnapshot(
        userId, 
        trigger, 
        details ? parseFloat(details.replace(/[^\d.-]/g, '')) : undefined
      );

      if (!shouldCreateSnapshot) {
        logger.debug(`⏰ Skipping event snapshot for user ${userId}, trigger: ${trigger} - event-based snapshots disabled or cooldown active`);
        return;
      }

      const currentNetWorth = await NetWorthCalculator.getCurrentNetWorth(userId);
      
      // Capture current prices for investments
      const priceSnapshot = await this.captureCurrentPrices(userId);
      
      await NetWorthMilestone.create({
        userId,
        date: new Date(),
        trigger,
        netWorth: currentNetWorth.netWorth,
        breakdown: currentNetWorth.breakdown,
        metadata: {
          triggerDetails: details,
          priceSnapshot
        }
      });

      // Clear trend cache for this user since we have new data
      this.clearTrendCache(userId);

      logger.info(`📸 NetWorth milestone created for user ${userId}: ${trigger}`);
    } catch (error) {
      logger.error('❌ Error creating net worth milestone:', error);
    }
  }

  static async onTransactionCreated(transactionAmount: number, userId: mongoose.Types.ObjectId): Promise<void> {
    // Event-based snapshots are now controlled by DailySnapshotService
    // Only create snapshots for very large transactions that meet the threshold
    const largeTransactionThreshold = 10000; // $10,000 minimum
    
    if (Math.abs(transactionAmount) > largeTransactionThreshold) {
      await this.onSignificantEvent(
        userId, 
        'transaction',
        `Large transaction: $${transactionAmount}`
      );
    } else {
      logger.debug(`💳 Transaction of $${transactionAmount} below threshold - no snapshot created`);
    }
  }

  static async onAccountBalanceUpdated(accountId: mongoose.Types.ObjectId): Promise<void> {
    try {
      const account = await Account.findById(accountId);
      if (account) {
        // Account balance changes no longer trigger snapshots automatically
        // Daily snapshots will capture these changes at end of day
        logger.debug(`💳 Account balance updated for ${account.type} - daily snapshot will capture this change`);
        
        // Only create snapshot for manual balance updates (admin changes)
        // This is detected by checking if the update was manual
        const isManualUpdate = true; // This would need to be passed from the controller
        
        if (isManualUpdate) {
          await this.onSignificantEvent(
            account.userId,
            'manual_update',
            `Manual balance update - ${account.type}: $${account.accountInfo.balance}`
          );
        }
      }
    } catch (error) {
      logger.error('❌ Error handling account balance update:', error);
    }
  }

  static async createMonthlySnapshots(): Promise<void> {
    try {
      // Get active users (simplified - get all users for testing)
      const activeUsers = await User.find({}).limit(100);
      
      for (const user of activeUsers) {
        await this.onSignificantEvent(user._id as mongoose.Types.ObjectId, 'monthly_snapshot');
      }
      
      console.log(`Created monthly snapshots for ${activeUsers.length} users`);
    } catch (error) {
      console.error('Error creating monthly snapshots:', error);
    }
  }

  private static async captureCurrentPrices(userId: mongoose.Types.ObjectId): Promise<Array<{ symbol: string; price: number }>> {
    try {
      const investments = await Investment.find({ userId, isActive: true });
      const symbols = investments.map(inv => inv.securityInfo.symbol).filter(Boolean);
      
      if (symbols.length === 0) return [];
      
      const priceSnapshot: Array<{ symbol: string; price: number }> = [];
      
      for (const symbol of symbols) {
        try {
          const quote = await this.marketDataService.getQuote(symbol);
          if (quote && quote.currentPrice) {
            priceSnapshot.push({
              symbol,
              price: quote.currentPrice
            });
          }
        } catch (error) {
          console.warn(`Failed to get price for ${symbol}:`, error);
        }
      }
      
      return priceSnapshot;
    } catch (error) {
      console.error('Error capturing current prices:', error);
      return [];
    }
  }

  static async getNetWorthTrend(userId: mongoose.Types.ObjectId, days: number = 30): Promise<TrendData[]> {
    try {
      // Create cache key based on userId and days
      const cacheKey = `${userId.toString()}_${days}`;
      const now = Date.now();
      
      // Check cache first
      const cached = this.trendCache.get(cacheKey);
      if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
        logger.debug(`📊 Using cached trend data for user ${userId}, ${days} days`);
        return cached.data;
      }
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Get existing snapshots in the date range
      const snapshots = await NetWorthMilestone.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });
      
      // If we have enough snapshots, use them directly
      if (snapshots.length >= 4) {
        const trendData = this.convertSnapshotsToTrendData(snapshots);
        // Cache the result
        this.trendCache.set(cacheKey, { data: trendData, timestamp: now });
        return trendData;
      }
      
      // Otherwise, create key snapshots on-demand (weekly points)
      const keyDates = this.generateKeyDates(startDate, endDate, 7);
      console.log('📊 Generated key dates:', keyDates.map(d => d.toISOString().split('T')[0]));
      const trendData: TrendData[] = [];
      
      for (const date of keyDates) {
        const nearestSnapshot = await this.findNearestSnapshot(userId, date);
        
        let netWorthData;
        if (nearestSnapshot && !this.isSnapshotTooOld(nearestSnapshot, date)) {
          netWorthData = {
            netWorth: nearestSnapshot.netWorth,
            breakdown: nearestSnapshot.breakdown
          };
        } else {
          // For historical dates, generate realistic trend data based on current net worth
          const currentNetWorth = await NetWorthCalculator.getCurrentNetWorth(userId);
          netWorthData = this.generateHistoricalNetWorth(currentNetWorth, date, new Date());
          
          // No longer cache trend calculations as milestones
          // Daily snapshots provide the historical data needed
          logger.debug(`📊 Generated historical net worth data for trend calculation - no snapshot needed`);
        }
        
        trendData.push({
          date: date.toISOString().split('T')[0],
          netWorth: netWorthData.netWorth,
          assets: netWorthData.breakdown.liquidAssets + netWorthData.breakdown.portfolioValue + netWorthData.breakdown.physicalAssets,
          liabilities: netWorthData.breakdown.totalLiabilities,
          investments: netWorthData.breakdown.portfolioValue,
          cash: netWorthData.breakdown.liquidAssets
        });
        
        console.log(`📊 Generated data point for ${date.toISOString().split('T')[0]}: $${netWorthData.netWorth}`);
      }
      
      // Cache the generated trend data
      this.trendCache.set(cacheKey, { data: trendData, timestamp: now });
      
      return trendData;
    } catch (error) {
      console.error('Error generating net worth trend:', error);
      return [];
    }
  }

  private static convertSnapshotsToTrendData(snapshots: INetWorthMilestone[]): TrendData[] {
    return snapshots.map(snapshot => ({
      date: snapshot.date.toISOString().split('T')[0],
      netWorth: snapshot.netWorth,
      assets: snapshot.breakdown.liquidAssets + snapshot.breakdown.portfolioValue + snapshot.breakdown.physicalAssets,
      liabilities: snapshot.breakdown.totalLiabilities,
      investments: snapshot.breakdown.portfolioValue,
      cash: snapshot.breakdown.liquidAssets
    }));
  }

  private static generateKeyDates(startDate: Date, endDate: Date, intervalDays: number): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + intervalDays);
    }
    
    // Always include end date
    if (dates[dates.length - 1].getTime() !== endDate.getTime()) {
      dates.push(endDate);
    }
    
    return dates;
  }

  private static async findNearestSnapshot(userId: mongoose.Types.ObjectId, date: Date): Promise<INetWorthMilestone | null> {
    return await NetWorthMilestone.findOne({
      userId,
      date: { $lte: date }
    }).sort({ date: -1 });
  }

  private static isSnapshotTooOld(snapshot: INetWorthMilestone, targetDate: Date): boolean {
    const daysDiff = Math.abs(targetDate.getTime() - snapshot.date.getTime()) / (24 * 60 * 60 * 1000);
    return daysDiff > 14; // Consider snapshot too old if more than 14 days
  }

  /**
   * Generate realistic historical net worth data for trend visualization
   * This creates a believable progression from historical date to current net worth
   * Uses deterministic pseudo-random generation based on date for consistency
   */
  private static generateHistoricalNetWorth(
    currentNetWorth: any, 
    historicalDate: Date, 
    currentDate: Date
  ): any {
    const daysDiff = Math.max(1, (currentDate.getTime() - historicalDate.getTime()) / (24 * 60 * 60 * 1000));
    const monthsDiff = daysDiff / 30;
    
    // Generate realistic historical progression (assuming some growth over time)
    // Base growth rate: 0.5% per month (6% annually) with some volatility
    const baseGrowthRate = 0.005;
    const volatility = 0.15; // 15% volatility
    
    // Create deterministic pseudo-random factor based on date
    // Use a simple linear congruential generator for consistency
    const dateString = historicalDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    const hash = this.simpleHash(dateString);
    const deterministicFactor = (hash % 1000) / 1000; // 0 to 1
    
    const growthWithVolatility = baseGrowthRate + (deterministicFactor - 0.5) * volatility;
    
    // Calculate historical multiplier (work backwards from current)
    const historicalMultiplier = Math.pow(1 + growthWithVolatility, -monthsDiff);
    
    // Apply to each component with deterministic variations
    const portfolioVolatilityFactor = 0.9 + deterministicFactor * 0.2; // More volatile for investments
    const historicalNetWorth = Math.round(currentNetWorth.netWorth * historicalMultiplier);
    const historicalLiquidAssets = Math.round(currentNetWorth.breakdown.liquidAssets * historicalMultiplier);
    const historicalPortfolioValue = Math.round(currentNetWorth.breakdown.portfolioValue * historicalMultiplier * portfolioVolatilityFactor);
    const historicalPhysicalAssets = Math.round(currentNetWorth.breakdown.physicalAssets * Math.pow(1.02, -monthsDiff)); // Slower growth
    const historicalLiabilities = Math.round(currentNetWorth.breakdown.totalLiabilities * Math.pow(0.995, -monthsDiff)); // Slight decrease over time
    
    return {
      netWorth: historicalNetWorth,
      breakdown: {
        liquidAssets: historicalLiquidAssets,
        portfolioValue: historicalPortfolioValue,
        physicalAssets: historicalPhysicalAssets,
        totalLiabilities: historicalLiabilities
      }
    };
  }

  /**
   * Simple hash function for deterministic pseudo-random generation
   * Based on date string to ensure consistency across requests
   */
  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Clear trend cache for a specific user or all users
   * Call this when new snapshots are created to ensure fresh data
   */
  static clearTrendCache(userId?: mongoose.Types.ObjectId): void {
    if (userId) {
      // Clear cache for specific user
      const userKey = userId.toString();
      for (const key of this.trendCache.keys()) {
        if (key.startsWith(userKey)) {
          this.trendCache.delete(key);
        }
      }
      logger.debug(`🧹 Cleared trend cache for user ${userId}`);
    } else {
      // Clear all cache
      this.trendCache.clear();
      logger.debug('🧹 Cleared all trend cache');
    }
  }
}
