import { Router } from 'express';
import { EnhancedFeaturesController } from '../controllers/enhancedFeaturesController';

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
