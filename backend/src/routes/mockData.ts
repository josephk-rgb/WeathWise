import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminOnlyMiddleware } from '../middleware/adminOnly';
import { MockDataController, validateMockDataGeneration } from '../controllers/mockDataController';

const router = Router();
const mockDataController = new MockDataController();

// All mock data routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnlyMiddleware);

/**
 * POST /api/mock-data/generate
 * Generate mock data for admin user account
 * 
 * Body Parameters (all optional):
 * - monthsOfHistory: number (1-24, default: 12)
 * - numberOfAccounts: number (1-10, default: 4)
 * - accountTypes: string[] (default: ['checking', 'savings', 'credit', 'investment'])
 * - includeInvestments: boolean (default: true)
 * - includeBudgetsAndGoals: boolean (default: true)
 * - includeDebts: boolean (default: true)
 * - transactionsPerMonth: number (10-200, default: 75)
 * - clearExisting: boolean (default: true)
 */
router.post('/generate', validateMockDataGeneration, mockDataController.generateMockData);

/**
 * GET /api/mock-data/summary
 * Get current data summary for admin user
 */
router.get('/summary', mockDataController.getDataSummary);

/**
 * DELETE /api/mock-data/clear
 * Clear all mock data for admin user
 */
router.delete('/clear', mockDataController.clearMockData);

/**
 * GET /api/mock-data/config
 * Get default configuration options for mock data generation
 */
router.get('/config', mockDataController.getDefaultConfig);

export default router;
