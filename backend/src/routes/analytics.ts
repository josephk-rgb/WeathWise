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

export default router;
