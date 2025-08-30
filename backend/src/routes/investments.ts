import { Router } from 'express';
import { InvestmentController } from '../controllers/investmentController';

const router = Router();

// Get all investments
router.get('/', InvestmentController.getInvestments);

// Get single investment
router.get('/:id', InvestmentController.getInvestment);

// Add new investment
router.post('/', InvestmentController.createInvestment);

// Update investment
router.put('/:id', InvestmentController.updateInvestment);

// Delete investment
router.delete('/:id', InvestmentController.deleteInvestment);

// Get portfolio summary
router.get('/portfolio/summary', InvestmentController.getPortfolioSummary);

export default router;

