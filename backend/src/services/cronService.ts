import cron from 'node-cron';
import { DailyPriceService } from './dailyPriceService';
import { logger } from '../utils/logger';

export class CronService {
  private dailyPriceService: DailyPriceService;
  private isRunning: boolean = false;

  constructor() {
    this.dailyPriceService = new DailyPriceService();
  }

  /**
   * Start all cron jobs
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Cron service is already running');
      return;
    }

    logger.info('Starting cron service...');

    // Daily price update at 4:30 PM EST (after market close)
    // This runs Monday through Friday
    cron.schedule('30 16 * * 1-5', async () => {
      logger.info('Starting scheduled daily price update...');
      try {
        await this.dailyPriceService.updateDailyPrices();
        logger.info('Scheduled daily price update completed successfully');
      } catch (error) {
        logger.error('Scheduled daily price update failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "America/New_York"
    });

    // Weekly cleanup of old price data (Sundays at 2 AM)
    cron.schedule('0 2 * * 0', async () => {
      logger.info('Starting scheduled cleanup of old price data...');
      try {
        await this.dailyPriceService.cleanOldPrices();
        logger.info('Scheduled cleanup completed successfully');
      } catch (error) {
        logger.error('Scheduled cleanup failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "America/New_York"
    });

    // Health check every hour
    cron.schedule('0 * * * *', () => {
      logger.debug('Cron service health check - all jobs running normally');
    });

    this.isRunning = true;
    logger.info('Cron service started successfully');
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Cron service is not running');
      return;
    }

    cron.getTasks().forEach(task => {
      task.stop();
    });

    this.isRunning = false;
    logger.info('Cron service stopped');
  }

  /**
   * Get status of cron service
   */
  getStatus(): { isRunning: boolean; activeJobs: number } {
    const activeJobs = cron.getTasks().size;
    return {
      isRunning: this.isRunning,
      activeJobs
    };
  }

  /**
   * Manually trigger daily price update (for testing or manual runs)
   */
  async triggerDailyPriceUpdate(): Promise<void> {
    logger.info('Manually triggering daily price update...');
    try {
      await this.dailyPriceService.updateDailyPrices();
      logger.info('Manual daily price update completed successfully');
    } catch (error) {
      logger.error('Manual daily price update failed:', error);
      throw error;
    }
  }

  /**
   * Manually trigger historical data population (for initial setup)
   */
  async triggerHistoricalDataPopulation(days: number = 365): Promise<void> {
    logger.info(`Manually triggering historical data population for last ${days} days...`);
    try {
      await this.dailyPriceService.populateHistoricalData(days);
      logger.info('Manual historical data population completed successfully');
    } catch (error) {
      logger.error('Manual historical data population failed:', error);
      throw error;
    }
  }
}
