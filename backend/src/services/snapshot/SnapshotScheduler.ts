import cron from 'node-cron';
import { logger } from '../../utils/logger';
import DailySnapshotService from './DailySnapshotService';

/**
 * SnapshotScheduler - Automated Daily Snapshot Creation
 * 
 * This service schedules and manages the automatic creation of daily
 * net worth snapshots using cron jobs.
 */

export interface SchedulerConfiguration {
  enabled: boolean;
  schedule: string; // Cron expression
  timezone: string;
  maxRetries: number;
  retryDelay: number; // milliseconds
  batchSize: number;
  cleanupSchedule: string; // Cron expression for cleanup
}

export class SnapshotScheduler {
  private static defaultConfig: SchedulerConfiguration = {
    enabled: true,
    schedule: '59 23 * * *', // 11:59 PM daily
    timezone: 'America/New_York',
    maxRetries: 3,
    retryDelay: 30000, // 30 seconds
    batchSize: 50,
    cleanupSchedule: '0 2 * * 0' // 2:00 AM every Sunday
  };

  private static jobs: Map<string, cron.ScheduledTask> = new Map();
  private static isInitialized = false;

  /**
   * Initialize the snapshot scheduler
   */
  static initialize(): void {
    if (this.isInitialized) {
      logger.warn('⚠️ SnapshotScheduler already initialized');
      return;
    }

    try {
      logger.info('🚀 Initializing SnapshotScheduler');

      // Schedule daily snapshot creation
      this.scheduleDailySnapshots();
      
      // Schedule weekly cleanup (Sunday at 2 AM)
      this.scheduleCleanup();

      // Schedule health check (every 6 hours)
      this.scheduleHealthCheck();

      this.isInitialized = true;
      logger.info('✅ SnapshotScheduler initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize SnapshotScheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule daily snapshot creation
   */
  private static scheduleDailySnapshots(): void {
    const config = this.defaultConfig;
    
    if (!config.enabled) {
      logger.info('📅 Daily snapshots are disabled in configuration');
      return;
    }

    const job = cron.schedule(config.schedule, async () => {
      logger.info('⏰ Starting scheduled daily snapshot creation');
      
      try {
        const result = await DailySnapshotService.createDailySnapshotsForAllUsers();
        
        if (result.success) {
          logger.info(`✅ Scheduled snapshots completed: ${result.snapshotsCreated} snapshots created for ${result.usersProcessed} users`);
          
          if (result.errors.length > 0) {
            logger.warn(`⚠️ ${result.errors.length} errors occurred during scheduled snapshots`);
            result.errors.forEach(error => logger.warn(`  - ${error}`));
          }
        } else {
          logger.error('❌ Scheduled snapshots failed');
          result.errors.forEach(error => logger.error(`  - ${error}`));
        }
      } catch (error) {
        logger.error('❌ Scheduled snapshot job failed:', error);
      }
    }, {
      scheduled: false,
      timezone: config.timezone
    });

    this.jobs.set('daily_snapshots', job);
    job.start();
    
    logger.info(`📅 Scheduled daily snapshots: ${config.schedule} (${config.timezone})`);
  }

  /**
   * Schedule cleanup of old snapshots
   */
  private static scheduleCleanup(): void {
    const cleanupSchedule = '0 2 * * 0'; // Sunday at 2 AM
    
    const job = cron.schedule(cleanupSchedule, async () => {
      logger.info('🧹 Starting scheduled snapshot cleanup');
      
      try {
        const result = await DailySnapshotService.cleanupOldSnapshots();
        
        if (result.success) {
          logger.info(`✅ Cleanup completed: ${result.snapshotsDeleted} old snapshots deleted`);
        } else {
          logger.error('❌ Cleanup failed:', result.error);
        }
      } catch (error) {
        logger.error('❌ Scheduled cleanup job failed:', error);
      }
    }, {
      scheduled: false,
      timezone: this.defaultConfig.timezone
    });

    this.jobs.set('cleanup', job);
    job.start();
    
    logger.info(`🧹 Scheduled cleanup: ${cleanupSchedule} (${this.defaultConfig.timezone})`);
  }

  /**
   * Schedule health check and monitoring
   */
  private static scheduleHealthCheck(): void {
    const healthCheckSchedule = '0 */6 * * *'; // Every 6 hours
    
    const job = cron.schedule(healthCheckSchedule, async () => {
      logger.info('🏥 Starting snapshot health check');
      
      try {
        const stats = await DailySnapshotService.getSnapshotStatistics();
        
        logger.info('📊 Snapshot Statistics:', {
          totalSnapshots: stats.totalSnapshots,
          snapshotsToday: stats.snapshotsToday,
          snapshotsThisWeek: stats.snapshotsThisWeek,
          snapshotsThisMonth: stats.snapshotsThisMonth,
          averageSnapshotsPerUser: stats.averageSnapshotsPerUser,
          dataQuality: stats.dataQualityMetrics
        });

        // Check for issues
        if (stats.snapshotsToday === 0) {
          logger.warn('⚠️ No snapshots created today - this may indicate an issue');
        }

        if (stats.dataQualityMetrics.estimated > stats.dataQualityMetrics.complete) {
          logger.warn('⚠️ More estimated snapshots than complete ones - check market data service');
        }

      } catch (error) {
        logger.error('❌ Health check failed:', error);
      }
    }, {
      scheduled: false,
      timezone: this.defaultConfig.timezone
    });

    this.jobs.set('health_check', job);
    job.start();
    
    logger.info(`🏥 Scheduled health check: ${healthCheckSchedule} (${this.defaultConfig.timezone})`);
  }

  /**
   * Manually trigger snapshot creation (for testing or immediate needs)
   */
  static async triggerManualSnapshot(): Promise<{
    success: boolean;
    message: string;
    result?: any;
  }> {
    try {
      logger.info('🔄 Manual snapshot trigger requested');
      
      const result = await DailySnapshotService.createDailySnapshotsForAllUsers();
      
      if (result.success) {
        return {
          success: true,
          message: `Manual snapshots completed: ${result.snapshotsCreated} snapshots created for ${result.usersProcessed} users`,
          result
        };
      } else {
        return {
          success: false,
          message: `Manual snapshots failed: ${result.errors.join(', ')}`,
          result
        };
      }
    } catch (error) {
      logger.error('❌ Manual snapshot trigger failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get scheduler status and configuration
   */
  static getStatus(): {
    isInitialized: boolean;
    jobs: Array<{
      name: string;
      running: boolean;
      schedule: string;
      timezone: string;
    }>;
    configuration: SchedulerConfiguration;
  } {
    const jobs = Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      running: true, // Assume running if job exists in the map
      schedule: this.getJobSchedule(name),
      timezone: this.defaultConfig.timezone
    }));

    return {
      isInitialized: this.isInitialized,
      jobs,
      configuration: { ...this.defaultConfig }
    };
  }

  /**
   * Get schedule expression for a specific job
   */
  private static getJobSchedule(jobName: string): string {
    switch (jobName) {
      case 'daily_snapshots':
        return this.defaultConfig.schedule;
      case 'cleanup':
        return '0 2 * * 0'; // Sunday at 2 AM
      case 'health_check':
        return '0 */6 * * *'; // Every 6 hours
      default:
        return 'unknown';
    }
  }

  /**
   * Stop all scheduled jobs
   */
  static stopAllJobs(): void {
    logger.info('🛑 Stopping all snapshot scheduler jobs');
    
    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      logger.info(`  - Stopped job: ${name}`);
    }
    
    this.jobs.clear();
    this.isInitialized = false;
    
    logger.info('✅ All snapshot scheduler jobs stopped');
  }

  /**
   * Restart all scheduled jobs
   */
  static restartAllJobs(): void {
    logger.info('🔄 Restarting all snapshot scheduler jobs');
    
    this.stopAllJobs();
    this.initialize();
  }

  /**
   * Update scheduler configuration
   */
  static updateConfiguration(config: Partial<SchedulerConfiguration>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    
    logger.info('⚙️ Scheduler configuration updated:', config);
    
    // Restart jobs if configuration changed
    if (this.isInitialized) {
      this.restartAllJobs();
    }
  }

  /**
   * Get next scheduled run times for all jobs
   */
  static getNextRunTimes(): Array<{
    jobName: string;
    nextRun: Date | null;
  }> {
    const nextRuns = [];
    
    for (const [name, job] of this.jobs.entries()) {
      try {
        // Note: node-cron doesn't provide next run time directly
        // This would require additional logic to calculate next run times
        nextRuns.push({
          jobName: name,
          nextRun: null // Would need to implement calculation
        });
      } catch (error) {
        logger.warn(`⚠️ Could not get next run time for job ${name}:`, error);
        nextRuns.push({
          jobName: name,
          nextRun: null
        });
      }
    }
    
    return nextRuns;
  }

  /**
   * Graceful shutdown
   */
  static async shutdown(): Promise<void> {
    logger.info('🔌 Shutting down SnapshotScheduler');
    
    try {
      this.stopAllJobs();
      logger.info('✅ SnapshotScheduler shutdown completed');
    } catch (error) {
      logger.error('❌ Error during SnapshotScheduler shutdown:', error);
      throw error;
    }
  }
}

export default SnapshotScheduler;
