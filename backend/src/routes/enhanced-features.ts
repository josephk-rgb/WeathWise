import { Router } from 'express';
import { EnhancedFeaturesController } from '../controllers/enhancedFeaturesController';

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
