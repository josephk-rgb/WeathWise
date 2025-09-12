import express from 'express';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { NetWorthCalculator } from '../services/netWorthCalculator';
import { FinancialDataValidator } from '../utils/financialValidator';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route GET /api/net-worth/current
 * @desc Get current net worth breakdown
 * @access Private
 */
router.get('/current', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const netWorthData = await NetWorthCalculator.getCurrentNetWorth(userObjectId);

    res.json({
      success: true,
      data: netWorthData
    });
  } catch (error) {
    logger.error('Error getting current net worth:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to calculate net worth',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/net-worth/by-category
 * @desc Get net worth breakdown by category
 * @access Private
 */
router.get('/by-category', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const netWorthByCategory = await NetWorthCalculator.getNetWorthByCategory(userObjectId);

    res.json({
      success: true,
      data: netWorthByCategory
    });
  } catch (error) {
    logger.error('Error getting net worth by category:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to calculate net worth by category',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/net-worth/history
 * @desc Get net worth history over time
 * @access Private
 */
router.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { period = '30d' } = req.query;
    
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const historyData = await NetWorthCalculator.getNetWorthHistory(userObjectId, startDate, endDate);

    res.json({
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate },
        history: historyData
      }
    });
  } catch (error) {
    logger.error('Error getting net worth history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get net worth history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/net-worth/validate
 * @desc Validate financial data for net worth calculation
 * @access Private
 */
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { assets, liabilities } = req.body;

    if (typeof assets === 'undefined' || typeof liabilities === 'undefined') {
      res.status(400).json({ 
        success: false, 
        error: 'Assets and liabilities values are required' 
      });
      return;
    }

    // Validate the provided values
    FinancialDataValidator.validateNetWorthCalculation(assets, liabilities);

    const netWorth = assets - liabilities;

    res.json({
      success: true,
      data: {
        assets,
        liabilities,
        netWorth,
        isValid: true,
        validatedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error validating financial data:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      isValid: false
    });
  }
});

export default router;
