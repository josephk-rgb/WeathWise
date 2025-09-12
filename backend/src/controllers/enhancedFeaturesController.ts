import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { EnhancedPortfolioService } from '../services/enhancedPortfolioService';
import { AssetValuationService } from '../services/assetValuationService';
import { PerformanceOptimizer } from '../utils/performanceOptimizer';
import { logger } from '../utils/logger';

export class EnhancedFeaturesController {
  // Stock search for portfolio management
  static async searchStocks(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, limit = 10 } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const results = await EnhancedPortfolioService.searchStocks(query, parseInt(limit as string));

      res.json({
        success: true,
        data: {
          query,
          results,
          count: results.length
        }
      });
    } catch (error) {
      logger.error('Error searching stocks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Validate and enrich stock data
  static async validateStock(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;

      if (!symbol) {
        res.status(400).json({ error: 'Stock symbol is required' });
        return;
      }

      const stockData = await EnhancedPortfolioService.validateAndEnrichStock(symbol.toUpperCase());

      if (!stockData) {
        res.status(404).json({ error: 'Stock not found or invalid symbol' });
        return;
      }

      res.json({
        success: true,
        data: stockData
      });
    } catch (error) {
      logger.error('Error validating stock:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update all portfolio prices
  static async updateAllPortfolioPrices(req: Request, res: Response): Promise<void> {
    try {
      await EnhancedPortfolioService.updateAllPortfolioPrices();

      res.json({
        success: true,
        message: 'Portfolio prices updated successfully'
      });
    } catch (error) {
      logger.error('Error updating portfolio prices:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get portfolio performance
  static async getPortfolioPerformance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.query.userId;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const performance = await EnhancedPortfolioService.getPortfolioPerformance(
        new mongoose.Types.ObjectId(userId as string)
      );

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      logger.error('Error getting portfolio performance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get top movers
  static async getTopMovers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.query.userId;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const topMovers = await EnhancedPortfolioService.getTopMovers(
        new mongoose.Types.ObjectId(userId as string)
      );

      res.json({
        success: true,
        data: topMovers
      });
    } catch (error) {
      logger.error('Error getting top movers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update asset value
  static async updateAssetValue(req: Request, res: Response): Promise<void> {
    try {
      const { assetId } = req.params;
      const { value, method = 'manual', notes } = req.body;

      if (!assetId || !value) {
        res.status(400).json({ error: 'Asset ID and value are required' });
        return;
      }

      if (value < 0) {
        res.status(400).json({ error: 'Asset value cannot be negative' });
        return;
      }

      await AssetValuationService.updateAssetValue(
        new mongoose.Types.ObjectId(assetId),
        parseFloat(value),
        method,
        notes
      );

      res.json({
        success: true,
        message: 'Asset value updated successfully'
      });
    } catch (error) {
      logger.error('Error updating asset value:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get asset valuation history
  static async getAssetValuationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { assetId } = req.params;
      const { limit = 10 } = req.query;

      if (!assetId) {
        res.status(400).json({ error: 'Asset ID is required' });
        return;
      }

      const history = await AssetValuationService.getAssetValuationHistory(
        new mongoose.Types.ObjectId(assetId),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          assetId,
          history,
          count: history.length
        }
      });
    } catch (error) {
      logger.error('Error getting asset valuation history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update all asset depreciation
  static async updateAllAssetDepreciation(req: Request, res: Response): Promise<void> {
    try {
      await AssetValuationService.updateAllAssetDepreciation();

      res.json({
        success: true,
        message: 'Asset depreciation updated successfully'
      });
    } catch (error) {
      logger.error('Error updating asset depreciation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get asset revaluation suggestions
  static async getAssetRevaluationSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.query.userId;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const suggestions = await AssetValuationService.suggestAssetRevaluation(
        new mongoose.Types.ObjectId(userId as string)
      );

      res.json({
        success: true,
        data: {
          suggestions,
          count: suggestions.length
        }
      });
    } catch (error) {
      logger.error('Error getting asset revaluation suggestions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get performance statistics
  static async getPerformanceStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = PerformanceOptimizer.getPerformanceStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting performance stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Clear cache
  static async clearCache(req: Request, res: Response): Promise<void> {
    try {
      const { pattern } = req.query;

      PerformanceOptimizer.clearCache(pattern as string);

      res.json({
        success: true,
        message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All cache cleared'
      });
    } catch (error) {
      logger.error('Error clearing cache:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
