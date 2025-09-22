import { Request, Response } from 'express';
import { PhysicalAsset, IPhysicalAsset } from '../models';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export class PhysicalAssetController {
  /**
   * Create a new physical asset
   */
  static async createAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const assetData = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      // Validate required fields
      if (!assetData.type || !assetData.name || typeof assetData.currentValue !== 'number') {
        res.status(400).json({ 
          error: 'Missing required asset information',
          required: ['type', 'name', 'currentValue']
        });
        return;
      }
      
      // Calculate equity if loan information provided
      let equity = assetData.currentValue;
      if (assetData.loanInfo?.loanBalance) {
        equity = assetData.currentValue - assetData.loanInfo.loanBalance;
      }
      
      const asset = new PhysicalAsset({
        userId: new mongoose.Types.ObjectId(userId),
        type: assetData.type,
        name: assetData.name,
        currentValue: assetData.currentValue,
        purchasePrice: assetData.purchasePrice,
        purchaseDate: assetData.purchaseDate,
        description: assetData.description,
        loanInfo: assetData.loanInfo,
        equity: equity,
        depreciationRate: assetData.depreciationRate,
        lastValuationDate: new Date(),
        isActive: true
      });
      
      await asset.save();
      
      logger.info(`Physical asset created: ${asset._id} for user: ${userId}`);
      
      res.status(201).json({
        success: true,
        data: asset,
        message: 'Physical asset created successfully'
      });
    } catch (error) {
      logger.error('Error creating physical asset:', error);
      
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
   * Get all physical assets for the authenticated user
   */
  static async getAssets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { type } = req.query;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      const filter: any = { 
        userId: new mongoose.Types.ObjectId(userId), 
        isActive: true 
      };
      
      if (type) filter.type = type;
      
      const assets = await PhysicalAsset.find(filter)
        .sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: assets,
        count: assets.length
      });
    } catch (error) {
      logger.error('Error fetching physical assets:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Get assets by type
   */
  static async getAssetsByType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { type } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      const assets = await PhysicalAsset.find({ 
        userId: new mongoose.Types.ObjectId(userId), 
        type,
        isActive: true 
      }).sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: assets,
        count: assets.length
      });
    } catch (error) {
      logger.error('Error fetching assets by type:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Update physical asset
   */
  static async updateAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const updateData = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      const asset = await PhysicalAsset.findOne({ 
        _id: id, 
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true 
      });
      
      if (!asset) {
        res.status(404).json({ error: 'Physical asset not found' });
        return;
      }
      
      // Update allowed fields
      if (updateData.name !== undefined) {
        asset.name = updateData.name;
      }
      if (updateData.currentValue !== undefined) {
        asset.currentValue = updateData.currentValue;
        asset.lastValuationDate = new Date();
      }
      if (updateData.description !== undefined) {
        asset.description = updateData.description;
      }
      if (updateData.loanInfo !== undefined) {
        asset.loanInfo = updateData.loanInfo;
      }
      if (updateData.depreciationRate !== undefined) {
        asset.depreciationRate = updateData.depreciationRate;
      }
      
      // Recalculate equity (pre-save middleware will handle this, but we can be explicit)
      const loanBalance = asset.loanInfo?.loanBalance || 0;
      asset.equity = asset.currentValue - loanBalance;
      
      await asset.save();
      
      res.json({
        success: true,
        data: asset,
        message: 'Physical asset updated successfully'
      });
    } catch (error) {
      logger.error('Error updating physical asset:', error);
      
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
   * Update asset valuation
   */
  static async updateAssetValuation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { currentValue, description } = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      if (typeof currentValue !== 'number' || !isFinite(currentValue) || currentValue < 0) {
        res.status(400).json({ error: 'Invalid current value' });
        return;
      }
      
      const asset = await PhysicalAsset.findOne({ 
        _id: id, 
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true 
      });
      
      if (!asset) {
        res.status(404).json({ error: 'Physical asset not found' });
        return;
      }
      
      const previousValue = asset.currentValue;
      const changeAmount = currentValue - previousValue;
      
      // Update asset valuation
      asset.currentValue = currentValue;
      asset.lastValuationDate = new Date();
      
      // Recalculate equity
      const loanBalance = asset.loanInfo?.loanBalance || 0;
      asset.equity = currentValue - loanBalance;
      
      await asset.save();
      
      logger.info(`Asset valuation updated: ${asset._id}, ${previousValue} → ${currentValue}`);
      
      res.json({
        success: true,
        data: asset,
        change: {
          previous: previousValue,
          current: currentValue,
          amount: changeAmount
        },
        message: 'Asset valuation updated successfully'
      });
    } catch (error) {
      logger.error('Error updating asset valuation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Delete (deactivate) a physical asset
   */
  static async deleteAsset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      const asset = await PhysicalAsset.findOne({ 
        _id: id, 
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true 
      });
      
      if (!asset) {
        res.status(404).json({ error: 'Physical asset not found' });
        return;
      }
      
      // Soft delete - mark as inactive
      asset.isActive = false;
      await asset.save();
      
      logger.info(`Physical asset deleted: ${asset._id} for user: ${userId}`);
      
      res.json({
        success: true,
        message: 'Physical asset deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting physical asset:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Get asset summary statistics
   */
  static async getAssetSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      const assets = await PhysicalAsset.find({ 
        userId: new mongoose.Types.ObjectId(userId), 
        isActive: true 
      });
      
      const summary = {
        totalValue: 0,
        totalEquity: 0,
        totalDebt: 0,
        assetCount: assets.length,
        byType: {} as Record<string, { count: number; value: number; equity: number; debt: number }>
      };
      
      assets.forEach(asset => {
        const loanBalance = asset.loanInfo?.loanBalance || 0;
        
        summary.totalValue += asset.currentValue;
        summary.totalEquity += asset.equity;
        summary.totalDebt += loanBalance;
        
        if (!summary.byType[asset.type]) {
          summary.byType[asset.type] = { count: 0, value: 0, equity: 0, debt: 0 };
        }
        
        summary.byType[asset.type].count += 1;
        summary.byType[asset.type].value += asset.currentValue;
        summary.byType[asset.type].equity += asset.equity;
        summary.byType[asset.type].debt += loanBalance;
      });
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error fetching asset summary:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default PhysicalAssetController;
