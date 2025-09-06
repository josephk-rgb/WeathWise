import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interfaces
export interface IBudget extends Document {
  userId: mongoose.Types.ObjectId;
  category: string;
  allocated: number;
  spent: number;
  month: string; // Format: "YYYY-MM"
  year: number;
  currency: string;
  originalCurrency?: string;
  originalAmount?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const BudgetSchema = new Schema<IBudget>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: [
      'Housing', 'Transportation', 'Food', 'Utilities', 'Insurance',
      'Healthcare', 'Savings', 'Personal', 'Recreation', 'Miscellaneous',
      'Education', 'Clothing', 'Technology', 'Travel', 'Business',
      'Gifts', 'Charity', 'Debt Payments', 'Emergency Fund', 'Other'
    ]
  },
  allocated: {
    type: Number,
    required: true,
    min: 0
  },
  spent: {
    type: Number,
    default: 0,
    min: 0
  },
  month: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}$/
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2100
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
  isActive: {
    type: Boolean,
    default: true
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
BudgetSchema.index({ userId: 1, month: 1, category: 1 }, { unique: true });
BudgetSchema.index({ userId: 1, year: 1 });
BudgetSchema.index({ userId: 1, isActive: 1 });

// Virtual to calculate remaining budget
BudgetSchema.virtual('remaining').get(function() {
  return this.allocated - this.spent;
});

// Virtual to calculate percentage used
BudgetSchema.virtual('percentUsed').get(function() {
  return this.allocated > 0 ? (this.spent / this.allocated) * 100 : 0;
});

// Virtual to check if over budget
BudgetSchema.virtual('isOverBudget').get(function() {
  return this.spent > this.allocated;
});

export const Budget = mongoose.model<IBudget>('Budget', BudgetSchema);
