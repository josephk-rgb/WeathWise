import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interfaces
export interface ISecurityInfo {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'mutual_fund' | 'bond' | 'crypto' | 'real_estate' | 'commodity';
  exchange?: string;
  currency: string;
  isin?: string;
  cusip?: string;
}

export interface IPosition {
  shares: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface IAcquisition {
  purchaseDate: Date;
  purchaseMethod: 'buy' | 'transfer' | 'dividend_reinvestment' | 'split';
  purchasePrice: number;
  fees?: number;
  brokerage?: string;
}

export interface IAnalytics {
  beta?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  expense_ratio?: number;
  sector?: string;
  industry?: string;
  marketCap?: number;
  lastAnalyzed?: Date;
}

export interface IAlert {
  priceTargets: Array<{
    type: 'above' | 'below';
    price: number;
    isActive: boolean;
    createdAt: Date;
  }>;
  percentageTargets: Array<{
    type: 'gain' | 'loss';
    percentage: number;
    isActive: boolean;
    createdAt: Date;
  }>;
}

export interface IInvestment extends Document {
  userId: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId;
  securityInfo: ISecurityInfo;
  position: IPosition;
  acquisition: IAcquisition;
  analytics: IAnalytics;
  alerts: IAlert;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const InvestmentSchema = new Schema<IInvestment>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  accountId: {
    type: Schema.Types.ObjectId,
    ref: 'Account',
    index: true
  },
  securityInfo: {
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 1,
      maxlength: 20,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200
    },
    type: {
      type: String,
      required: true,
      enum: ['stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'real_estate', 'commodity'],
      index: true
    },
    exchange: {
      type: String,
      trim: true,
      maxlength: 50
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      validate: {
        validator: function(v: string) {
          return /^[A-Z]{3}$/.test(v);
        },
        message: 'Currency must be a 3-letter ISO code'
      }
    },
    isin: {
      type: String,
      trim: true,
      maxlength: 12
    },
    cusip: {
      type: String,
      trim: true,
      maxlength: 9
    }
  },
  position: {
    shares: {
      type: Number,
      required: true,
      validate: {
        validator: function(v: number) {
          return !isNaN(v) && isFinite(v) && v > 0;
        },
        message: 'Shares must be a positive number'
      }
    },
    averageCost: {
      type: Number,
      required: true,
      validate: {
        validator: function(v: number) {
          return !isNaN(v) && isFinite(v) && v > 0;
        },
        message: 'Average cost must be a positive number'
      }
    },
    totalCost: {
      type: Number,
      required: true,
      validate: {
        validator: function(v: number) {
          return !isNaN(v) && isFinite(v) && v > 0;
        },
        message: 'Total cost must be a positive number'
      }
    },
    currentPrice: {
      type: Number,
      required: true,
      validate: {
        validator: function(v: number) {
          return !isNaN(v) && isFinite(v) && v >= 0;
        },
        message: 'Current price must be a non-negative number'
      }
    },
    marketValue: {
      type: Number,
      validate: {
        validator: function(v: number) {
          return !v || (!isNaN(v) && isFinite(v) && v >= 0);
        },
        message: 'Market value must be a non-negative number'
      }
    },
    gainLoss: {
      type: Number,
      validate: {
        validator: function(v: number) {
          return !v || (!isNaN(v) && isFinite(v));
        },
        message: 'Gain/loss must be a valid number'
      }
    },
    gainLossPercent: {
      type: Number,
      validate: {
        validator: function(v: number) {
          return !v || (!isNaN(v) && isFinite(v));
        },
        message: 'Gain/loss percentage must be a valid number'
      }
    },
    dayChange: {
      type: Number,
      required: true,
      validate: {
        validator: function(v: number) {
          return !isNaN(v) && isFinite(v);
        },
        message: 'Day change must be a valid number'
      }
    },
    dayChangePercent: {
      type: Number,
      required: true,
      validate: {
        validator: function(v: number) {
          return !isNaN(v) && isFinite(v);
        },
        message: 'Day change percentage must be a valid number'
      }
    }
  },
  acquisition: {
    purchaseDate: {
      type: Date,
      required: true,
      index: true
    },
    purchaseMethod: {
      type: String,
      required: true,
      enum: ['buy', 'transfer', 'dividend_reinvestment', 'split']
    },
    purchasePrice: {
      type: Number,
      required: true,
      validate: {
        validator: function(v: number) {
          return !isNaN(v) && isFinite(v) && v > 0;
        },
        message: 'Purchase price must be a positive number'
      }
    },
    fees: {
      type: Number,
      validate: {
        validator: function(v: number) {
          return !v || (!isNaN(v) && isFinite(v) && v >= 0);
        },
        message: 'Fees must be a non-negative number'
      }
    },
    brokerage: {
      type: String,
      trim: true,
      maxlength: 100
    }
  },
  analytics: {
    beta: {
      type: Number,
      validate: {
        validator: function(v: number) {
          return !v || (!isNaN(v) && isFinite(v));
        },
        message: 'Beta must be a valid number'
      }
    },
    pe_ratio: {
      type: Number,
      validate: {
        validator: function(v: number) {
          return !v || (!isNaN(v) && isFinite(v));
        },
        message: 'P/E ratio must be a valid number'
      }
    },
    dividend_yield: {
      type: Number,
      validate: {
        validator: function(v: number) {
          return !v || (!isNaN(v) && isFinite(v) && v >= 0);
        },
        message: 'Dividend yield must be a non-negative number'
      }
    },
    expense_ratio: {
      type: Number,
      validate: {
        validator: function(v: number) {
          return !v || (!isNaN(v) && isFinite(v) && v >= 0);
        },
        message: 'Expense ratio must be a non-negative number'
      }
    },
    sector: {
      type: String,
      trim: true,
      maxlength: 100
    },
    industry: {
      type: String,
      trim: true,
      maxlength: 100
    },
    marketCap: {
      type: Number,
      validate: {
        validator: function(v: number) {
          return !v || (!isNaN(v) && isFinite(v) && v >= 0);
        },
        message: 'Market cap must be a non-negative number'
      }
    },
    lastAnalyzed: {
      type: Date
    }
  },
  alerts: {
    priceTargets: [{
      type: {
        type: String,
        enum: ['above', 'below'],
        required: true
      },
      price: {
        type: Number,
        required: true,
        validate: {
          validator: function(v: number) {
            return !isNaN(v) && isFinite(v) && v > 0;
          },
          message: 'Price target must be a positive number'
        }
      },
      isActive: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    percentageTargets: [{
      type: {
        type: String,
        enum: ['gain', 'loss'],
        required: true
      },
      percentage: {
        type: Number,
        required: true,
        validate: {
          validator: function(v: number) {
            return !isNaN(v) && isFinite(v) && v > 0;
          },
          message: 'Percentage target must be a positive number'
        }
      },
      isActive: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'investments'
});

// Indexes for performance
InvestmentSchema.index({ userId: 1, 'securityInfo.symbol': 1 });
InvestmentSchema.index({ userId: 1, isActive: 1 });
InvestmentSchema.index({ 'securityInfo.type': 1, userId: 1 });
InvestmentSchema.index({ 'acquisition.purchaseDate': -1 });
InvestmentSchema.index({ 'position.marketValue': -1 });

// Compound indexes for complex queries
InvestmentSchema.index({ 
  userId: 1, 
  'securityInfo.type': 1, 
  isActive: 1,
  'position.marketValue': -1 
});

// Pre-save middleware
InvestmentSchema.pre('save', function(next) {
  // Ensure symbol is uppercase
  if (this.securityInfo.symbol) {
    this.securityInfo.symbol = this.securityInfo.symbol.toUpperCase();
  }
  
  // Ensure security name is trimmed
  if (this.securityInfo.name) {
    this.securityInfo.name = this.securityInfo.name.trim();
  }
  
  // Calculate market value if not set
  if (!this.position.marketValue) {
    this.position.marketValue = this.position.shares * this.position.currentPrice;
  }
  
  // Calculate gain/loss if not set
  if (!this.position.gainLoss) {
    this.position.gainLoss = this.position.marketValue - this.position.totalCost;
  }
  
  // Calculate gain/loss percentage if not set
  if (!this.position.gainLossPercent && this.position.totalCost > 0) {
    this.position.gainLossPercent = (this.position.gainLoss / this.position.totalCost) * 100;
  }
  
  next();
});

// Virtual for formatted values
InvestmentSchema.virtual('formattedMarketValue').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.securityInfo.currency
  }).format(this.position.marketValue);
});

InvestmentSchema.virtual('formattedGainLoss').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.securityInfo.currency
  }).format(this.position.gainLoss);
});

InvestmentSchema.virtual('formattedGainLossPercent').get(function() {
  return `${this.position.gainLossPercent.toFixed(2)}%`;
});

// Virtual for position status
InvestmentSchema.virtual('isProfitable').get(function() {
  return this.position.gainLoss > 0;
});

InvestmentSchema.virtual('isLosing').get(function() {
  return this.position.gainLoss < 0;
});

// Virtual for holding period
InvestmentSchema.virtual('holdingPeriodDays').get(function() {
  const now = new Date();
  const purchaseDate = this.acquisition.purchaseDate;
  const diffTime = Math.abs(now.getTime() - purchaseDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON output
InvestmentSchema.set('toJSON', { virtuals: true });
InvestmentSchema.set('toObject', { virtuals: true });

export const Investment = mongoose.model<IInvestment>('Investment', InvestmentSchema);

export default Investment;
