import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';

const router = Router();

// Get analytics overview
router.get('/', AnalyticsController.getAnalytics);

// Get spending analysis
router.get('/spending', AnalyticsController.getSpendingAnalysis);

// Get investment performance
router.get('/investment-performance', AnalyticsController.getInvestmentPerformance);

// Get financial health score
router.get('/financial-health', AnalyticsController.getFinancialHealth);

// Get net worth trend data
router.get('/net-worth-trend', AnalyticsController.getNetWorthTrend);

// Get dashboard statistics with change calculations
router.get('/dashboard-stats', AnalyticsController.getDashboardStats);

// Enhanced dashboard stats with true net worth (Phase 2)
router.get('/enhanced-dashboard-stats', AnalyticsController.getEnhancedDashboardStats);

// Phase 4: Historical Tracking & Trends
router.get('/net-worth-trend-data', AnalyticsController.getNetWorthTrend);
router.post('/create-snapshot', AnalyticsController.createNetWorthSnapshot);
router.post('/update-portfolio-prices', AnalyticsController.updatePortfolioPrices);
router.get('/portfolio-price-history/:symbol', AnalyticsController.getPortfolioPriceHistory);

export default router;
