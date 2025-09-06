import { Router } from 'express';
import { DebtController } from '../controllers/debtController';

const router = Router();

// Get all debts for a user
router.get('/', DebtController.getDebts);

// Create new debt
router.post('/', DebtController.createDebt);

// Get specific debt
router.get('/:id', DebtController.getDebt);

// Update debt
router.put('/:id', DebtController.updateDebt);

// Delete debt
router.delete('/:id', DebtController.deleteDebt);

// Add payment to debt
router.post('/:id/payments', DebtController.addPayment);

export default router;
