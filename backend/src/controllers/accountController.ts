import { Request, Response } from 'express';
import { Account, AccountBalanceHistory, IAccount } from '../models';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export class AccountController {
  /**
   * Create a new account
   */
  static async createAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const accountData = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      // Validate required fields
      if (!accountData.type || !accountData.accountInfo?.name) {
        res.status(400).json({ 
          error: 'Missing required account information',
          required: ['type', 'accountInfo.name']
        });
        return;
      }
      
      // Create the account
      const account = new Account({
        userId: new mongoose.Types.ObjectId(userId),
        type: accountData.type,
        provider: {
          name: accountData.provider?.name || 'Manual Entry',
          id: accountData.provider?.id,
          logo: accountData.provider?.logo
        },
        accountInfo: {
          name: accountData.accountInfo.name,
          accountNumber: accountData.accountInfo.accountNumber || '****',
          routingNumber: accountData.accountInfo.routingNumber,
          balance: accountData.accountInfo.balance || 0,
          currency: accountData.accountInfo.currency || 'USD',
          lastSyncedAt: accountData.accountInfo.lastSyncedAt
        },
        connectionStatus: {
          isConnected: accountData.connectionStatus?.isConnected || false,
          lastConnected: accountData.connectionStatus?.lastConnected,
          errorMessage: accountData.connectionStatus?.errorMessage,
          provider: accountData.connectionStatus?.provider || 'manual'
        },
        institutionName: accountData.institutionName,
        accountPattern: accountData.accountPattern,
        balanceSource: accountData.balanceSource || 'manual',
        lastManualUpdate: new Date(),
        category: accountData.category,
        linkedGoalId: accountData.linkedGoalId,
        isActive: true
      });
      
      await account.save();
      
      // Create initial balance history entry
      await AccountBalanceHistory.create({
        accountId: account._id,
        userId: new mongoose.Types.ObjectId(userId),
        date: new Date(),
        balance: account.accountInfo.balance,
        changeType: 'initial',
        changeAmount: account.accountInfo.balance,
        previousBalance: 0,
        description: 'Account created'
      });
      
      logger.info(`Account created: ${account._id} for user: ${userId}`);
      
      res.status(201).json({
        success: true,
        data: account,
        message: 'Account created successfully'
      });
    } catch (error) {
      logger.error('Error creating account:', error);
      
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({ 
          error: 'Validation error',
          details: Object.values(error.errors).map(err => err.message)
        });
        return;
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Get all accounts for the authenticated user
   */
  static async getAccounts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { type, category } = req.query;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      const filter: any = { 
        userId: new mongoose.Types.ObjectId(userId), 
        isActive: true 
      };
      
      if (type) filter.type = type;
      if (category) filter.category = category;
      
      const accounts = await Account.find(filter)
        .populate('linkedGoalId', 'goalInfo.title goalInfo.targetAmount currentAmount')
        .sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: accounts,
        count: accounts.length
      });
    } catch (error) {
      logger.error('Error fetching accounts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Get accounts by type
   */
  static async getAccountsByType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { type } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      const accounts = await Account.find({ 
        userId: new mongoose.Types.ObjectId(userId), 
        type,
        isActive: true 
      }).sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: accounts,
        count: accounts.length
      });
    } catch (error) {
      logger.error('Error fetching accounts by type:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Update account information
   */
  static async updateAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const updateData = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      const account = await Account.findOne({ 
        _id: id, 
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true 
      });
      
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      
      // Update allowed fields
      if (updateData.accountInfo?.name) {
        account.accountInfo.name = updateData.accountInfo.name;
      }
      if (updateData.institutionName !== undefined) {
        account.institutionName = updateData.institutionName;
      }
      if (updateData.accountPattern !== undefined) {
        account.accountPattern = updateData.accountPattern;
      }
      if (updateData.category !== undefined) {
        account.category = updateData.category;
      }
      if (updateData.linkedGoalId !== undefined) {
        account.linkedGoalId = updateData.linkedGoalId;
      }
      
      await account.save();
      
      res.json({
        success: true,
        data: account,
        message: 'Account updated successfully'
      });
    } catch (error) {
      logger.error('Error updating account:', error);
      
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({ 
          error: 'Validation error',
          details: Object.values(error.errors).map(err => err.message)
        });
        return;
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Update account balance
   */
  static async updateAccountBalance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { balance, description } = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      if (typeof balance !== 'number' || !isFinite(balance)) {
        res.status(400).json({ error: 'Invalid balance value' });
        return;
      }
      
      const account = await Account.findOne({ 
        _id: id, 
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true 
      });
      
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      
      const previousBalance = account.accountInfo.balance;
      const changeAmount = balance - previousBalance;
      
      // Update account balance
      account.accountInfo.balance = balance;
      account.lastManualUpdate = new Date();
      account.balanceSource = 'manual';
      await account.save();
      
      // Record balance history
      await AccountBalanceHistory.create({
        accountId: account._id,
        userId: new mongoose.Types.ObjectId(userId),
        date: new Date(),
        balance: balance,
        changeType: 'manual_update',
        changeAmount: changeAmount,
        previousBalance: previousBalance,
        description: description || 'Manual balance update'
      });
      
      logger.info(`Account balance updated: ${account._id}, ${previousBalance} → ${balance}`);
      
      res.json({
        success: true,
        data: account,
        change: {
          previous: previousBalance,
          current: balance,
          amount: changeAmount
        },
        message: 'Account balance updated successfully'
      });
    } catch (error) {
      logger.error('Error updating account balance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Delete (deactivate) an account
   */
  static async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      const account = await Account.findOne({ 
        _id: id, 
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true 
      });
      
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      
      // Soft delete - mark as inactive
      account.isActive = false;
      await account.save();
      
      logger.info(`Account deleted: ${account._id} for user: ${userId}`);
      
      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting account:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Get account balance history
   */
  static async getBalanceHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      // Verify account ownership
      const account = await Account.findOne({ 
        _id: id, 
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true 
      });
      
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      
      const history = await AccountBalanceHistory.find({ 
        accountId: id,
        userId: new mongoose.Types.ObjectId(userId)
      })
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip(Number(offset));
      
      const totalCount = await AccountBalanceHistory.countDocuments({
        accountId: id,
        userId: new mongoose.Types.ObjectId(userId)
      });
      
      res.json({
        success: true,
        data: history,
        pagination: {
          total: totalCount,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: (Number(offset) + Number(limit)) < totalCount
        }
      });
    } catch (error) {
      logger.error('Error fetching balance history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default AccountController;
