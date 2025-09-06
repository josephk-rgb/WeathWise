import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interfaces
export interface ITransactionInfo {
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  description: string;
  type: 'income' | 'expense' | 'transfer' | 'investment';
  category: string;
  subcategory?: string;
  date: Date;
  processedDate?: Date;
}

export interface ICategorization {
  automatic: boolean;
  confidence?: number;
  userOverridden: boolean;
  suggestedCategories?: string[];
}

export interface ILocation {
  merchant: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ITransactionMetadata {
  tags: string[];
  notes?: string;
  receiptUrl?: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'monthly' | 'yearly';
    nextDate?: Date;
  };
  budgetId?: mongoose.Types.ObjectId;
}

export interface ITransactionAudit {
  source: 'manual' | 'import' | 'api' | 'csv';
  importBatchId?: string;
  modifiedBy?: mongoose.Types.ObjectId;
  modifiedAt?: Date;
}

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId;
  externalId?: string;
  transactionInfo: ITransactionInfo;
  categorization: ICategorization;
  location?: ILocation;
  metadata: ITransactionMetadata;
  audit: ITransactionAudit;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const TransactionSchema = new Schema<ITransaction>({
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
  externalId: {
    type: String,
    trim: true,
    sparse: true,
    index: true
  },
  transactionInfo: {
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: function(v: number) {
          return !isNaN(v) && isFinite(v) && v >= -1000000 && v <= 1000000;
        },
        message: 'Amount must be a valid number between -1,000,000 and 1,000,000'
      }
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
    originalAmount: {
      type: Number,
      validate: {
        validator: function(v: number) {
          return !v || (!isNaN(v) && isFinite(v));
        },
        message: 'Original amount must be a valid number'
      }
    },
    originalCurrency: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^[A-Z]{3}$/.test(v);
        },
        message: 'Original currency must be a 3-letter ISO code'
      }
    },
    exchangeRate: {
      type: Number,
      validate: {
        validator: function(v: number) {
          return !v || (v > 0 && !isNaN(v) && isFinite(v));
        },
        message: 'Exchange rate must be a positive number'
      }
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500
    },
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense', 'transfer', 'investment'],
      index: true
    },
    category: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
      index: true
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: 100
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    processedDate: {
      type: Date
    }
  },
  categorization: {
    automatic: {
      type: Boolean,
      default: false
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    userOverridden: {
      type: Boolean,
      default: false
    },
    suggestedCategories: [{
      type: String,
      trim: true
    }]
  },
  location: {
    merchant: {
      type: String,
      trim: true,
      maxlength: 200
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100
    },
    state: {
      type: String,
      trim: true,
      maxlength: 100
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },
  metadata: {
    tags: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    receiptUrl: {
      type: String,
      trim: true
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringPattern: {
      frequency: {
        type: String,
        enum: ['weekly', 'monthly', 'yearly']
      },
      nextDate: {
        type: Date
      }
    },
    budgetId: {
      type: Schema.Types.ObjectId,
      ref: 'Budget'
    }
  },
  audit: {
    source: {
      type: String,
      required: true,
      enum: ['manual', 'import', 'api', 'csv'],
      default: 'manual'
    },
    importBatchId: {
      type: String,
      trim: true
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  collection: 'transactions'
});

// Indexes for performance
TransactionSchema.index({ userId: 1, 'transactionInfo.date': -1 });
TransactionSchema.index({ userId: 1, 'transactionInfo.category': 1 });
TransactionSchema.index({ userId: 1, 'transactionInfo.type': 1, 'transactionInfo.date': -1 });
TransactionSchema.index({ accountId: 1, 'transactionInfo.date': -1 });
TransactionSchema.index({ externalId: 1 }, { sparse: true });
TransactionSchema.index({ 'transactionInfo.amount': 1 });
TransactionSchema.index({ 'location.merchant': 1 });

// Compound indexes for complex queries
TransactionSchema.index({ 
  userId: 1, 
  'transactionInfo.type': 1, 
  'transactionInfo.date': -1,
  'transactionInfo.category': 1 
});

// Pre-save middleware
TransactionSchema.pre('save', function(next) {
  // Ensure description is trimmed
  if (this.transactionInfo.description) {
    this.transactionInfo.description = this.transactionInfo.description.trim();
  }
  
  // Ensure category is trimmed
  if (this.transactionInfo.category) {
    this.transactionInfo.category = this.transactionInfo.category.trim();
  }
  
  // Set processed date if not set
  if (!this.transactionInfo.processedDate) {
    this.transactionInfo.processedDate = new Date();
  }
  
  // Set modified date in audit
  this.audit.modifiedAt = new Date();
  
  next();
});

// Virtual for formatted amount
TransactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.transactionInfo.currency
  }).format(this.transactionInfo.amount);
});

// Virtual for is positive/negative
TransactionSchema.virtual('isPositive').get(function() {
  return this.transactionInfo.amount >= 0;
});

// Virtual for transaction age in days
TransactionSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const transactionDate = this.transactionInfo.date;
  const diffTime = Math.abs(now.getTime() - transactionDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON output
TransactionSchema.set('toJSON', { virtuals: true });
TransactionSchema.set('toObject', { virtuals: true });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
