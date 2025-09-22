import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';

const router = Router();

// Get all transactions for a user
router.get('/', TransactionController.getTransactions);

// Create new transaction
router.post('/', TransactionController.createTransaction);

// Get specific transaction
router.get('/:id', TransactionController.getTransaction);

// Update transaction
router.put('/:id', TransactionController.updateTransaction);

// Delete transaction
router.delete('/:id', TransactionController.deleteTransaction);

// Get transaction statistics
router.get('/stats/summary', TransactionController.getTransactionStats);

// Export transactions
router.get('/export', TransactionController.exportTransactions);

export default router;




