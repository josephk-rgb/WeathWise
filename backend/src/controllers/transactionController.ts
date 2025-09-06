import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Transaction, ITransaction } from '../models';
import { logger } from '../utils/logger';

export class TransactionController {
  // Get all transactions for a user
  static async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Extract query parameters
      const {
        type,
        category,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter: any = { userId };

      if (type) {
        filter['transactionInfo.type'] = type;
      }

      if (category) {
        filter['transactionInfo.category'] = category;
      }

      if (startDate || endDate) {
        filter['transactionInfo.date'] = {};
        if (startDate) {
          filter['transactionInfo.date'].$gte = new Date(startDate as string);
        }
        if (endDate) {
          filter['transactionInfo.date'].$lte = new Date(endDate as string);
        }
      }

      // Build sort object
      const sort: any = {};
      if (sortBy === 'amount') {
        sort['transactionInfo.amount'] = sortOrder === 'asc' ? 1 : -1;
      } else {
        sort['transactionInfo.date'] = sortOrder === 'asc' ? 1 : -1;
      }

      const transactions = await Transaction.find(filter)
        .sort(sort)
        .limit(Number(limit))
        .skip(Number(offset));

      const total = await Transaction.countDocuments(filter);

      // Calculate totals for all transactions matching the filter (not just current page)
      const allTransactions = await Transaction.find(filter);
      const totalIncome = allTransactions
        .filter(t => t.transactionInfo.type === 'income')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0);
      
      const totalExpenses = Math.abs(allTransactions
        .filter(t => t.transactionInfo.type === 'expense')
        .reduce((sum, t) => sum + t.transactionInfo.amount, 0));

      const netFlow = totalIncome - totalExpenses;

      res.json({
        success: true,
        data: transactions,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: total > Number(offset) + Number(limit)
        },
        totals: {
          totalIncome,
          totalExpenses,
          netFlow
        }
      });
    } catch (error) {
      logger.error('Error getting transactions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get single transaction
  static async getTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const transaction = await Transaction.findOne({ _id: id, userId });
      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      logger.error('Error getting transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create new transaction
  static async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const {
        amount,
        description,
        category,
        type,
        date,
        currency = 'USD',
        receiptUrl,
        isRecurring = false,
        recurringFrequency,
        tags = []
      } = req.body;

      // Validate required fields
      if (!amount || !description || !category || !type || !date) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const transactionData: Partial<ITransaction> = {
        userId: new mongoose.Types.ObjectId(userId),
        transactionInfo: {
          amount: Number(amount),
          currency: currency.toUpperCase(),
          description,
          type,
          category,
          date: new Date(date)
        },
        categorization: {
          automatic: false,
          userOverridden: false,
          confidence: 1.0
        },
        metadata: {
          tags: Array.isArray(tags) ? tags : [],
          receiptUrl,
          isRecurring,
          recurringPattern: isRecurring ? {
            frequency: recurringFrequency
          } : undefined
        },
        audit: {
          source: 'manual'
        }
      };

      const transaction = new Transaction(transactionData);
      const savedTransaction = await transaction.save();

      logger.info(`Transaction created for user ${userId}:`, savedTransaction._id);

      res.status(201).json({
        success: true,
        data: savedTransaction,
        message: 'Transaction created successfully'
      });
    } catch (error) {
      logger.error('Error creating transaction:', error);
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Update transaction
  static async updateTransaction(req: Request, res: Response): Promise<void> {
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

      // Handle nested updates
      if (updateData.amount || updateData.description || updateData.date || updateData.type) {
        const currentTransaction = await Transaction.findOne({ _id: id, userId });
        if (!currentTransaction) {
          res.status(404).json({ error: 'Transaction not found' });
          return;
        }

        if (updateData.amount) currentTransaction.transactionInfo.amount = updateData.amount;
        if (updateData.description) currentTransaction.transactionInfo.description = updateData.description;
        if (updateData.date) currentTransaction.transactionInfo.date = new Date(updateData.date);
        if (updateData.type) currentTransaction.transactionInfo.type = updateData.type;
        if (updateData.category) currentTransaction.transactionInfo.category = updateData.category;
        if (updateData.receiptUrl) currentTransaction.metadata.receiptUrl = updateData.receiptUrl;
        if (updateData.tags) currentTransaction.metadata.tags = updateData.tags;

        // Update audit trail
        currentTransaction.audit.modifiedAt = new Date();

        const savedTransaction = await currentTransaction.save();

        res.json({
          success: true,
          data: savedTransaction,
          message: 'Transaction updated successfully'
        });
        return;
      }

      const transaction = await Transaction.findOneAndUpdate(
        { _id: id, userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      logger.info(`Transaction updated for user ${userId}:`, transaction._id);

      res.json({
        success: true,
        data: transaction,
        message: 'Transaction updated successfully'
      });
    } catch (error) {
      logger.error('Error updating transaction:', error);
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Delete transaction
  static async deleteTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const transaction = await Transaction.findOneAndDelete({ _id: id, userId });

      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      logger.info(`Transaction deleted for user ${userId}:`, transaction._id);

      res.json({
        success: true,
        message: 'Transaction deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get transaction statistics
  static async getTransactionStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { period = '30d' } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const stats = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            'transactionInfo.date': { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$transactionInfo.type',
            totalAmount: { $sum: '$transactionInfo.amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$transactionInfo.amount' }
          }
        }
      ]);

      const categoryStats = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            'transactionInfo.date': { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              category: '$transactionInfo.category',
              type: '$transactionInfo.type'
            },
            totalAmount: { $sum: '$transactionInfo.amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { totalAmount: -1 }
        }
      ]);

      res.json({
        success: true,
        data: {
          period,
          dateRange: { startDate, endDate },
          byType: stats,
          byCategory: categoryStats
        }
      });
    } catch (error) {
      logger.error('Error getting transaction statistics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Export transactions
  static async exportTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { format = 'csv', startDate, endDate } = req.query;

      const filter: any = { userId };
      if (startDate || endDate) {
        filter['transactionInfo.date'] = {};
        if (startDate) filter['transactionInfo.date'].$gte = new Date(startDate as string);
        if (endDate) filter['transactionInfo.date'].$lte = new Date(endDate as string);
      }

      const transactions = await Transaction.find(filter)
        .sort({ 'transactionInfo.date': -1 });

      if (format === 'csv') {
        const csvData = transactions.map(t => ({
          Date: t.transactionInfo.date.toISOString().split('T')[0],
          Description: t.transactionInfo.description,
          Amount: t.transactionInfo.amount,
          Type: t.transactionInfo.type,
          Category: t.transactionInfo.category,
          Currency: t.transactionInfo.currency
        }));

        const csvHeaders = Object.keys(csvData[0] || {}).join(',');
        const csvRows = csvData.map(row => Object.values(row).join(','));
        const csvContent = [csvHeaders, ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        res.send(csvContent);
      } else {
        res.json({
          success: true,
          data: transactions,
          count: transactions.length
        });
      }
    } catch (error) {
      logger.error('Error exporting transactions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
