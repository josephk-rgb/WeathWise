import mongoose from 'mongoose';
import { NetWorthMilestone, Account, Investment } from '../../models';
import { NetWorthCalculator } from '../netWorthCalculator';
import { logger } from '../../utils/logger';
import { MarketDataService } from '../marketDataService';

/**
 * DailySnapshotService - End-of-Day Net Worth Snapshots
 * 
 * This service creates daily snapshots of net worth and financial data
 * at the end of each day (11:59 PM) to provide clean, consistent data
 * for trend analysis and charts.
 */

export interface DailySnapshotData {
  userId: mongoose.Types.ObjectId;
  date: Date;
  netWorth: number;
  breakdown: {
    liquidAssets: number;
    portfolioValue: number;
    physicalAssets: number;
    totalLiabilities: number;
  };
  accountSnapshots: Map<string, {
    accountId: string;
    accountName: string;
    accountType: string;
    balance: number;
    changeFromPrevious: number;
  }>;
  investmentSnapshots: Map<string, {
    symbol: string;
    shares: number;
    currentPrice: number;
    totalValue: number;
    dayChange: number;
    dayChangePercent: number;
  }>;
  metadata: {
    snapshotType: 'daily_end_of_day';
    dataQuality: 'complete' | 'partial' | 'estimated';
    priceSource: 'market_close' | 'last_known' | 'estimated';
    processingTime: number;
    recordsProcessed: number;
  };
}

export interface SnapshotConfiguration {
  schedule: {
    enabled: boolean;
    time: string; // "23:59:00"
    timezone: string; // "America/New_York"
  };
  eventBasedSnapshots: {
    enabled: boolean;
    minimumChangeThreshold: number; // $10,000
    cooldownPeriod: number; // 24 hours in milliseconds
  };
  dataRetention: {
    keepSnapshotsForDays: number; // 365
    archiveOldSnapshots: boolean;
  };
}

export class DailySnapshotService {
  private static marketDataService = new MarketDataService();
  private static defaultConfig: SnapshotConfiguration = {
    schedule: {
      enabled: true,
      time: "23:59:00",
      timezone: "America/New_York"
    },
    eventBasedSnapshots: {
      enabled: false, // Disabled by default
      minimumChangeThreshold: 10000,
      cooldownPeriod: 24 * 60 * 60 * 1000 // 24 hours
    },
    dataRetention: {
      keepSnapshotsForDays: 365,
      archiveOldSnapshots: true
    }
  };

  /**
   * Create daily snapshots for all active users
   */
  static async createDailySnapshotsForAllUsers(): Promise<{
    success: boolean;
    usersProcessed: number;
    snapshotsCreated: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    let usersProcessed = 0;
    let snapshotsCreated = 0;
    const errors: string[] = [];

    try {
      logger.info('🔄 Starting daily snapshot creation for all users');

      // Get all active users
      const { User } = await import('../../models');
      const activeUsers = await User.find({ 
        'metadata.onboardingCompleted': true,
        'subscription.plan': { $in: ['free', 'premium', 'enterprise'] }
      }).limit(100); // Limit for performance

      logger.info(`📊 Found ${activeUsers.length} active users to process`);

      // Process users in batches to avoid memory issues
      const batchSize = 10;
      for (let i = 0; i < activeUsers.length; i += batchSize) {
        const batch = activeUsers.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (user) => {
          try {
            const userId = user._id as mongoose.Types.ObjectId;
            const snapshotResult = await this.createDailySnapshotForUser(userId);
            
            if (snapshotResult.success) {
              snapshotsCreated++;
            } else {
              errors.push(`User ${userId}: ${snapshotResult.error}`);
            }
            
            usersProcessed++;
          } catch (error) {
            const errorMsg = `User ${user._id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            logger.error('❌ Error processing user:', errorMsg);
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < activeUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const processingTime = Date.now() - startTime;
      logger.info(`✅ Daily snapshots completed in ${processingTime}ms`);
      logger.info(`📊 Processed ${usersProcessed} users, created ${snapshotsCreated} snapshots`);

      if (errors.length > 0) {
        logger.warn(`⚠️ ${errors.length} errors occurred during snapshot creation`);
      }

      return {
        success: true,
        usersProcessed,
        snapshotsCreated,
        errors
      };
    } catch (error) {
      logger.error('❌ Failed to create daily snapshots:', error);
      return {
        success: false,
        usersProcessed,
        snapshotsCreated,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Create daily snapshot for a specific user
   */
  static async createDailySnapshotForUser(userId: mongoose.Types.ObjectId): Promise<{
    success: boolean;
    snapshotId?: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Check if snapshot already exists for today
      const today = this.getEndOfDayTimestamp();
      const existingSnapshot = await NetWorthMilestone.findOne({
        userId,
        date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
        trigger: 'daily_snapshot'
      });

      if (existingSnapshot) {
        logger.debug(`📸 Snapshot already exists for user ${userId} on ${today.toISOString().split('T')[0]}`);
        return {
          success: true,
          snapshotId: existingSnapshot._id.toString()
        };
      }

      // Calculate current net worth
      const netWorthData = await NetWorthCalculator.getCurrentNetWorth(userId);
      
      // Get account balances
      const accountSnapshots = await this.getAccountSnapshots(userId);
      
      // Get investment values
      const investmentSnapshots = await this.getInvestmentSnapshots(userId);

      // Create snapshot data
      const snapshotData: DailySnapshotData = {
        userId,
        date: today,
        netWorth: netWorthData.netWorth,
        breakdown: netWorthData.breakdown,
        accountSnapshots,
        investmentSnapshots,
        metadata: {
          snapshotType: 'daily_end_of_day',
          dataQuality: 'complete',
          priceSource: 'market_close',
          processingTime: Date.now() - startTime,
          recordsProcessed: accountSnapshots.size + investmentSnapshots.size
        }
      };

      // Save snapshot to database
      const snapshot = await NetWorthMilestone.create({
        userId,
        date: today,
        trigger: 'daily_snapshot',
        netWorth: snapshotData.netWorth,
        breakdown: snapshotData.breakdown,
        metadata: {
          triggerDetails: 'Daily end-of-day snapshot',
          priceSnapshot: Array.from(investmentSnapshots.values()).map(inv => ({
            symbol: inv.symbol,
            price: inv.currentPrice
          })),
          snapshotData: {
            accountCount: accountSnapshots.size,
            investmentCount: investmentSnapshots.size,
            processingTime: snapshotData.metadata.processingTime,
            dataQuality: snapshotData.metadata.dataQuality
          }
        }
      });

      logger.debug(`📸 Created daily snapshot for user ${userId}: $${snapshotData.netWorth.toLocaleString()}`);

      return {
        success: true,
        snapshotId: snapshot._id.toString()
      };
    } catch (error) {
      logger.error(`❌ Failed to create daily snapshot for user ${userId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get account balance snapshots for a user
   */
  private static async getAccountSnapshots(userId: mongoose.Types.ObjectId): Promise<Map<string, any>> {
    try {
      const accounts = await Account.find({ userId, isActive: true });
      const snapshots = new Map();

      for (const account of accounts) {
        snapshots.set(account._id.toString(), {
          accountId: account._id.toString(),
          accountName: account.accountInfo.name,
          accountType: account.type,
          balance: account.accountInfo.balance,
          changeFromPrevious: 0 // Will be calculated when comparing with previous snapshot
        });
      }

      return snapshots;
    } catch (error) {
      logger.error('❌ Failed to get account snapshots:', error);
      return new Map();
    }
  }

  /**
   * Get investment value snapshots for a user
   */
  private static async getInvestmentSnapshots(userId: mongoose.Types.ObjectId): Promise<Map<string, any>> {
    try {
      const investments = await Investment.find({ userId, isActive: true });
      const snapshots = new Map();

      for (const investment of investments) {
        const symbol = investment.securityInfo.symbol;
        
        // Try to get current market price
        let currentPrice = investment.position.currentPrice;
        let dayChange = 0;
        let dayChangePercent = 0;

        try {
          if (symbol) {
            const quote = await this.marketDataService.getQuote(symbol);
            if (quote && quote.currentPrice) {
              currentPrice = quote.currentPrice;
              dayChange = quote.change || 0;
              dayChangePercent = quote.changePercent || 0;
            }
          }
        } catch (error) {
          logger.warn(`⚠️ Failed to get current price for ${symbol}, using stored price`);
        }

        snapshots.set(symbol, {
          symbol,
          shares: investment.position.shares,
          currentPrice,
          totalValue: investment.position.shares * currentPrice,
          dayChange,
          dayChangePercent
        });
      }

      return snapshots;
    } catch (error) {
      logger.error('❌ Failed to get investment snapshots:', error);
      return new Map();
    }
  }

  /**
   * Get end-of-day timestamp (11:59 PM)
   */
  private static getEndOfDayTimestamp(): Date {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0, 0);
    return endOfDay;
  }

  /**
   * Check if event-based snapshot should be created
   */
  static async shouldCreateEventSnapshot(
    userId: mongoose.Types.ObjectId, 
    trigger: string, 
    changeAmount?: number
  ): Promise<boolean> {
    const config = this.defaultConfig;

    // Event-based snapshots are disabled by default
    if (!config.eventBasedSnapshots.enabled) {
      return false;
    }

    // Only create for specific triggers
    const allowedTriggers = ['manual_update', 'monthly_snapshot'];
    if (!allowedTriggers.includes(trigger)) {
      return false;
    }

    // Check minimum change threshold
    if (changeAmount && Math.abs(changeAmount) < config.eventBasedSnapshots.minimumChangeThreshold) {
      return false;
    }

    // Check cooldown period
    const lastSnapshot = await NetWorthMilestone.findOne({
      userId,
      trigger: { $in: ['daily_snapshot', 'manual_update', 'monthly_snapshot'] }
    }).sort({ date: -1 });

    if (lastSnapshot) {
      const timeSinceLastSnapshot = Date.now() - lastSnapshot.date.getTime();
      if (timeSinceLastSnapshot < config.eventBasedSnapshots.cooldownPeriod) {
        logger.debug(`⏰ Skipping event snapshot for user ${userId} - within cooldown period`);
        return false;
      }
    }

    return true;
  }

  /**
   * Clean up old snapshots based on retention policy
   */
  static async cleanupOldSnapshots(): Promise<{
    success: boolean;
    snapshotsDeleted: number;
    error?: string;
  }> {
    try {
      const config = this.defaultConfig;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.dataRetention.keepSnapshotsForDays);

      logger.info(`🧹 Cleaning up snapshots older than ${config.dataRetention.keepSnapshotsForDays} days`);

      const result = await NetWorthMilestone.deleteMany({
        date: { $lt: cutoffDate },
        trigger: 'daily_snapshot'
      });

      logger.info(`✅ Deleted ${result.deletedCount} old snapshots`);

      return {
        success: true,
        snapshotsDeleted: result.deletedCount
      };
    } catch (error) {
      logger.error('❌ Failed to cleanup old snapshots:', error);
      return {
        success: false,
        snapshotsDeleted: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get snapshot statistics for monitoring
   */
  static async getSnapshotStatistics(): Promise<{
    totalSnapshots: number;
    snapshotsToday: number;
    snapshotsThisWeek: number;
    snapshotsThisMonth: number;
    averageSnapshotsPerUser: number;
    dataQualityMetrics: {
      complete: number;
      partial: number;
      estimated: number;
    };
  }> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalSnapshots,
        snapshotsToday,
        snapshotsThisWeek,
        snapshotsThisMonth,
        usersWithSnapshots
      ] = await Promise.all([
        NetWorthMilestone.countDocuments({ trigger: 'daily_snapshot' }),
        NetWorthMilestone.countDocuments({
          trigger: 'daily_snapshot',
          date: { $gte: today }
        }),
        NetWorthMilestone.countDocuments({
          trigger: 'daily_snapshot',
          date: { $gte: weekAgo }
        }),
        NetWorthMilestone.countDocuments({
          trigger: 'daily_snapshot',
          date: { $gte: monthAgo }
        }),
        NetWorthMilestone.distinct('userId', { trigger: 'daily_snapshot' })
      ]);

      // Get data quality metrics
      const qualityMetrics = await NetWorthMilestone.aggregate([
        { $match: { trigger: 'daily_snapshot' } },
        {
          $group: {
            _id: '$metadata.snapshotData.dataQuality',
            count: { $sum: 1 }
          }
        }
      ]);

      const dataQualityMetrics = {
        complete: qualityMetrics.find(m => m._id === 'complete')?.count || 0,
        partial: qualityMetrics.find(m => m._id === 'partial')?.count || 0,
        estimated: qualityMetrics.find(m => m._id === 'estimated')?.count || 0
      };

      return {
        totalSnapshots,
        snapshotsToday,
        snapshotsThisWeek,
        snapshotsThisMonth,
        averageSnapshotsPerUser: usersWithSnapshots.length > 0 ? totalSnapshots / usersWithSnapshots.length : 0,
        dataQualityMetrics
      };
    } catch (error) {
      logger.error('❌ Failed to get snapshot statistics:', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  static updateConfiguration(config: Partial<SnapshotConfiguration>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    logger.info('⚙️ Snapshot configuration updated:', config);
  }

  /**
   * Get current configuration
   */
  static getConfiguration(): SnapshotConfiguration {
    return { ...this.defaultConfig };
  }
}

export default DailySnapshotService;
