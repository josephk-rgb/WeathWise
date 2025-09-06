import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Debt, IDebt } from '../models';
import { logger } from '../utils/logger';

export class DebtController {
  // Get all debts for a user
  static async getDebts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const debts = await Debt.find({ userId }).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: debts
      });
    } catch (error) {
      logger.error('Error getting debts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get single debt
  static async getDebt(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const debt = await Debt.findOne({ _id: id, userId });
      if (!debt) {
        res.status(404).json({ error: 'Debt not found' });
        return;
      }

      res.json({
        success: true,
        data: debt
      });
    } catch (error) {
      logger.error('Error getting debt:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create new debt
  static async createDebt(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const debtData = {
        ...req.body,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const debt = new Debt(debtData);
      await debt.save();

      res.status(201).json({
        success: true,
        data: debt
      });
    } catch (error) {
      logger.error('Error creating debt:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update debt
  static async updateDebt(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const debt = await Debt.findOneAndUpdate(
        { _id: id, userId },
        { ...req.body, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!debt) {
        res.status(404).json({ error: 'Debt not found' });
        return;
      }

      res.json({
        success: true,
        data: debt
      });
    } catch (error) {
      logger.error('Error updating debt:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete debt
  static async deleteDebt(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const debt = await Debt.findOneAndDelete({ _id: id, userId });
      if (!debt) {
        res.status(404).json({ error: 'Debt not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Debt deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting debt:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Add payment to debt
  static async addPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { amount, paymentDate, currency } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const debt = await Debt.findOne({ _id: id, userId });
      if (!debt) {
        res.status(404).json({ error: 'Debt not found' });
        return;
      }

      // Add payment to history
      debt.paymentHistory.push({
        amount,
        paymentDate: new Date(paymentDate),
        currency: currency || debt.currency
      });

      // Update remaining balance
      debt.remainingBalance = Math.max(0, debt.remainingBalance - amount);

      // Check if debt is paid off
      if (debt.remainingBalance === 0) {
        debt.isPaidOff = true;
        debt.paidOffAt = new Date();
      }

      debt.updatedAt = new Date();
      await debt.save();

      res.json({
        success: true,
        data: debt
      });
    } catch (error) {
      logger.error('Error adding payment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
