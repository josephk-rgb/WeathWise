import { Router } from 'express';
import { PortfolioController } from '../controllers/portfolioController';

const router = Router();

// Get portfolio overview
router.get('/overview', PortfolioController.getPortfolioOverview);

// Get portfolio performance
router.get('/performance', PortfolioController.getPortfolioPerformance);

// Get portfolio metrics
router.get('/metrics', PortfolioController.getPortfolioMetrics);

// Get portfolio insights
router.get('/insights', PortfolioController.getPortfolioInsights);

// Get advanced portfolio analytics
router.get('/analytics', PortfolioController.getAdvancedAnalytics);

export default router;

