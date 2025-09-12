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

      const {
        name,
        totalAmount,
        remainingBalance,
        interestRate,
        minimumPayment,
        dueDate,
        type,
        currency = 'USD'
      } = req.body;

      // Debug logging
      logger.info('Debt creation request:', {
        userId,
        requestBody: req.body,
        extractedFields: {
          name,
          totalAmount,
          remainingBalance,
          interestRate,
          minimumPayment,
          dueDate,
          type,
          currency
        }
      });

      // Validate required fields
      const missingFields = [];
      if (!name) missingFields.push('name');
      if (!totalAmount && totalAmount !== 0) missingFields.push('totalAmount');
      if (!remainingBalance && remainingBalance !== 0) missingFields.push('remainingBalance');
      if (!interestRate && interestRate !== 0) missingFields.push('interestRate');
      if (!minimumPayment && minimumPayment !== 0) missingFields.push('minimumPayment');
      if (!dueDate) missingFields.push('dueDate');
      if (!type) missingFields.push('type');

      if (missingFields.length > 0) {
        logger.error('Missing required fields for debt creation:', missingFields);
        res.status(400).json({ 
          error: 'Missing required fields',
          missingFields 
        });
        return;
      }

      const debtData: Partial<IDebt> = {
        userId: new mongoose.Types.ObjectId(userId),
        name,
        totalAmount: Number(totalAmount),
        remainingBalance: Number(remainingBalance),
        interestRate: Number(interestRate),
        minimumPayment: Number(minimumPayment),
        dueDate: new Date(dueDate),
        type,
        currency: currency.toUpperCase(),
        paymentHistory: [],
        isActive: true,
        isPaidOff: false
      };

      const debt = new Debt(debtData);
      const savedDebt = await debt.save();

      logger.info(`Debt created for user ${userId}:`, savedDebt._id);

      res.status(201).json({
        success: true,
        data: savedDebt,
        message: 'Debt created successfully'
      });
    } catch (error) {
      logger.error('Error creating debt:', error);
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
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
