import { User, IUser } from '../models/User';
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
      const user = await User.findByAuth0Id(auth0Id);
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
      const user = await User.findByEmail(email);
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
      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (user) {
        logger.info(`User updated successfully: ${user.email}`);
      }
      
      return user;
    } catch (error) {
      logger.error('Error updating user:', error);
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
  async getUsers(page: number = 1, limit: number = 20): Promise<{ users: IUser[], total: number, page: number, totalPages: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const [users, total] = await Promise.all([
        User.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments()
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        users,
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error getting users:', error);
      throw error;
    }
  }

  /**
   * Get active users (with valid subscriptions)
   */
  async getActiveUsers(): Promise<IUser[]> {
    try {
      const users = await User.findActiveUsers();
      return users;
    } catch (error) {
      logger.error('Error getting active users:', error);
      throw error;
    }
  }

  /**
   * Update user's last login
   */
  async updateUserLastLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      if (user) {
        await user.updateLastLogin(ipAddress, userAgent);
        return user;
      }
      return null;
    } catch (error) {
      logger.error('Error updating user last login:', error);
      throw error;
    }
  }

  /**
   * Complete user onboarding
   */
  async completeUserOnboarding(userId: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      if (user) {
        await user.completeOnboarding();
        logger.info(`User onboarding completed: ${user.email}`);
        return user;
      }
      return null;
    } catch (error) {
      logger.error('Error completing user onboarding:', error);
      throw error;
    }
  }

  /**
   * Accept terms and conditions
   */
  async acceptUserTerms(userId: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      if (user) {
        await user.acceptTerms();
        logger.info(`User accepted terms: ${user.email}`);
        return user;
      }
      return null;
    } catch (error) {
      logger.error('Error accepting user terms:', error);
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
        { riskProfile },
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
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<IUser['preferences']>): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { preferences },
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
   * Update user subscription
   */
  async updateUserSubscription(userId: string, subscription: Partial<IUser['subscription']>): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { subscription },
        { new: true, runValidators: true }
      );
      
      if (user) {
        logger.info(`User subscription updated: ${user.email} - ${user.subscription.plan}`);
      }
      
      return user;
    } catch (error) {
      logger.error('Error updating user subscription:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    premium: number;
    enterprise: number;
    newThisMonth: number;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [total, active, premium, enterprise, newThisMonth] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ 'subscription.endDate': { $gt: now } }),
        User.countDocuments({ 'subscription.plan': 'premium' }),
        User.countDocuments({ 'subscription.plan': 'enterprise' }),
        User.countDocuments({ createdAt: { $gte: startOfMonth } })
      ]);

      return {
        total,
        active,
        premium,
        enterprise,
        newThisMonth
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }
}

export default DatabaseService;
