import { Router } from 'express';
import { DailyPriceService } from '../services/dailyPriceService';
import { CronService } from '../services/cronService';
import { DailyPrice } from '../models';
import { logger } from '../utils/logger';

const router = Router();

// Initialize services
const dailyPriceService = new DailyPriceService();
const cronService = new CronService();

/**
 * Manually trigger daily price update
 * POST /api/admin/update-prices
 */
router.post('/update-prices', async (req, res) => {
  try {
    logger.info('Manual daily price update triggered via admin endpoint');
    await dailyPriceService.updateDailyPrices();
    
    res.json({
      success: true,
      message: 'Daily price update completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Manual daily price update failed:', error);
    res.status(500).json({
      success: false,
      message: 'Daily price update failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Manually trigger historical data population
 * POST /api/admin/populate-historical
 */
router.post('/populate-historical', async (req, res) => {
  try {
    const { days = 365 } = req.body;
    
    logger.info(`Manual historical data population triggered for ${days} days`);
    await dailyPriceService.populateHistoricalData(days);
    
    res.json({
      success: true,
      message: `Historical data population completed for last ${days} days`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Manual historical data population failed:', error);
    res.status(500).json({
      success: false,
      message: 'Historical data population failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get cron service status
 * GET /api/admin/cron-status
 */
router.get('/cron-status', (req, res) => {
  try {
    const status = cronService.getStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting cron status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cron status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get daily price statistics
 * GET /api/admin/price-stats
 */
router.get('/price-stats', async (req, res) => {
  try {
    const totalRecords = await DailyPrice.countDocuments();
    const uniqueSymbols = await DailyPrice.distinct('symbol');
    const latestDate = await DailyPrice.findOne().sort({ date: -1 }).select('date');
    const oldestDate = await DailyPrice.findOne().sort({ date: 1 }).select('date');
    
    res.json({
      success: true,
      data: {
        totalRecords,
        uniqueSymbols: uniqueSymbols.length,
        symbols: uniqueSymbols,
        dateRange: {
          oldest: oldestDate?.date,
          latest: latestDate?.date
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting price stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get price statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clean up old price data
 * POST /api/admin/cleanup-prices
 */
router.post('/cleanup-prices', async (req, res) => {
  try {
    const { daysToKeep = 730 } = req.body;
    
    logger.info(`Manual cleanup triggered, keeping last ${daysToKeep} days`);
    await dailyPriceService.cleanOldPrices(daysToKeep);
    
    res.json({
      success: true,
      message: `Cleanup completed, kept last ${daysToKeep} days of data`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Manual cleanup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
