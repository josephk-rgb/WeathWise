import { Router } from 'express';
import { UserController } from '../controllers/userController';

const router = Router();

// Get user profile
router.get('/profile', UserController.getProfile);

// Update user profile
router.put('/profile', UserController.updateProfile);

// Create user (for Auth0 integration)
router.post('/', UserController.createUser);

export default router;

