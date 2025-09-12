import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interface
export interface IAccountBalanceHistory extends Document {
  accountId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  balance: number;
  changeType: 'manual_update' | 'transaction_link' | 'interest' | 'fee' | 'initial';
  changeAmount: number;
  previousBalance: number;
  description?: string;
  createdAt: Date;
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
    default: Date.now,
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
    enum: ['manual_update', 'transaction_link', 'interest', 'fee', 'initial'],
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
    maxlength: 255
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'accountbalancehistory'
});

// Indexes for performance
AccountBalanceHistorySchema.index({ accountId: 1, date: -1 });
AccountBalanceHistorySchema.index({ userId: 1, date: -1 });
AccountBalanceHistorySchema.index({ userId: 1, changeType: 1 });

// Virtual for formatted balance
AccountBalanceHistorySchema.virtual('formattedBalance').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.balance);
});

// Virtual for formatted change amount
AccountBalanceHistorySchema.virtual('formattedChangeAmount').get(function() {
  const sign = this.changeAmount >= 0 ? '+' : '';
  return sign + new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.changeAmount);
});

// Ensure virtuals are included in JSON output
AccountBalanceHistorySchema.set('toJSON', { virtuals: true });
AccountBalanceHistorySchema.set('toObject', { virtuals: true });

export const AccountBalanceHistory = mongoose.model<IAccountBalanceHistory>('AccountBalanceHistory', AccountBalanceHistorySchema);

export default AccountBalanceHistory;
