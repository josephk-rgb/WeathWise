import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { DatabaseService } from '../services/DatabaseService';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const databaseService = new DatabaseService();

// Type guard to check if user is authenticated with required properties
function isAuthenticatedUser(user: any): user is { id: string; email: string; auth0Id: string } {
  return user && typeof user.id === 'string' && typeof user.email === 'string' && typeof user.auth0Id === 'string';
}

// Get current user profile
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const user = await databaseService.findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Debug: Log user role
    console.log('🔍 DEBUG - User role for', user.email, ':', user.role);
    console.log('🔍 DEBUG - Full user object keys:', Object.keys(user));

    // Return user profile without sensitive data
    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      preferences: user.preferences,
      riskProfile: user.riskProfile,
      subscription: user.subscription,
      metadata: {
        onboardingCompleted: user.metadata.onboardingCompleted,
        lastLogin: user.metadata.lastLogin,
        loginCount: user.metadata.loginCount
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('phone').optional().isMobilePhone('any'),
  body('dateOfBirth').optional().isISO8601(),
  body('address').optional().isObject(),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const updateData: any = {};
    
    if (req.body.firstName || req.body.lastName) {
      updateData.profile = {
        ...(req.body.firstName && { firstName: req.body.firstName }),
        ...(req.body.lastName && { lastName: req.body.lastName }),
        ...(req.body.phone && { phone: req.body.phone }),
        ...(req.body.dateOfBirth && { dateOfBirth: new Date(req.body.dateOfBirth) }),
        ...(req.body.address && { address: req.body.address })
      };
    }

    const updatedUser = await databaseService.updateUser(req.user.id, updateData);
    
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: 'Profile updated successfully',
      profile: updatedUser.profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user preferences
router.put('/preferences', authMiddleware, [
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD']),
  body('timezone').optional().isString(),
  body('notifications').optional().isObject(),
  body('privacy').optional().isObject(),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const updatedUser = await databaseService.updateUserPreferences(req.user.id, req.body);
    
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: 'Preferences updated successfully',
      preferences: updatedUser.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update risk profile
router.put('/risk-profile', authMiddleware, [
  body('level').isIn(['conservative', 'moderate', 'aggressive']),
  body('tolerance').optional().isInt({ min: 1, max: 10 }),
  body('timeHorizon').optional().isInt({ min: 1, max: 30 }),
  body('goals').optional().isArray(),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const updatedUser = await databaseService.updateUserRiskProfile(req.user.id, req.body);
    
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: 'Risk profile updated successfully',
      riskProfile: updatedUser.riskProfile
    });
  } catch (error) {
    console.error('Update risk profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete onboarding
router.post('/onboarding/complete', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    await databaseService.completeUserOnboarding(req.user.id);
    
    res.json({ message: 'Onboarding completed successfully' });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept terms of service
router.post('/legal/accept-tos', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    await databaseService.acceptTermsOfService(req.user.id);
    
    res.json({ message: 'Terms of service accepted' });
  } catch (error) {
    console.error('Accept TOS error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete onboarding
router.post('/complete-onboarding', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const updatedUser = await databaseService.updateUser(req.user.id, {
      metadata: {
        onboardingCompleted: true
      }
    } as any);
    
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: 'Onboarding completed successfully',
      onboardingCompleted: true
    });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept privacy policy
router.post('/legal/accept-privacy', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    await databaseService.acceptPrivacyPolicy(req.user.id);
    
    res.json({ message: 'Privacy policy accepted' });
  } catch (error) {
    console.error('Accept privacy policy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete profile and onboarding in one operation
router.put('/complete-profile', authMiddleware, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('phone').optional().isMobilePhone('any'),
  body('dateOfBirth').optional().isISO8601(),
  body('address').optional().isObject(),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const updateData: any = {
      'metadata.onboardingCompleted': true,
      'metadata.lastUpdated': new Date()
    };
    
    // Only update profile if data is provided
    if (req.body.firstName || req.body.lastName || req.body.phone || req.body.dateOfBirth || req.body.address) {
      updateData.profile = {
        ...(req.body.firstName && { firstName: req.body.firstName }),
        ...(req.body.lastName && { lastName: req.body.lastName }),
        ...(req.body.phone && { phone: req.body.phone }),
        ...(req.body.dateOfBirth && { dateOfBirth: new Date(req.body.dateOfBirth) }),
        ...(req.body.address && { address: req.body.address })
      };
    }

    const updatedUser = await databaseService.updateUser(req.user.id, updateData);
    
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: 'Profile completed successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        profile: updatedUser.profile,
        preferences: updatedUser.preferences,
        metadata: {
          onboardingCompleted: updatedUser.metadata.onboardingCompleted,
          lastLogin: updatedUser.metadata.lastLogin,
          loginCount: updatedUser.metadata.loginCount
        }
      }
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user account
router.delete('/account', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const deleted = await databaseService.deleteUser(req.user.id);
    
    if (!deleted) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

