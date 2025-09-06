import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interfaces
export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  category: string;
  priority: 'low' | 'medium' | 'high';
  currency: string;
  originalCurrency?: string;
  originalAmount?: number;
  isActive: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const GoalSchema = new Schema<IGoal>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  targetDate: {
    type: Date,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Emergency Fund', 'Vacation', 'Home Purchase', 'Car Purchase',
      'Education', 'Retirement', 'Technology', 'Healthcare',
      'Wedding', 'Business', 'Investment', 'Other'
    ]
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
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
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
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
GoalSchema.index({ userId: 1, isActive: 1 });
GoalSchema.index({ userId: 1, targetDate: 1 });
GoalSchema.index({ userId: 1, priority: 1 });

// Virtual to calculate progress percentage
GoalSchema.virtual('progress').get(function() {
  return this.targetAmount > 0 ? (this.currentAmount / this.targetAmount) * 100 : 0;
});

// Pre-save middleware to update completion status
GoalSchema.pre('save', function(next) {
  if (this.currentAmount >= this.targetAmount && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
  } else if (this.currentAmount < this.targetAmount && this.isCompleted) {
    this.isCompleted = false;
    this.completedAt = undefined;
  }
  next();
});

export const Goal = mongoose.model<IGoal>('Goal', GoalSchema);
