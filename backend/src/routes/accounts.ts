import express from 'express';
import { AccountController } from '../controllers/accountController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Account CRUD routes
router.get('/', AccountController.getAccounts);
router.get('/type/:type', AccountController.getAccountsByType);
router.post('/', AccountController.createAccount);
router.put('/:id', AccountController.updateAccount);
router.put('/:id/balance', AccountController.updateAccountBalance);
router.delete('/:id', AccountController.deleteAccount);
router.get('/:id/history', AccountController.getBalanceHistory);

export default router;
