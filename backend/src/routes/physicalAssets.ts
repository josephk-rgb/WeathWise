import express from 'express';
import { PhysicalAssetController } from '../controllers/physicalAssetController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Physical Asset CRUD routes
router.get('/', PhysicalAssetController.getAssets);
router.get('/type/:type', PhysicalAssetController.getAssetsByType);
router.get('/summary', PhysicalAssetController.getAssetSummary);
router.post('/', PhysicalAssetController.createAsset);
router.put('/:id', PhysicalAssetController.updateAsset);
router.put('/:id/valuation', PhysicalAssetController.updateAssetValuation);
router.delete('/:id', PhysicalAssetController.deleteAsset);

export default router;
