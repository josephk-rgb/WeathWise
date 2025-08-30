import { Router } from 'express';
import { BudgetController } from '../controllers/budgetController';

const router = Router();

// Get all budgets for a user
router.get('/', BudgetController.getBudgets);

// Create new budget
router.post('/', BudgetController.createBudget);

// Get specific budget
router.get('/:id', BudgetController.getBudget);

// Update budget
router.put('/:id', BudgetController.updateBudget);

// Delete budget
router.delete('/:id', BudgetController.deleteBudget);

// Update budget spending
router.patch('/:id/spending', BudgetController.updateBudgetSpending);

// Get budget summary
router.get('/summary', BudgetController.getBudgetSummary);

// Get budget performance
router.get('/performance', BudgetController.getBudgetPerformance);

export default router;
