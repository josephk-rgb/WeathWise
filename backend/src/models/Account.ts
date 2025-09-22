import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interfaces
export interface IAccountProvider {
  name: string;
  id?: string;
  logo?: string;
}

export interface IAccountInfo {
  name: string;
  accountNumber: string;
  routingNumber?: string;
  balance: number;
  currency: string;
  lastSyncedAt?: Date;
}

export interface IConnectionStatus {
  isConnected: boolean;
  lastConnected?: Date;
  errorMessage?: string;
  provider: 'plaid' | 'yodlee' | 'manual';
}

export interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'checking' | 'savings' | 'investment' | 'retirement' | 'credit' | 'loan';
  provider: IAccountProvider;
  accountInfo: IAccountInfo;
  connectionStatus: IConnectionStatus;
  
  // Additional fields for asset tracking
  institutionName?: string;      // "Chase Bank", "Wells Fargo"
  accountPattern?: string;       // Last 4 digits for transaction matching
  balanceSource: 'manual' | 'transaction_derived';
  lastManualUpdate?: Date;
  
  // Account linking and categorization
  category?: 'primary_checking' | 'emergency_savings' | 'investment_cash';
  linkedGoalId?: mongoose.Types.ObjectId; // Link to savings goals
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const AccountSchema = new Schema<IAccount>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['checking', 'savings', 'investment', 'retirement', 'credit', 'loan'],
    index: true
  },
  provider: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    id: {
      type: String,
      trim: true
    },
    logo: {
      type: String,
      trim: true
    }
  },
  accountInfo: {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
      maxlength: 50
    },
    routingNumber: {
      type: String,
      trim: true,
      minlength: 9,
      maxlength: 9
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: function(v: number) {
          return !isNaN(v) && isFinite(v);
        },
        message: 'Balance must be a valid number'
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
    lastSyncedAt: {
      type: Date
    }
  },
  connectionStatus: {
    isConnected: {
      type: Boolean,
      default: false
    },
    lastConnected: {
      type: Date
    },
    errorMessage: {
      type: String,
      trim: true
    },
    provider: {
      type: String,
      enum: ['plaid', 'yodlee', 'manual'],
      default: 'manual'
    }
  },
  
  // Additional fields for asset tracking
  institutionName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  accountPattern: {
    type: String,
    trim: true,
    maxlength: 10
  },
  balanceSource: {
    type: String,
    enum: ['manual', 'transaction_derived'],
    default: 'manual'
  },
  lastManualUpdate: {
    type: Date
  },
  
  // Account linking and categorization
  category: {
    type: String,
    enum: ['primary_checking', 'emergency_savings', 'investment_cash'],
    trim: true
  },
  linkedGoalId: {
    type: Schema.Types.ObjectId,
    ref: 'Goal'
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'accounts'
});

// Indexes for performance
AccountSchema.index({ userId: 1, type: 1 });
AccountSchema.index({ userId: 1, isActive: 1 });
AccountSchema.index({ 'provider.name': 1 });
AccountSchema.index({ 'accountInfo.lastSyncedAt': -1 });

// Pre-save middleware
AccountSchema.pre('save', function(next) {
  // Ensure account name is trimmed
  if (this.accountInfo.name) {
    this.accountInfo.name = this.accountInfo.name.trim();
  }
  
  // Ensure provider name is trimmed
  if (this.provider.name) {
    this.provider.name = this.provider.name.trim();
  }
  
  next();
});

// Virtual for display name
AccountSchema.virtual('displayName').get(function() {
  return this.accountInfo.name || `${this.provider.name} ${this.type}`;
});

// Virtual for formatted balance
AccountSchema.virtual('formattedBalance').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.accountInfo.currency
  }).format(this.accountInfo.balance);
});

// Ensure virtuals are included in JSON output
AccountSchema.set('toJSON', { virtuals: true });
AccountSchema.set('toObject', { virtuals: true });

export const Account = mongoose.model<IAccount>('Account', AccountSchema);

export default Account;
