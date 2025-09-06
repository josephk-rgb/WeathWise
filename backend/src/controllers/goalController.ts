import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Goal, IGoal } from '../models';
import { logger } from '../utils/logger';

export class GoalController {
  // Get all goals for a user
  static async getGoals(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const goals = await Goal.find({ userId, isActive: true })
        .sort({ priority: -1, createdAt: -1 });

      res.json({
        success: true,
        data: goals,
        count: goals.length
      });
    } catch (error) {
      logger.error('Error getting goals:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get single goal
  static async getGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const goal = await Goal.findOne({ _id: id, userId, isActive: true });
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      res.json({
        success: true,
        data: goal
      });
    } catch (error) {
      logger.error('Error getting goal:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create new goal
  static async createGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const {
        title,
        description,
        targetAmount,
        currentAmount = 0,
        targetDate,
        category,
        priority = 'medium',
        currency = 'USD'
      } = req.body;

      // Validate required fields
      if (!title || !targetAmount || !targetDate || !category) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const goalData: Partial<IGoal> = {
        userId: new mongoose.Types.ObjectId(userId),
        title,
        description,
        targetAmount,
        currentAmount,
        targetDate: new Date(targetDate),
        category,
        priority,
        currency: currency.toUpperCase()
      };

      const goal = new Goal(goalData);
      const savedGoal = await goal.save();

      logger.info(`Goal created for user ${userId}:`, savedGoal._id);

      res.status(201).json({
        success: true,
        data: savedGoal,
        message: 'Goal created successfully'
      });
    } catch (error) {
      logger.error('Error creating goal:', error);
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Update goal
  static async updateGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const updateData = { ...req.body };
      delete updateData._id;
      delete updateData.userId;

      // Convert targetDate if provided
      if (updateData.targetDate) {
        updateData.targetDate = new Date(updateData.targetDate);
      }

      const goal = await Goal.findOneAndUpdate(
        { _id: id, userId, isActive: true },
        updateData,
        { new: true, runValidators: true }
      );

      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      logger.info(`Goal updated for user ${userId}:`, goal._id);

      res.json({
        success: true,
        data: goal,
        message: 'Goal updated successfully'
      });
    } catch (error) {
      logger.error('Error updating goal:', error);
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Delete goal (soft delete)
  static async deleteGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const goal = await Goal.findOneAndUpdate(
        { _id: id, userId, isActive: true },
        { isActive: false },
        { new: true }
      );

      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      logger.info(`Goal deleted for user ${userId}:`, goal._id);

      res.json({
        success: true,
        message: 'Goal deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting goal:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update goal progress
  static async updateGoalProgress(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { amount } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (typeof amount !== 'number' || amount < 0) {
        res.status(400).json({ error: 'Invalid amount' });
        return;
      }

      const goal = await Goal.findOneAndUpdate(
        { _id: id, userId, isActive: true },
        { currentAmount: amount },
        { new: true, runValidators: true }
      );

      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      logger.info(`Goal progress updated for user ${userId}:`, goal._id);

      res.json({
        success: true,
        data: goal,
        message: 'Goal progress updated successfully'
      });
    } catch (error) {
      logger.error('Error updating goal progress:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get goal statistics
  static async getGoalStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const stats = await Goal.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
        {
          $group: {
            _id: null,
            totalGoals: { $sum: 1 },
            completedGoals: { $sum: { $cond: ['$isCompleted', 1, 0] } },
            totalTargetAmount: { $sum: '$targetAmount' },
            totalCurrentAmount: { $sum: '$currentAmount' },
            averageProgress: { 
              $avg: { 
                $cond: [
                  { $gt: ['$targetAmount', 0] },
                  { $multiply: [{ $divide: ['$currentAmount', '$targetAmount'] }, 100] },
                  0
                ]
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalGoals: 0,
        completedGoals: 0,
        totalTargetAmount: 0,
        totalCurrentAmount: 0,
        averageProgress: 0
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting goal statistics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
