import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interfaces
export interface IAccountBalanceHistory extends Document {
  accountId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  balance: number;
  changeType: 'manual_update' | 'transaction_link' | 'interest' | 'fee' | 'initial' | 'goal_allocation' | 'goal_withdrawal';
  changeAmount: number; // Positive or negative change
  previousBalance: number;
  description?: string;
  
  // Additional metadata
  transactionId?: mongoose.Types.ObjectId; // If change was due to transaction
  goalId?: mongoose.Types.ObjectId; // If change was due to goal allocation
  metadata?: {
    interestRate?: number; // For interest changes
    feeType?: string; // For fee changes
    source?: string; // Additional context
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const AccountBalanceHistorySchema = new Schema<IAccountBalanceHistory>({
  accountId: {
    type: Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true
  },
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
  balance: {
    type: Number,
    required: true,
    validate: {
      validator: function(v: number) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'Balance must be a valid number'
    }
  },
  changeType: {
    type: String,
    required: true,
    enum: ['manual_update', 'transaction_link', 'interest', 'fee', 'initial', 'goal_allocation', 'goal_withdrawal'],
    index: true
  },
  changeAmount: {
    type: Number,
    required: true,
    validate: {
      validator: function(v: number) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'Change amount must be a valid number'
    }
  },
  previousBalance: {
    type: Number,
    required: true,
    validate: {
      validator: function(v: number) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'Previous balance must be a valid number'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Additional metadata
  transactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  goalId: {
    type: Schema.Types.ObjectId,
    ref: 'Goal'
  },
  metadata: {
    interestRate: {
      type: Number,
      min: 0,
      max: 100
    },
    feeType: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true,
  collection: 'accountbalancehistory'
});

// Indexes for performance and queries
AccountBalanceHistorySchema.index({ userId: 1, date: -1 });
AccountBalanceHistorySchema.index({ accountId: 1, date: -1 });
AccountBalanceHistorySchema.index({ userId: 1, accountId: 1, date: -1 });
AccountBalanceHistorySchema.index({ changeType: 1, date: -1 });
AccountBalanceHistorySchema.index({ transactionId: 1 });
AccountBalanceHistorySchema.index({ goalId: 1 });

// Compound index for balance trend analysis
AccountBalanceHistorySchema.index({ userId: 1, accountId: 1, changeType: 1, date: -1 });

// Virtual to calculate balance change percentage
AccountBalanceHistorySchema.virtual('changePercentage').get(function() {
  if (this.previousBalance === 0) return 0;
  return ((this.changeAmount / this.previousBalance) * 100);
});

// Virtual to check if this was a significant change
AccountBalanceHistorySchema.virtual('isSignificantChange').get(function() {
  const significantThreshold = 1000; // $1000 or more
  return Math.abs(this.changeAmount) >= significantThreshold;
});

// Pre-save middleware to validate balance consistency
AccountBalanceHistorySchema.pre('save', function(next) {
  // Validate that previousBalance + changeAmount = balance
  const expectedBalance = this.previousBalance + this.changeAmount;
  if (Math.abs(expectedBalance - this.balance) > 0.01) { // Allow for rounding errors
    return next(new Error(`Balance inconsistency: ${this.previousBalance} + ${this.changeAmount} ≠ ${this.balance}`));
  }
  next();
});

// Static method to get balance history for an account
AccountBalanceHistorySchema.statics.getAccountHistory = function(
  accountId: mongoose.Types.ObjectId,
  startDate?: Date,
  endDate?: Date
) {
  const query: any = { accountId };
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }
  
  return this.find(query).sort({ date: -1 });
};

// Static method to get balance trend for an account
AccountBalanceHistorySchema.statics.getBalanceTrend = function(
  accountId: mongoose.Types.ObjectId,
  days: number = 30
) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.find({
    accountId,
    date: { $gte: startDate }
  }).sort({ date: 1 });
};

// Static method to get total interest earned
AccountBalanceHistorySchema.statics.getTotalInterest = function(
  userId: mongoose.Types.ObjectId,
  startDate?: Date,
  endDate?: Date
) {
  const query: any = { 
    userId, 
    changeType: 'interest' 
  };
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: query },
    { $group: { _id: null, totalInterest: { $sum: '$changeAmount' } } }
  ]);
};

export const AccountBalanceHistory = mongoose.model<IAccountBalanceHistory>('AccountBalanceHistory', AccountBalanceHistorySchema);