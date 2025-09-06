import { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { logger } from '../utils/logger';

const dbService = new DatabaseService();

export class UserController {
  // Get user profile
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await dbService.findUserById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Remove sensitive data
      const safeUser = {
        id: user._id,
        email: user.email,
        profile: user.profile,
        preferences: user.preferences,
        riskProfile: user.riskProfile,
        subscription: user.subscription,
        metadata: {
          lastLogin: user.metadata.lastLogin,
          onboardingCompleted: user.metadata.onboardingCompleted
        }
      };

      res.json({
        success: true,
        data: safeUser
      });
    } catch (error) {
      logger.error('Error getting user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update user profile
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { profile, preferences, riskProfile } = req.body;
      const updateData: any = {};

      if (profile) updateData.profile = profile;
      if (preferences) updateData.preferences = preferences;
      if (riskProfile) updateData.riskProfile = riskProfile;

      const updatedUser = await dbService.updateUser(userId, updateData);
      if (!updatedUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create user (for Auth0 integration)
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { auth0Id, email, profile } = req.body;

      if (!auth0Id || !email || !profile) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const existingUser = await dbService.findUserByAuth0Id(auth0Id);
      if (existingUser) {
        res.status(409).json({ error: 'User already exists' });
        return;
      }

      const userData = {
        auth0Id,
        email,
        profile,
        preferences: {
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'en',
          theme: 'auto' as const,
          notifications: {
            email: true,
            push: true,
            sms: false,
            trading: true,
            news: true
          }
        },
        riskProfile: {
          level: 'moderate' as const,
          questionnaire: {
            age: 30,
            experience: 'beginner',
            timeline: '5-10 years',
            riskTolerance: 5,
            completedAt: new Date()
          }
        },
        subscription: {
          plan: 'free' as const,
          startDate: new Date(),
          features: ['basic_portfolio', 'ai_chat']
        },
        encryption: {
          keyId: 'default',
          algorithm: 'AES-256-GCM',
          version: 1
        },
        metadata: {
          lastLogin: new Date(),
          loginCount: 1,
          onboardingCompleted: false
        }
      };

      const newUser = await dbService.createUser(userData);
      
      res.status(201).json({
        success: true,
        data: newUser
      });
    } catch (error) {
      logger.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
