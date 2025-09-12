import { Router } from 'express';
import { PortfolioController } from '../controllers/portfolioController';

const router = Router();

// Get portfolio overview
router.get('/overview', PortfolioController.getPortfolioOverview);

// Get portfolio performance
router.get('/performance', PortfolioController.getPortfolioPerformance);

// Handle OPTIONS preflight requests for portfolio performance
router.options('/performance', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Get portfolio metrics
router.get('/metrics', PortfolioController.getPortfolioMetrics);

// Get portfolio insights
router.get('/insights', PortfolioController.getPortfolioInsights);

// Get advanced portfolio analytics
router.get('/analytics', PortfolioController.getAdvancedAnalytics);

export default router;




