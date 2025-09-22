import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyPrice extends Document {
  symbol: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyPriceSchema = new Schema<IDailyPrice>({
  symbol: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  open: {
    type: Number,
    required: true,
    validate: {
      validator: function(v: number) {
        return !isNaN(v) && isFinite(v) && v > 0;
      },
      message: 'Open price must be a positive number'
    }
  },
  high: {
    type: Number,
    required: true,
    validate: {
      validator: function(v: number) {
        return !isNaN(v) && isFinite(v) && v > 0;
      },
      message: 'High price must be a positive number'
    }
  },
  low: {
    type: Number,
    required: true,
    validate: {
      validator: function(v: number) {
        return !isNaN(v) && isFinite(v) && v > 0;
      },
      message: 'Low price must be a positive number'
    }
  },
  close: {
    type: Number,
    required: true,
    validate: {
      validator: function(v: number) {
        return !isNaN(v) && isFinite(v) && v > 0;
      },
      message: 'Close price must be a positive number'
    }
  },
  volume: {
    type: Number,
    required: true,
    validate: {
      validator: function(v: number) {
        return !isNaN(v) && isFinite(v) && v >= 0;
      },
      message: 'Volume must be a non-negative number'
    }
  },
  adjustedClose: {
    type: Number,
    validate: {
      validator: function(v: number) {
        return !v || (!isNaN(v) && isFinite(v) && v > 0);
      },
      message: 'Adjusted close price must be a positive number'
    }
  },
  source: {
    type: String,
    required: true,
    default: 'yahoo_finance',
    enum: ['yahoo_finance', 'alpha_vantage', 'manual']
  }
}, {
  timestamps: true,
  collection: 'daily_prices'
});

// Compound indexes for efficient querying
DailyPriceSchema.index({ symbol: 1, date: 1 }, { unique: true });
DailyPriceSchema.index({ date: 1, symbol: 1 });
DailyPriceSchema.index({ symbol: 1, date: -1 });

// Pre-save middleware
DailyPriceSchema.pre('save', function(next) {
  // Ensure symbol is uppercase
  if (this.symbol) {
    this.symbol = this.symbol.toUpperCase();
  }
  
  // Ensure date is at start of day (00:00:00)
  if (this.date) {
    this.date = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate());
  }
  
  next();
});

// Virtual for formatted price
DailyPriceSchema.virtual('formattedClose').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.close);
});

// Static method to get latest price for a symbol
DailyPriceSchema.statics.getLatestPrice = function(symbol: string) {
  return this.findOne({ symbol: symbol.toUpperCase() })
    .sort({ date: -1 })
    .limit(1);
};

// Static method to get price range for a symbol
DailyPriceSchema.statics.getPriceRange = function(symbol: string, startDate: Date, endDate: Date) {
  return this.find({
    symbol: symbol.toUpperCase(),
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
};

// Ensure virtuals are included in JSON output
DailyPriceSchema.set('toJSON', { virtuals: true });
DailyPriceSchema.set('toObject', { virtuals: true });

export const DailyPrice = mongoose.model<IDailyPrice>('DailyPrice', DailyPriceSchema);
export default DailyPrice;
