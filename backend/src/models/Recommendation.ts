import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interfaces
export interface IRecommendation extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'investment' | 'budget' | 'savings' | 'debt' | 'goal' | 'risk';
  title: string;
  description: string;
  confidence: number; // 0-100
  reasoning: string[];
  actionItems: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  potentialImpact?: {
    financial: number; // Estimated financial impact
    timeframe: string; // e.g., "3 months", "1 year"
    riskLevel: 'low' | 'medium' | 'high';
  };
  isViewed: boolean;
  isAccepted?: boolean;
  isImplemented?: boolean;
  implementedAt?: Date;
  expiresAt?: Date;
  metadata?: any; // For storing type-specific data
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const RecommendationSchema = new Schema<IRecommendation>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['investment', 'budget', 'savings', 'debt', 'goal', 'risk']
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  reasoning: [{
    type: String,
    trim: true,
    maxlength: 500
  }],
  actionItems: [{
    type: String,
    trim: true,
    maxlength: 300
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    trim: true
  },
  potentialImpact: {
    financial: {
      type: Number
    },
    timeframe: {
      type: String,
      trim: true
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  },
  isViewed: {
    type: Boolean,
    default: false
  },
  isAccepted: {
    type: Boolean
  },
  isImplemented: {
    type: Boolean,
    default: false
  },
  implementedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  metadata: {
    type: Schema.Types.Mixed
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
RecommendationSchema.index({ userId: 1, type: 1 });
RecommendationSchema.index({ userId: 1, priority: 1 });
RecommendationSchema.index({ userId: 1, isViewed: 1 });
RecommendationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RecommendationSchema.index({ createdAt: -1 });

// Virtual to check if recommendation is expired
RecommendationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Virtual to calculate age in days
RecommendationSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

export const Recommendation = mongoose.model<IRecommendation>('Recommendation', RecommendationSchema);
