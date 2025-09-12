import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Investment, IInvestment } from '../models';
import { logger } from '../utils/logger';
import { MarketDataService } from '../services/marketDataService';

export class InvestmentController {
  // Get all investments for a user
  static async getInvestments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      logger.info('Get investments request:', { userId, userObj: req.user });
      
      if (!userId) {
        logger.error('User not authenticated for investments');
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      logger.info('Fetching investments for user:', userId);
      const investments = await Investment.find({ userId, isActive: true })
        .sort({ createdAt: -1 });

      logger.info('Found investments:', { 
        count: investments.length, 
        userId,
        investmentIds: investments.map(inv => inv._id)
      });

      // Update investments with real-time market data
      const marketDataService = new MarketDataService();
      const updatedInvestments = await marketDataService.updateInvestmentPrices(investments);

      // Debug logging for investments endpoint
      logger.info('=== INVESTMENTS ENDPOINT CURRENT VALUE DEBUG ===');
      logger.info(`Total investments returned: ${updatedInvestments.length}`);
      const totalValue = updatedInvestments.reduce((sum, inv) => sum + (inv.position.shares * inv.position.currentPrice), 0);
      logger.info(`Total current value: $${totalValue.toFixed(2)}`);
      logger.info('Individual investment breakdown:');
      updatedInvestments.forEach(inv => {
        const currentValue = inv.position.shares * inv.position.currentPrice;
        logger.info(`  ${inv.securityInfo.symbol}: ${inv.position.shares} shares × $${inv.position.currentPrice} = $${currentValue.toFixed(2)}`);
      });
      logger.info('=== END INVESTMENTS ENDPOINT DEBUG ===');

      // Transform investments to include all necessary fields for frontend
      const transformedInvestments = updatedInvestments.map(investment => ({
        _id: investment._id,
        userId: investment.userId,
        securityInfo: investment.securityInfo,
        position: investment.position,
        acquisition: investment.acquisition,
        isActive: investment.isActive,
        createdAt: investment.createdAt,
        updatedAt: investment.updatedAt
      }));

      res.json({
        success: true,
        data: transformedInvestments,
        count: transformedInvestments.length
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

      // Transform the saved investment for frontend consumption
      const transformedInvestment = {
        _id: savedInvestment._id,
        userId: savedInvestment.userId,
        securityInfo: savedInvestment.securityInfo,
        position: savedInvestment.position,
        acquisition: savedInvestment.acquisition,
        isActive: savedInvestment.isActive,
        createdAt: savedInvestment.createdAt,
        updatedAt: savedInvestment.updatedAt
      };

      res.status(201).json({
        success: true,
        data: transformedInvestment
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

      // Transform the updated investment for frontend consumption
      const transformedInvestment = {
        _id: investment._id,
        userId: investment.userId,
        securityInfo: investment.securityInfo,
        position: investment.position,
        acquisition: investment.acquisition,
        isActive: investment.isActive,
        createdAt: investment.createdAt,
        updatedAt: investment.updatedAt
      };

      res.json({
        success: true,
        data: transformedInvestment
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

      // Update investments with real-time market data
      const marketDataService = new MarketDataService();
      const updatedInvestments = await marketDataService.updateInvestmentPrices(investments);

      // Debug logging for portfolio summary
      logger.info('=== PORTFOLIO SUMMARY CURRENT VALUE DEBUG ===');
      logger.info(`Total investments: ${updatedInvestments.length}`);
      
      const totalValue = updatedInvestments.reduce((sum, inv) => sum + inv.position.marketValue, 0);
      const totalCost = updatedInvestments.reduce((sum, inv) => sum + inv.position.totalCost, 0);
      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
      
      logger.info(`Total value (marketValue): $${totalValue.toFixed(2)}`);
      logger.info(`Total cost: $${totalCost.toFixed(2)}`);
      logger.info(`Total gain/loss: $${totalGainLoss.toFixed(2)} (${totalGainLossPercent.toFixed(2)}%)`);
      logger.info('Individual investment breakdown:');
      updatedInvestments.forEach(inv => {
        logger.info(`  ${inv.securityInfo.symbol}: ${inv.position.shares} shares × $${inv.position.currentPrice} = $${inv.position.marketValue.toFixed(2)}`);
      });
      logger.info('=== END PORTFOLIO SUMMARY DEBUG ===');

      // Calculate allocation by type
      const allocationByType = updatedInvestments.reduce((acc, inv) => {
        const type = inv.securityInfo.type;
        acc[type] = (acc[type] || 0) + inv.position.marketValue;
        return acc;
      }, {} as Record<string, number>);

      // Convert to percentages
      const allocationPercentages = Object.entries(allocationByType).map(([type, value]) => ({
        type,
        value: Number(value),
        percentage: totalValue > 0 ? (Number(value) / totalValue) * 100 : 0
      }));

      const summary = {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        investmentCount: updatedInvestments.length,
        allocation: allocationPercentages,
        topHoldings: updatedInvestments
          .sort((a, b) => b.position.marketValue - a.position.marketValue)
          .slice(0, 5)
          .map(inv => ({
            symbol: inv.securityInfo.symbol,
            name: inv.securityInfo.name,
            value: inv.position.marketValue,
            gainLoss: inv.position.gainLoss,
            gainLossPercent: inv.position.gainLossPercent
          })),
        lastUpdated: new Date()
      };

      // Set caching headers for polling optimization
      const lastModified = new Date().toUTCString();
      res.set({
        'Last-Modified': lastModified,
        'Cache-Control': 'public, max-age=30', // 30 seconds cache
        'ETag': `"portfolio-summary-${userId}-${Date.now()}"`
      });

      // Check if client has current version
      const ifModifiedSince = req.headers['if-modified-since'];
      if (ifModifiedSince) {
        const clientDate = new Date(ifModifiedSince);
        const dataAge = Date.now() - summary.lastUpdated.getTime();
        
        // If data is less than 30 seconds old, return 304
        if (dataAge < 30000) {
          res.status(304).end();
          return;
        }
      }

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
