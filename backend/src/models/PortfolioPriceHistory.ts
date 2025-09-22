import mongoose, { Document, Schema } from 'mongoose';

export interface IPortfolioPriceHistory extends Document {
  symbol: string;
  date: Date;
  price: number;
  volume?: number;
  source: 'yahoo_finance' | 'manual' | 'interpolated';
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioPriceHistorySchema = new Schema<IPortfolioPriceHistory>({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  volume: {
    type: Number,
    min: 0
  },
  source: {
    type: String,
    enum: ['yahoo_finance', 'manual', 'interpolated'],
    default: 'yahoo_finance'
  }
}, {
  timestamps: true
});

// Compound index for efficient price lookups
PortfolioPriceHistorySchema.index({ symbol: 1, date: -1 });

const PortfolioPriceHistory = mongoose.model<IPortfolioPriceHistory>('PortfolioPriceHistory', PortfolioPriceHistorySchema);

export { PortfolioPriceHistory };
export default PortfolioPriceHistory;
