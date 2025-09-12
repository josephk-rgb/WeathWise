import { Router, Request, Response } from 'express';
import { PortfolioHistoryService } from '../services/portfolioHistoryService';
import { Investment } from '../models';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Debug endpoint to test portfolio history calculations
 * GET /api/debug/portfolio-history?days=15
 */
router.get('/portfolio-history', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 15;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    logger.info(`=== DEBUG PORTFOLIO HISTORY REQUEST ===`);
    logger.info(`User: ${userId}, Days: ${days}`);

    // Get all active investments for the user
    const investments = await Investment.find({ 
      userId, 
      isActive: true 
    });

    if (investments.length === 0) {
      return res.json({
        success: true,
        message: 'No investments found',
        data: {
          investments: [],
          portfolioHistory: [],
          currentValue: 0
        }
      });
    }

    logger.info(`Found ${investments.length} investments:`);
    investments.forEach((inv, index) => {
      logger.info(`  ${index + 1}. ${inv.securityInfo.symbol}: ${inv.position.shares} shares @ $${inv.position.currentPrice} (purchased: ${inv.acquisition.purchaseDate})`);
    });

    // Calculate current portfolio value
    const currentValue = investments.reduce((sum, inv) => {
      return sum + (inv.position.shares * inv.position.currentPrice);
    }, 0);

    logger.info(`Current portfolio value: $${currentValue.toFixed(2)}`);

    // Set up date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    logger.info(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Calculate portfolio history
    const portfolioHistoryService = new PortfolioHistoryService();
    const result = await portfolioHistoryService.calculatePortfolioHistory(
      investments,
      startDate,
      endDate
    );

    // Format response
    const response = {
      success: true,
      data: {
        investments: investments.map(inv => ({
          symbol: inv.securityInfo.symbol,
          shares: inv.position.shares,
          currentPrice: inv.position.currentPrice,
          purchaseDate: inv.acquisition.purchaseDate,
          currentValue: inv.position.shares * inv.position.currentPrice
        })),
        portfolioHistory: result.snapshots.map(snapshot => ({
          date: snapshot.date,
          value: snapshot.value,
          investmentsCount: snapshot.investmentsCount,
          dataQuality: snapshot.dataQuality
        })),
        dataQuality: result.dataQuality,
        currentValue: result.currentValue,
        validation: {
          historicalValue: result.snapshots[result.snapshots.length - 1]?.value || 0,
          currentValue: result.currentValue,
          difference: Math.abs((result.snapshots[result.snapshots.length - 1]?.value || 0) - result.currentValue),
          percentDifference: result.currentValue > 0 ? 
            (Math.abs((result.snapshots[result.snapshots.length - 1]?.value || 0) - result.currentValue) / result.currentValue) * 100 : 0
        }
      }
    };

    logger.info(`=== DEBUG PORTFOLIO HISTORY RESPONSE ===`);
    logger.info(`Generated ${result.snapshots.length} snapshots`);
    logger.info(`Data quality: ${result.dataQuality.overallCoverage.toFixed(1)}% coverage`);
    logger.info(`Validation: ${response.data.validation.percentDifference.toFixed(2)}% difference`);

    res.json(response);

  } catch (error) {
    logger.error('Error in debug portfolio history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
