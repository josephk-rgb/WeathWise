import mongoose from 'mongoose';
import PhysicalAsset from '../models/PhysicalAsset';
import { NetWorthTracker } from './netWorthTracker';

export interface IAssetValuationHistory extends mongoose.Document {
  assetId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  value: number;
  valuationMethod: 'manual' | 'automated' | 'professional' | 'market_estimate';
  notes?: string;
  depreciation?: {
    rate: number;
    method: 'straight_line' | 'declining_balance';
  };
  createdAt: Date;
  updatedAt: Date;
}

// Create inline schema for asset valuation history
const AssetValuationHistorySchema = new mongoose.Schema({
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PhysicalAsset',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  valuationMethod: {
    type: String,
    enum: ['manual', 'automated', 'professional', 'market_estimate'],
    default: 'manual'
  },
  notes: String,
  depreciation: {
    rate: Number,
    method: {
      type: String,
      enum: ['straight_line', 'declining_balance']
    }
  }
}, {
  timestamps: true
});

AssetValuationHistorySchema.index({ assetId: 1, date: -1 });

const AssetValuationHistory = mongoose.model<IAssetValuationHistory>('AssetValuationHistory', AssetValuationHistorySchema);

export class AssetValuationService {
  static async updateAssetValue(
    assetId: mongoose.Types.ObjectId,
    newValue: number,
    method: 'manual' | 'automated' | 'professional' | 'market_estimate',
    notes?: string
  ): Promise<void> {
    try {
      const asset = await PhysicalAsset.findById(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      const previousValue = asset.currentValue;

      // Record valuation history
      await AssetValuationHistory.create({
        assetId,
        userId: asset.userId,
        date: new Date(),
        value: newValue,
        valuationMethod: method,
        notes
      });

      // Update asset
      asset.currentValue = newValue;
      asset.equity = newValue - (asset.loanInfo?.loanBalance || 0);
      asset.lastValuationDate = new Date();
      await asset.save();

      // Trigger net worth update if significant change
      const changeAmount = Math.abs(newValue - previousValue);
      if (changeAmount > 1000) {
        await NetWorthTracker.onSignificantEvent(
          asset.userId,
          'asset_revaluation',
          `${asset.name}: $${previousValue.toFixed(2)} → $${newValue.toFixed(2)}`
        );
      }

      console.log(`Asset ${asset.name} updated: $${previousValue.toFixed(2)} → $${newValue.toFixed(2)}`);
    } catch (error) {
      console.error('Error updating asset value:', error);
      throw error;
    }
  }

  static async calculateDepreciation(assetId: mongoose.Types.ObjectId): Promise<number> {
    try {
      const asset = await PhysicalAsset.findById(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      if (!asset.depreciationRate || !asset.purchaseDate || !asset.purchasePrice) {
        return asset.currentValue;
      }

      const now = new Date();
      const yearsOwned = (now.getTime() - asset.purchaseDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      
      // Calculate depreciated value using straight-line method
      const annualDepreciation = asset.purchasePrice * asset.depreciationRate;
      const totalDepreciation = annualDepreciation * yearsOwned;
      const depreciatedValue = asset.purchasePrice - totalDepreciation;
      
      // Floor at 10% of purchase price
      const floorValue = asset.purchasePrice * 0.1;
      
      return Math.max(depreciatedValue, floorValue);
    } catch (error) {
      console.error('Error calculating depreciation:', error);
      return 0;
    }
  }

  static async getAssetValuationHistory(
    assetId: mongoose.Types.ObjectId,
    limit: number = 10
  ): Promise<IAssetValuationHistory[]> {
    try {
      return await AssetValuationHistory.find({ assetId })
        .sort({ date: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error getting asset valuation history:', error);
      return [];
    }
  }

  static async updateAssetDepreciation(assetId: mongoose.Types.ObjectId): Promise<void> {
    try {
      const asset = await PhysicalAsset.findById(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      const depreciatedValue = await this.calculateDepreciation(assetId);
      
      // Only update if the depreciated value is significantly different
      const currentValue = asset.currentValue;
      const difference = Math.abs(depreciatedValue - currentValue);
      
      if (difference > currentValue * 0.05) { // 5% threshold
        await this.updateAssetValue(
          assetId,
          depreciatedValue,
          'automated',
          `Automated depreciation calculation: ${asset.depreciationRate * 100}% annual rate`
        );
      }
    } catch (error) {
      console.error('Error updating asset depreciation:', error);
    }
  }

  static async updateAllAssetDepreciation(): Promise<void> {
    try {
      const assetsWithDepreciation = await PhysicalAsset.find({
        isActive: true,
        depreciationRate: { $gt: 0 },
        purchaseDate: { $exists: true },
        purchasePrice: { $exists: true }
      });

      console.log(`Updating depreciation for ${assetsWithDepreciation.length} assets...`);

      for (const asset of assetsWithDepreciation) {
        await this.updateAssetDepreciation(asset._id as mongoose.Types.ObjectId);
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('Asset depreciation update completed');
    } catch (error) {
      console.error('Error updating all asset depreciation:', error);
    }
  }

  static async suggestAssetRevaluation(userId: mongoose.Types.ObjectId): Promise<any[]> {
    try {
      const assets = await PhysicalAsset.find({ userId, isActive: true });
      const suggestions = [];

      for (const asset of assets) {
        const daysSinceLastValuation = asset.lastValuationDate 
          ? (Date.now() - asset.lastValuationDate.getTime()) / (24 * 60 * 60 * 1000)
          : 365; // Assume 1 year if no valuation date

        let suggestionReason = '';
        let priority = 'low';

        // Real estate - suggest yearly revaluation
        if (asset.type === 'real_estate' && daysSinceLastValuation > 365) {
          suggestionReason = 'Real estate should be revalued annually';
          priority = 'high';
        }
        
        // Vehicles - suggest every 6 months
        else if (asset.type === 'vehicle' && daysSinceLastValuation > 180) {
          suggestionReason = 'Vehicle values change frequently, consider updating';
          priority = 'medium';
        }
        
        // Other assets - suggest yearly
        else if (daysSinceLastValuation > 365) {
          suggestionReason = 'Asset has not been revalued in over a year';
          priority = 'medium';
        }

        if (suggestionReason) {
          suggestions.push({
            assetId: asset._id,
            assetName: asset.name,
            assetType: asset.type,
            currentValue: asset.currentValue,
            lastValuationDate: asset.lastValuationDate,
            daysSinceLastValuation: Math.round(daysSinceLastValuation),
            suggestionReason,
            priority
          });
        }
      }

      return suggestions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      console.error('Error suggesting asset revaluation:', error);
      return [];
    }
  }
}
