import mongoose, { Document, Schema } from 'mongoose';

export interface INetWorthMilestone extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  trigger: 'transaction' | 'investment_update' | 'manual_update' | 'monthly_snapshot' | 'daily_snapshot' | 'account_balance_change' | 'trend_calculation';
  netWorth: number;
  breakdown: {
    liquidAssets: number;
    portfolioValue: number;
    physicalAssets: number;
    totalLiabilities: number;
  };
  metadata?: {
    triggerDetails?: string;
    priceSnapshot?: Array<{ symbol: string; price: number }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NetWorthMilestoneSchema = new Schema<INetWorthMilestone>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  trigger: {
    type: String,
    enum: ['transaction', 'investment_update', 'manual_update', 'monthly_snapshot', 'daily_snapshot', 'account_balance_change', 'trend_calculation'],
    required: true
  },
  netWorth: {
    type: Number,
    required: true
  },
  breakdown: {
    liquidAssets: { type: Number, required: true },
    portfolioValue: { type: Number, required: true },
    physicalAssets: { type: Number, required: true },
    totalLiabilities: { type: Number, required: true }
  },
  metadata: {
    triggerDetails: String,
    priceSnapshot: [{
      symbol: String,
      price: Number
    }]
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
NetWorthMilestoneSchema.index({ userId: 1, date: -1 });

const NetWorthMilestone = mongoose.model<INetWorthMilestone>('NetWorthMilestone', NetWorthMilestoneSchema);

export { NetWorthMilestone };
export default NetWorthMilestone;
