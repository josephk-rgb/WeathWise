import { Router } from 'express';
import { Investment } from '../models';
import { logger } from '../utils/logger';
import { Request, Response } from 'express';

const router = Router();

// Test endpoint to create sample investment data
router.post('/create-sample', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    logger.info('Creating sample investment for user:', userId);

    // Create a sample investment
    const sampleInvestment = new Investment({
      userId: userId,
      securityInfo: {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        exchange: 'NASDAQ',
        currency: 'USD'
      },
      position: {
        shares: 10,
        averageCost: 150.00,
        totalCost: 1500.00,
        currentPrice: 175.00,
        marketValue: 1750.00,
        gainLoss: 250.00,
        gainLossPercent: 16.67,
        dayChange: 2.50,
        dayChangePercent: 1.45
      },
      acquisition: {
        purchaseDate: new Date('2024-01-15'),
        purchaseMethod: 'buy',
        purchasePrice: 150.00,
        fees: 0.99,
        brokerage: 'E*TRADE'
      },
      analytics: {
        sector: 'Technology',
        industry: 'Consumer Electronics',
        marketCap: 2800000000000
      },
      isActive: true
    });

    const savedInvestment = await sampleInvestment.save();
    logger.info('Sample investment created:', savedInvestment._id);

    res.json({
      success: true,
      message: 'Sample investment created',
      data: savedInvestment
    });
  } catch (error) {
    logger.error('Error creating sample investment:', error);
    res.status(500).json({ 
      error: 'Failed to create sample investment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint to check database connection
router.get('/db-test', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    logger.info('Database test for user:', userId);

    // Count investments
    const investmentCount = await Investment.countDocuments({ userId, isActive: true });
    
    // Get sample investment
    const sampleInvestment = await Investment.findOne({ userId, isActive: true });

    res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        userId,
        investmentCount,
        hasSampleData: !!sampleInvestment,
        dbConnected: true
      }
    });
  } catch (error) {
    logger.error('Database test error:', error);
    res.status(500).json({ 
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint to clear all investments for a user
router.delete('/clear-investments', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    logger.info('Clearing investments for user:', userId);
    const result = await Investment.deleteMany({ userId });
    
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} investments`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error('Error clearing investments:', error);
    res.status(500).json({ 
      error: 'Failed to clear investments',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
