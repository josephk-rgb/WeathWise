import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interfaces
export interface ILoanInfo {
  loanBalance: number;
  monthlyPayment: number;
  lender: string;
  interestRate?: number;
}

export interface IDepreciation {
  rate: number;
  method: 'straight_line' | 'declining_balance';
}

export interface IPhysicalAsset extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'real_estate' | 'vehicle' | 'collectible' | 'jewelry' | 'other';
  name: string;
  currentValue: number;
  purchasePrice?: number;
  purchaseDate?: Date;
  description?: string;
  
  // For financed assets (houses with mortgages, cars with loans)
  loanInfo?: ILoanInfo;
  
  // Auto-calculated fields
  equity: number; // currentValue - loanBalance
  
  // Depreciation tracking
  depreciationRate?: number;
  lastValuationDate?: Date;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const PhysicalAssetSchema = new Schema<IPhysicalAsset>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['real_estate', 'vehicle', 'collectible', 'jewelry', 'other'],
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  currentValue: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v: number) {
        return !isNaN(v) && isFinite(v) && v >= 0;
      },
      message: 'Current value must be a valid positive number'
    }
  },
  purchasePrice: {
    type: Number,
    min: 0,
    validate: {
      validator: function(v: number) {
        return v === undefined || (!isNaN(v) && isFinite(v) && v >= 0);
      },
      message: 'Purchase price must be a valid positive number'
    }
  },
  purchaseDate: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return v === undefined || v <= new Date();
      },
      message: 'Purchase date cannot be in the future'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // For financed assets
  loanInfo: {
    loanBalance: {
      type: Number,
      min: 0,
      validate: {
        validator: function(v: number) {
          return !isNaN(v) && isFinite(v) && v >= 0;
        },
        message: 'Loan balance must be a valid positive number'
      }
    },
    monthlyPayment: {
      type: Number,
      min: 0,
      validate: {
        validator: function(v: number) {
          return !isNaN(v) && isFinite(v) && v >= 0;
        },
        message: 'Monthly payment must be a valid positive number'
      }
    },
    lender: {
      type: String,
      required: function() {
        return this.loanInfo && this.loanInfo.loanBalance > 0;
      },
      trim: true,
      maxlength: 100
    },
    interestRate: {
      type: Number,
      min: 0,
      max: 100,
      validate: {
        validator: function(v: number) {
          return v === undefined || (!isNaN(v) && isFinite(v) && v >= 0 && v <= 100);
        },
        message: 'Interest rate must be between 0 and 100'
      }
    }
  },
  
  // Auto-calculated equity
  equity: {
    type: Number,
    required: true,
    validate: {
      validator: function(v: number) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'Equity must be a valid number'
    }
  },
  
  // Depreciation tracking
  depreciationRate: {
    type: Number,
    min: 0,
    max: 1,
    validate: {
      validator: function(v: number) {
        return v === undefined || (!isNaN(v) && isFinite(v) && v >= 0 && v <= 1);
      },
      message: 'Depreciation rate must be between 0 and 1'
    }
  },
  lastValuationDate: {
    type: Date,
    default: Date.now
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'physicalassets'
});

// Indexes for performance
PhysicalAssetSchema.index({ userId: 1, type: 1 });
PhysicalAssetSchema.index({ userId: 1, isActive: 1 });
PhysicalAssetSchema.index({ lastValuationDate: -1 });

// Pre-save middleware to calculate equity
PhysicalAssetSchema.pre('save', function(next) {
  // Calculate equity
  const loanBalance = this.loanInfo?.loanBalance || 0;
  this.equity = this.currentValue - loanBalance;
  
  // Ensure name is trimmed
  if (this.name) {
    this.name = this.name.trim();
  }
  
  // Update last valuation date when current value changes
  if (this.isModified('currentValue')) {
    this.lastValuationDate = new Date();
  }
  
  next();
});

// Virtual for formatted current value
PhysicalAssetSchema.virtual('formattedCurrentValue').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.currentValue);
});

// Virtual for formatted equity
PhysicalAssetSchema.virtual('formattedEquity').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.equity);
});

// Virtual for loan-to-value ratio
PhysicalAssetSchema.virtual('loanToValueRatio').get(function() {
  if (!this.loanInfo?.loanBalance || this.currentValue === 0) {
    return 0;
  }
  return (this.loanInfo.loanBalance / this.currentValue) * 100;
});

// Ensure virtuals are included in JSON output
PhysicalAssetSchema.set('toJSON', { virtuals: true });
PhysicalAssetSchema.set('toObject', { virtuals: true });

export const PhysicalAsset = mongoose.model<IPhysicalAsset>('PhysicalAsset', PhysicalAssetSchema);

export default PhysicalAsset;
