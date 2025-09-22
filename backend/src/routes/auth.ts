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

  // Debug: Log user role, onboarding status, and full user object
  console.log('🔍 DEBUG - User role for', user.email, ':', user.role);
  console.log('🔍 DEBUG - Onboarding completed:', user.metadata.onboardingCompleted);
  console.log('🔍 DEBUG - Full user object:', JSON.stringify(user, null, 2));

  res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user with Auth0 data (POST version of /me)
router.post('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { auth0UserData } = req.body;
    console.log('🔧 [BACKEND] Received Auth0 user data:', auth0UserData);

    // Get existing user
    let user = await databaseService.findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Update user with Auth0 data if available and user data is incomplete
    if (auth0UserData && auth0UserData.email) {
      let shouldUpdate = false;
      const updates: any = {};

      // Update email if it's currently a temp email
      if (user.email.includes('@temp.wealthwise.com') && auth0UserData.email) {
        updates.email = auth0UserData.email.toLowerCase();
        shouldUpdate = true;
        console.log('🔧 [BACKEND] Updating email from temp to real:', auth0UserData.email);
      }

      // Update names if they're currently placeholders
      if (user.profile.firstName === 'FirstName' || user.profile.lastName === 'LastName') {
        if (auth0UserData.given_name && auth0UserData.given_name !== user.profile.firstName) {
          updates['profile.firstName'] = auth0UserData.given_name;
          shouldUpdate = true;
        }
        if (auth0UserData.family_name && auth0UserData.family_name !== user.profile.lastName) {
          updates['profile.lastName'] = auth0UserData.family_name;
          shouldUpdate = true;
        }
        // Fallback to parsing name if given_name/family_name not available
        if (auth0UserData.name && !auth0UserData.given_name) {
          const nameParts = auth0UserData.name.split(' ');
          if (nameParts.length > 0 && nameParts[0] !== user.profile.firstName) {
            updates['profile.firstName'] = nameParts[0];
            shouldUpdate = true;
          }
          if (nameParts.length > 1 && nameParts.slice(1).join(' ') !== user.profile.lastName) {
            updates['profile.lastName'] = nameParts.slice(1).join(' ');
            shouldUpdate = true;
          }
        }
      }

      // Apply updates if needed
      if (shouldUpdate) {
        console.log('🔧 [BACKEND] Applying updates:', updates);
        user = await databaseService.updateUser(user.id, updates);
        console.log('✅ User updated with Auth0 data');
      }
    }

    // Debug: Log user role and onboarding status
    console.log('🔍 DEBUG - User role for', user.email, ':', user.role);
    console.log('🔍 DEBUG - Onboarding completed:', user.metadata.onboardingCompleted);

    res.json(user);
  } catch (error) {
    console.error('Error updating user with Auth0 data:', error);
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
    console.log('🔧 [AUTH] Profile update request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [AUTH] Validation errors:', errors.array());
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
    console.log('🔧 [DEBUG] Complete onboarding endpoint called');
    console.log('🔧 [DEBUG] User:', req.user);

    if (!isAuthenticatedUser(req.user)) {
      console.log('🔧 [DEBUG] User not authenticated');
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get current user data to preserve existing metadata
    const currentUser = await databaseService.findUserById(req.user.id);
    if (!currentUser) {
      console.log('🔧 [DEBUG] User not found in database:', req.user.id);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('🔧 [DEBUG] Current user metadata before update:', currentUser.metadata);

    const updatedUser = await databaseService.updateUser(req.user.id, {
      metadata: {
        ...currentUser.metadata,
        onboardingCompleted: true
      }
    });
    
    if (!updatedUser) {
      console.log('🔧 [DEBUG] Failed to update user for onboarding completion');
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('🔧 [DEBUG] User onboarding completed successfully:', {
      id: updatedUser._id,
      onboardingCompleted: updatedUser.metadata.onboardingCompleted
    });

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
    console.log('🔧 [DEBUG] Complete profile endpoint called');
    console.log('🔧 [DEBUG] Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔧 [DEBUG] User:', req.user);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🔧 [DEBUG] Validation errors:', errors.array());
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!isAuthenticatedUser(req.user)) {
      console.log('🔧 [DEBUG] User not authenticated');
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get current user data first to preserve existing profile data
    const currentUser = await databaseService.findUserById(req.user.id);
    if (!currentUser) {
      console.log('🔧 [DEBUG] User not found in database:', req.user.id);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('🔧 [DEBUG] Current user found:', {
      id: currentUser._id,
      email: currentUser.email,
      profile: currentUser.profile,
      metadata: currentUser.metadata
    });

    const updateData: any = {
      metadata: {
        ...currentUser.metadata,
        onboardingCompleted: true,
        profileNeedsCompletion: false, // Clear the flag since we're completing profile
        lastUpdated: new Date()
      }
    };
    
    // Always update profile if firstName or lastName provided, or if profile needs completion
    const shouldUpdateProfile = req.body.firstName || req.body.lastName || 
                               req.body.phone || req.body.dateOfBirth || req.body.address ||
                               currentUser.metadata?.profileNeedsCompletion;
    
    if (shouldUpdateProfile) {
      updateData.profile = {
        ...currentUser.profile, // Preserve existing profile data
        // Ensure firstName and lastName are properly set
        firstName: req.body.firstName || currentUser.profile.firstName,
        lastName: req.body.lastName || currentUser.profile.lastName,
        ...(req.body.phone && { phone: req.body.phone }),
        ...(req.body.dateOfBirth && { dateOfBirth: new Date(req.body.dateOfBirth) }),
        ...(req.body.address && { address: req.body.address })
      };
      
      // If we still have placeholder names and no new names provided, this is an error
      if ((updateData.profile.firstName === 'FirstName' || updateData.profile.firstName === 'User') && !req.body.firstName) {
        console.log('🔧 [DEBUG] Profile completion missing firstName');
        res.status(400).json({ error: 'First name is required to complete profile' });
        return;
      }
      
      if ((updateData.profile.lastName === 'LastName' || updateData.profile.lastName === 'User') && !req.body.lastName) {
        console.log('🔧 [DEBUG] Profile completion missing lastName');
        res.status(400).json({ error: 'Last name is required to complete profile' });
        return;
      }
      
      console.log('🔧 [DEBUG] Profile data to update:', updateData.profile);
    }

    console.log('🔧 [DEBUG] Complete update data:', JSON.stringify(updateData, null, 2));

    const updatedUser = await databaseService.updateUser(req.user.id, updateData);
    
    if (!updatedUser) {
      console.log('🔧 [DEBUG] Failed to update user');
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('🔧 [DEBUG] User updated successfully:', {
      id: updatedUser._id,
      email: updatedUser.email,
      profile: updatedUser.profile,
      metadata: updatedUser.metadata
    });
    
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

