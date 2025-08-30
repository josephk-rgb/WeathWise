import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interfaces
export interface IDebtPayment {
  amount: number;
  paymentDate: Date;
  currency: string;
  originalCurrency?: string;
  originalAmount?: number;
}

export interface IDebt extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  totalAmount: number;
  remainingBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: Date;
  type: 'credit_card' | 'loan' | 'mortgage' | 'student_loan' | 'other';
  currency: string;
  originalCurrency?: string;
  originalAmount?: number;
  paymentHistory: IDebtPayment[];
  isActive: boolean;
  isPaidOff: boolean;
  paidOffAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Payment sub-schema
const DebtPaymentSchema = new Schema<IDebtPayment>({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentDate: {
    type: Date,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true
  },
  originalCurrency: {
    type: String,
    uppercase: true
  },
  originalAmount: {
    type: Number,
    min: 0
  }
}, { _id: true });

// Main Debt Schema
const DebtSchema = new Schema<IDebt>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  remainingBalance: {
    type: Number,
    required: true,
    min: 0
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  minimumPayment: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['credit_card', 'loan', 'mortgage', 'student_loan', 'other']
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true
  },
  originalCurrency: {
    type: String,
    uppercase: true
  },
  originalAmount: {
    type: Number,
    min: 0
  },
  paymentHistory: [DebtPaymentSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  isPaidOff: {
    type: Boolean,
    default: false
  },
  paidOffAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
DebtSchema.index({ userId: 1, isActive: 1 });
DebtSchema.index({ userId: 1, dueDate: 1 });
DebtSchema.index({ userId: 1, type: 1 });

// Virtual to calculate total paid
DebtSchema.virtual('totalPaid').get(function() {
  return this.totalAmount - this.remainingBalance;
});

// Virtual to calculate payoff percentage
DebtSchema.virtual('payoffPercentage').get(function() {
  return this.totalAmount > 0 ? ((this.totalAmount - this.remainingBalance) / this.totalAmount) * 100 : 0;
});

// Virtual to calculate estimated payoff time (in months)
DebtSchema.virtual('estimatedPayoffMonths').get(function() {
  if (this.minimumPayment <= 0 || this.remainingBalance <= 0) return 0;
  
  const monthlyRate = this.interestRate / 100 / 12;
  if (monthlyRate === 0) {
    return Math.ceil(this.remainingBalance / this.minimumPayment);
  }
  
  return Math.ceil(
    -Math.log(1 - (this.remainingBalance * monthlyRate) / this.minimumPayment) / 
    Math.log(1 + monthlyRate)
  );
});

// Pre-save middleware to update paid off status
DebtSchema.pre('save', function(next) {
  if (this.remainingBalance <= 0 && !this.isPaidOff) {
    this.isPaidOff = true;
    this.paidOffAt = new Date();
    this.remainingBalance = 0;
  } else if (this.remainingBalance > 0 && this.isPaidOff) {
    this.isPaidOff = false;
    this.paidOffAt = undefined;
  }
  next();
});

export const Debt = mongoose.model<IDebt>('Debt', DebtSchema);
