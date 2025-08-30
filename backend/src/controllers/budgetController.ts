import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Budget, IBudget } from '../models';
import { logger } from '../utils/logger';

export class BudgetController {
  // Get all budgets for a user
  static async getBudgets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { month, year } = req.query;
      const filter: any = { userId, isActive: true };

      if (month) filter.month = month;
      if (year) filter.year = parseInt(year as string);

      const budgets = await Budget.find(filter)
        .sort({ year: -1, month: -1, category: 1 });

      res.json({
        success: true,
        data: budgets,
        count: budgets.length
      });
    } catch (error) {
      logger.error('Error getting budgets:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get single budget
  static async getBudget(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const budget = await Budget.findOne({ _id: id, userId, isActive: true });
      if (!budget) {
        res.status(404).json({ error: 'Budget not found' });
        return;
      }

      res.json({
        success: true,
        data: budget
      });
    } catch (error) {
      logger.error('Error getting budget:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create new budget
  static async createBudget(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const {
        category,
        allocated,
        month,
        year,
        currency = 'USD'
      } = req.body;

      // Validate required fields
      if (!category || !allocated || !month || !year) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Check if budget already exists for this category/month/year
      const existingBudget = await Budget.findOne({
        userId,
        category,
        month,
        year,
        isActive: true
      });

      if (existingBudget) {
        res.status(409).json({ error: 'Budget already exists for this category and period' });
        return;
      }

      const budgetData: Partial<IBudget> = {
        userId: new mongoose.Types.ObjectId(userId),
        category,
        allocated: Number(allocated),
        month,
        year: Number(year),
        currency: currency.toUpperCase()
      };

      const budget = new Budget(budgetData);
      const savedBudget = await budget.save();

      logger.info(`Budget created for user ${userId}:`, savedBudget._id);

      res.status(201).json({
        success: true,
        data: savedBudget,
        message: 'Budget created successfully'
      });
    } catch (error) {
      logger.error('Error creating budget:', error);
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Update budget
  static async updateBudget(req: Request, res: Response): Promise<void> {
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

      const budget = await Budget.findOneAndUpdate(
        { _id: id, userId, isActive: true },
        updateData,
        { new: true, runValidators: true }
      );

      if (!budget) {
        res.status(404).json({ error: 'Budget not found' });
        return;
      }

      logger.info(`Budget updated for user ${userId}:`, budget._id);

      res.json({
        success: true,
        data: budget,
        message: 'Budget updated successfully'
      });
    } catch (error) {
      logger.error('Error updating budget:', error);
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Delete budget (soft delete)
  static async deleteBudget(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const budget = await Budget.findOneAndUpdate(
        { _id: id, userId, isActive: true },
        { isActive: false },
        { new: true }
      );

      if (!budget) {
        res.status(404).json({ error: 'Budget not found' });
        return;
      }

      logger.info(`Budget deleted for user ${userId}:`, budget._id);

      res.json({
        success: true,
        message: 'Budget deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting budget:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update budget spending
  static async updateBudgetSpending(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { spent } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (typeof spent !== 'number' || spent < 0) {
        res.status(400).json({ error: 'Invalid spent amount' });
        return;
      }

      const budget = await Budget.findOneAndUpdate(
        { _id: id, userId, isActive: true },
        { spent },
        { new: true, runValidators: true }
      );

      if (!budget) {
        res.status(404).json({ error: 'Budget not found' });
        return;
      }

      logger.info(`Budget spending updated for user ${userId}:`, budget._id);

      res.json({
        success: true,
        data: budget,
        message: 'Budget spending updated successfully'
      });
    } catch (error) {
      logger.error('Error updating budget spending:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get budget summary
  static async getBudgetSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { month, year } = req.query;
      const currentDate = new Date();
      const targetMonth = month || currentDate.toISOString().slice(0, 7);
      const targetYear = year || currentDate.getFullYear();

      const summary = await Budget.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            month: targetMonth,
            year: Number(targetYear),
            isActive: true
          }
        },
        {
          $group: {
            _id: null,
            totalAllocated: { $sum: '$allocated' },
            totalSpent: { $sum: '$spent' },
            categoriesCount: { $sum: 1 },
            overBudgetCategories: {
              $sum: { $cond: [{ $gt: ['$spent', '$allocated'] }, 1, 0] }
            }
          }
        }
      ]);

      const result = summary[0] || {
        totalAllocated: 0,
        totalSpent: 0,
        categoriesCount: 0,
        overBudgetCategories: 0
      };

      result.remaining = result.totalAllocated - result.totalSpent;
      result.percentUsed = result.totalAllocated > 0 ? 
        (result.totalSpent / result.totalAllocated) * 100 : 0;

      res.json({
        success: true,
        data: {
          period: { month: targetMonth, year: targetYear },
          summary: result
        }
      });
    } catch (error) {
      logger.error('Error getting budget summary:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get budget performance over time
  static async getBudgetPerformance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { months = 6 } = req.query;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - Number(months));

      const performance = await Budget.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            year: { $gte: startDate.getFullYear() },
            isActive: true
          }
        },
        {
          $group: {
            _id: { month: '$month', year: '$year' },
            totalAllocated: { $sum: '$allocated' },
            totalSpent: { $sum: '$spent' },
            categoriesCount: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      logger.error('Error getting budget performance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
