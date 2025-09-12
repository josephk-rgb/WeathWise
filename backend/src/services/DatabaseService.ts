import { User, IUser } from '../models';
import { logger } from '../utils/logger';

export class DatabaseService {
  /**
   * Create a new user
   */
  async createUser(userData: Partial<IUser>): Promise<IUser> {
    try {
      const user = new User(userData);
      const savedUser = await user.save();
      logger.info(`User created successfully: ${savedUser.email}`);
      return savedUser;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by Auth0 ID
   */
  async findUserByAuth0Id(auth0Id: string): Promise<IUser | null> {
    try {
      const user = await User.findOne({ auth0Id });
      return user;
    } catch (error) {
      logger.error('Error finding user by Auth0 ID:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<IUser | null> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      return user;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updateData: Partial<IUser>): Promise<IUser | null> {
    try {
      console.log('🔧 [DATABASE] Updating user:', userId);
      console.log('🔧 [DATABASE] Update data:', JSON.stringify(updateData, null, 2));
      
      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (user) {
        logger.info(`User updated successfully: ${user.email}`);
        console.log('🔧 [DATABASE] User updated successfully:', {
          id: user._id,
          email: user.email,
          profile: user.profile,
          metadata: user.metadata
        });
      } else {
        console.log('🔧 [DATABASE] User not found for update:', userId);
      }
      
      return user;
    } catch (error) {
      logger.error('Error updating user:', error);
      console.log('🔧 [DATABASE] Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      const result = await User.findByIdAndDelete(userId);
      if (result) {
        logger.info(`User deleted successfully: ${result.email}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  async getUsers(page: number = 1, limit: number = 20): Promise<{ users: IUser[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const users = await User.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      
      const total = await User.countDocuments();
      
      return { users, total };
    } catch (error) {
      logger.error('Error getting users:', error);
      throw error;
    }
  }

  /**
   * Search users
   */
  async searchUsers(query: string, page: number = 1, limit: number = 20): Promise<{ users: IUser[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(query, 'i');
      
      const users = await User.find({
        $or: [
          { email: searchRegex },
          { 'profile.firstName': searchRegex },
          { 'profile.lastName': searchRegex }
        ]
      })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      
      const total = await User.countDocuments({
        $or: [
          { email: searchRegex },
          { 'profile.firstName': searchRegex },
          { 'profile.lastName': searchRegex }
        ]
      });
      
      return { users, total };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    usersByPlan: Record<string, number>;
  }> {
    try {
      const totalUsers = await User.countDocuments();
      
      const activeUsers = await User.countDocuments({
        'metadata.lastLogin': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      
      const newUsersThisMonth = await User.countDocuments({
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      });
      
      const usersByPlan = await User.aggregate([
        {
          $group: {
            _id: '$subscription.plan',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const planStats = usersByPlan.reduce((acc, plan) => {
        acc[plan._id || 'free'] = plan.count;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        usersByPlan: planStats
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Update user last login
   */
  async updateUserLastLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { 'metadata.loginCount': 1 },
        $set: { 
          'metadata.lastLogin': new Date(),
          ...(ipAddress && { 'metadata.ipAddress': ipAddress }),
          ...(userAgent && { 'metadata.userAgent': userAgent })
        }
      });
    } catch (error) {
      logger.error('Error updating user last login:', error);
      throw error;
    }
  }

  /**
   * Complete user onboarding
   */
  async completeUserOnboarding(userId: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        $set: { 'metadata.onboardingCompleted': true }
      });
    } catch (error) {
      logger.error('Error completing user onboarding:', error);
      throw error;
    }
  }

  /**
   * Accept terms of service
   */
  async acceptTermsOfService(userId: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        $set: { 'metadata.tosAcceptedAt': new Date() }
      });
    } catch (error) {
      logger.error('Error accepting terms of service:', error);
      throw error;
    }
  }

  /**
   * Accept privacy policy
   */
  async acceptPrivacyPolicy(userId: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        $set: { 'metadata.privacyPolicyAcceptedAt': new Date() }
      });
    } catch (error) {
      logger.error('Error accepting privacy policy:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<IUser['preferences']>): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { preferences } },
        { new: true, runValidators: true }
      );
      
      if (user) {
        logger.info(`User preferences updated: ${user.email}`);
      }
      
      return user;
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user risk profile
   */
  async updateUserRiskProfile(userId: string, riskProfile: Partial<IUser['riskProfile']>): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { riskProfile } },
        { new: true, runValidators: true }
      );
      
      if (user) {
        logger.info(`User risk profile updated: ${user.email}`);
      }
      
      return user;
    } catch (error) {
      logger.error('Error updating user risk profile:', error);
      throw error;
    }
  }

  /**
   * Get users by subscription plan
   */
  async getUsersByPlan(plan: string): Promise<IUser[]> {
    try {
      const users = await User.find({ 'subscription.plan': plan });
      return users;
    } catch (error) {
      logger.error('Error getting users by plan:', error);
      throw error;
    }
  }

  /**
   * Get users by risk profile
   */
  async getUsersByRiskProfile(riskLevel: string): Promise<IUser[]> {
    try {
      const users = await User.find({ 'riskProfile.level': riskLevel });
      return users;
    } catch (error) {
      logger.error('Error getting users by risk profile:', error);
      throw error;
    }
  }
}
