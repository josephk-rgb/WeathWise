import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// TypeScript interfaces
export interface IUserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  dateOfBirth?: Date;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface IUserPreferences {
  currency: string;
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    trading: boolean;
    news: boolean;
  };
}

export interface IRiskProfile {
  level: 'conservative' | 'moderate' | 'aggressive';
  questionnaire: {
    age: number;
    experience: string;
    timeline: string;
    riskTolerance: number; // 1-10 scale
    completedAt: Date;
  };
}

export interface ISubscription {
  plan: 'free' | 'premium' | 'enterprise';
  startDate: Date;
  endDate?: Date;
  features?: string[];
}

export interface IEncryption {
  keyId: string;
  algorithm: string;
  version: number;
}

export interface IUserMetadata {
  lastLogin: Date;
  loginCount: number;
  ipAddress?: string;
  userAgent?: string;
  onboardingCompleted: boolean;
  tosAcceptedAt?: Date;
  privacyPolicyAcceptedAt?: Date;
}

export interface IUser extends Document {
  auth0Id: string;
  email: string;
  profile: IUserProfile;
  preferences: IUserPreferences;
  riskProfile: IRiskProfile;
  subscription: ISubscription;
  encryption: IEncryption;
  metadata: IUserMetadata;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const UserSchema = new Schema<IUser>({
  auth0Id: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^auth0\|[a-zA-Z0-9]+$/.test(v);
      },
      message: 'Invalid Auth0 ID format'
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50
    },
    avatar: {
      type: String,
      trim: true
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function(v: Date) {
          return !v || v < new Date();
        },
        message: 'Date of birth cannot be in the future'
      }
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      street: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        trim: true
      },
      state: {
        type: String,
        trim: true
      },
      zipCode: {
        type: String,
        trim: true
      },
      country: {
        type: String,
        trim: true,
        default: 'US'
      }
    }
  },
  preferences: {
    currency: {
      type: String,
      default: 'USD',
      validate: {
        validator: function(v: string) {
          return /^[A-Z]{3}$/.test(v);
        },
        message: 'Currency must be a 3-letter ISO code'
      }
    },
    timezone: {
      type: String,
      default: 'America/New_York'
    },
    language: {
      type: String,
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      trading: {
        type: Boolean,
        default: true
      },
      news: {
        type: Boolean,
        default: true
      }
    }
  },
  riskProfile: {
    level: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      default: 'moderate'
    },
    questionnaire: {
      age: {
        type: Number,
        min: 18,
        max: 120
      },
      experience: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert']
      },
      timeline: {
        type: String,
        enum: ['short_term', 'medium_term', 'long_term', 'retirement']
      },
      riskTolerance: {
        type: Number,
        min: 1,
        max: 10
      },
      completedAt: {
        type: Date
      }
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    features: [{
      type: String
    }]
  },
  encryption: {
    keyId: {
      type: String,
      default: () => uuidv4()
    },
    algorithm: {
      type: String,
      default: 'AES-256-GCM'
    },
    version: {
      type: Number,
      default: 1
    }
  },
  metadata: {
    lastLogin: {
      type: Date,
      default: Date.now
    },
    loginCount: {
      type: Number,
      default: 0
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    onboardingCompleted: {
      type: Boolean,
      default: false
    },
    tosAcceptedAt: {
      type: Date
    },
    privacyPolicyAcceptedAt: {
      type: Date
    }
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  collection: 'users'
});

// Additional indexes for performance (avoiding duplicates with schema-level indexes)
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'metadata.lastLogin': -1 });
UserSchema.index({ 'subscription.plan': 1 });
UserSchema.index({ 'riskProfile.level': 1 });

// Pre-save middleware
UserSchema.pre('save', function(next) {
  // Ensure email is lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  
  next();
});

export const User = mongoose.model<IUser>('User', UserSchema);

export default User;
