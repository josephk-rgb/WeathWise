import { Router, Request, Response } from 'express';
import { EnhancedFeaturesController } from '../controllers/enhancedFeaturesController';
import { PortfolioPriceCache } from '../services/portfolioPriceCache';
import DailyPrice from '../models/DailyPrice';

const router = Router();

// Stock search and validation
router.get('/stocks/search', EnhancedFeaturesController.searchStocks);
router.get('/stocks/validate/:symbol', EnhancedFeaturesController.validateStock);

// Portfolio management
router.post('/portfolio/update-prices', EnhancedFeaturesController.updateAllPortfolioPrices);
router.get('/portfolio/performance', EnhancedFeaturesController.getPortfolioPerformance);
router.get('/portfolio/top-movers', EnhancedFeaturesController.getTopMovers);

// Asset valuation
router.put('/assets/:assetId/value', EnhancedFeaturesController.updateAssetValue);
router.get('/assets/:assetId/valuation-history', EnhancedFeaturesController.getAssetValuationHistory);
router.post('/assets/update-depreciation', EnhancedFeaturesController.updateAllAssetDepreciation);
router.get('/assets/revaluation-suggestions', EnhancedFeaturesController.getAssetRevaluationSuggestions);

// Performance and optimization
router.get('/performance/stats', EnhancedFeaturesController.getPerformanceStats);
router.post('/cache/clear', EnhancedFeaturesController.clearCache);

export default router;

// DB-backed market history for symbols
router.get('/market/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const symbol = String(req.query.symbol || '').toUpperCase();
    const daysParam = req.query.days ? Number(req.query.days) : undefined;
    const start = req.query.start ? new Date(String(req.query.start)) : undefined;
    const end = req.query.end ? new Date(String(req.query.end)) : new Date();

    if (!symbol) {
      res.status(400).json({ error: 'symbol required' });
      return;
    }

    // Prefer rich OHLC data if existing in daily_prices collection
    const query: any = { symbol };
    if (start) {
      query.date = { $gte: start, $lte: end };
    } else if (typeof daysParam === 'number' && daysParam > 0) {
      const from = new Date();
      from.setDate(from.getDate() - daysParam);
      query.date = { $gte: from };
    } else {
      const from = new Date();
      from.setDate(from.getDate() - 365);
      query.date = { $gte: from };
    }

    const ohlc = await DailyPrice.find(query).sort({ date: 1 }).lean();

    let data;
    if (ohlc && ohlc.length > 0) {
      data = ohlc.map((r: any) => ({
        date: r.date,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close ?? r.adjustedClose,
        adjustedClose: r.adjustedClose,
        volume: r.volume || 0,
        source: r.source || 'yahoo_finance'
      }));
    } else {
      // Fallback to simple price cache
      let records;
      if (typeof daysParam === 'number' && !isNaN(daysParam) && daysParam > 0) {
        records = await PortfolioPriceCache.getAvailablePriceHistory(symbol, daysParam);
      } else if (start) {
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
        records = await PortfolioPriceCache.getAvailablePriceHistory(symbol, days);
      } else {
        records = await PortfolioPriceCache.getAvailablePriceHistory(symbol, 365);
      }
      data = (records || []).map(r => ({
        date: r.date,
        close: r.price,
        volume: r.volume || 0,
        source: r.source
      }));
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Market history error:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch market history' });
  }
});
