import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Investment, IInvestment } from '../models';
import { logger } from '../utils/logger';

export class InvestmentController {
  // Get all investments for a user
  static async getInvestments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const investments = await Investment.find({ userId, isActive: true })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: investments,
        count: investments.length
      });
    } catch (error) {
      logger.error('Error getting investments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get single investment
  static async getInvestment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const investment = await Investment.findOne({ _id: id, userId, isActive: true });
      if (!investment) {
        res.status(404).json({ error: 'Investment not found' });
        return;
      }

      res.json({
        success: true,
        data: investment
      });
    } catch (error) {
      logger.error('Error getting investment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create new investment
  static async createInvestment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const {
        symbol,
        name,
        shares,
        purchasePrice,
        type,
        purchaseDate,
        purchaseMethod = 'buy',
        fees = 0,
        brokerage
      } = req.body;

      // Validate required fields
      if (!symbol || !name || !shares || !purchasePrice || !type || !purchaseDate) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Calculate position metrics
      const totalCost = shares * purchasePrice + fees;
      const averageCost = totalCost / shares;

      const investmentData: Partial<IInvestment> = {
        userId: new mongoose.Types.ObjectId(userId),
        securityInfo: {
          symbol: symbol.toUpperCase(),
          name,
          type,
          currency: 'USD'
        },
        position: {
          shares,
          averageCost,
          totalCost,
          currentPrice: purchasePrice, // Will be updated with real-time data
          marketValue: shares * purchasePrice,
          gainLoss: 0,
          gainLossPercent: 0,
          dayChange: 0,
          dayChangePercent: 0
        },
        acquisition: {
          purchaseDate: new Date(purchaseDate),
          purchaseMethod,
          purchasePrice,
          fees,
          brokerage
        },
        isActive: true
      };

      const investment = new Investment(investmentData);
      const savedInvestment = await investment.save();

      res.status(201).json({
        success: true,
        data: savedInvestment
      });
    } catch (error) {
      logger.error('Error creating investment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update investment
  static async updateInvestment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const updates = req.body;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Remove fields that shouldn't be updated directly
      delete updates.userId;
      delete updates.securityInfo;
      delete updates.acquisition;

      const investment = await Investment.findOneAndUpdate(
        { _id: id, userId, isActive: true },
        updates,
        { new: true, runValidators: true }
      );

      if (!investment) {
        res.status(404).json({ error: 'Investment not found' });
        return;
      }

      res.json({
        success: true,
        data: investment
      });
    } catch (error) {
      logger.error('Error updating investment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete investment (soft delete)
  static async deleteInvestment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const investment = await Investment.findOneAndUpdate(
        { _id: id, userId, isActive: true },
        { isActive: false },
        { new: true }
      );

      if (!investment) {
        res.status(404).json({ error: 'Investment not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Investment deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting investment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get portfolio summary
  static async getPortfolioSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const investments = await Investment.find({ userId, isActive: true });

      const totalValue = investments.reduce((sum, inv) => sum + inv.position.marketValue, 0);
      const totalCost = investments.reduce((sum, inv) => sum + inv.position.totalCost, 0);
      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

      // Calculate allocation by type
      const allocationByType = investments.reduce((acc, inv) => {
        const type = inv.securityInfo.type;
        acc[type] = (acc[type] || 0) + inv.position.marketValue;
        return acc;
      }, {} as Record<string, number>);

      // Convert to percentages
      const allocationPercentages = Object.entries(allocationByType).map(([type, value]) => ({
        type,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
      }));

      const summary = {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        investmentCount: investments.length,
        allocation: allocationPercentages,
        topHoldings: investments
          .sort((a, b) => b.position.marketValue - a.position.marketValue)
          .slice(0, 5)
          .map(inv => ({
            symbol: inv.securityInfo.symbol,
            name: inv.securityInfo.name,
            value: inv.position.marketValue,
            gainLoss: inv.position.gainLoss,
            gainLossPercent: inv.position.gainLossPercent
          }))
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error getting portfolio summary:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
