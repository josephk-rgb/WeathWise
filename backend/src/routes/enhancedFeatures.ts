import { Router, Request, Response } from 'express';
import { EnhancedFeaturesController } from '../controllers/enhancedFeaturesController';
import { authMiddleware } from '../middleware/auth';
import { PortfolioPriceCache } from '../services/portfolioPriceCache';

const router = Router();

// Phase 5: Enhanced Portfolio Features
router.get('/stocks/search', EnhancedFeaturesController.searchStocks);
router.get('/stocks/validate/:symbol', EnhancedFeaturesController.validateStock);
router.post('/portfolio/update-prices', EnhancedFeaturesController.updateAllPortfolioPrices);
router.get('/portfolio/performance', EnhancedFeaturesController.getPortfolioPerformance);
router.get('/portfolio/top-movers', EnhancedFeaturesController.getTopMovers);

// Phase 5: Asset Valuation Features
router.put('/assets/:assetId/value', EnhancedFeaturesController.updateAssetValue);
router.get('/assets/:assetId/valuation-history', EnhancedFeaturesController.getAssetValuationHistory);
router.post('/assets/update-depreciation', EnhancedFeaturesController.updateAllAssetDepreciation);
router.get('/assets/revaluation-suggestions', EnhancedFeaturesController.getAssetRevaluationSuggestions);

// Phase 5: Performance & Optimization
router.get('/performance/stats', EnhancedFeaturesController.getPerformanceStats);
router.post('/performance/clear-cache', EnhancedFeaturesController.clearCache);

export default router;

// Market history from DB cache
router.get('/market/history', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const symbol = String(req.query.symbol || '').toUpperCase();
    const daysParam = req.query.days ? Number(req.query.days) : undefined;
    const start = req.query.start ? new Date(String(req.query.start)) : undefined;
    const end = req.query.end ? new Date(String(req.query.end)) : new Date();

    if (!symbol) {
      res.status(400).json({ error: 'symbol required' });
      return;
    }

    let records;
    if (typeof daysParam === 'number' && !isNaN(daysParam) && daysParam > 0) {
      records = await PortfolioPriceCache.getAvailablePriceHistory(symbol, daysParam);
    } else if (start) {
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
      records = await PortfolioPriceCache.getAvailablePriceHistory(symbol, days);
    } else {
      records = await PortfolioPriceCache.getAvailablePriceHistory(symbol, 365);
    }

    const data = (records || []).map(r => ({
      date: r.date,
      close: r.price,
      volume: r.volume || 0,
      source: r.source
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Market history error:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch market history' });
  }
});
