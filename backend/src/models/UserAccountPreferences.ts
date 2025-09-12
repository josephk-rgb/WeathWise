import mongoose, { Schema, Document } from 'mongoose';

export interface AccountLinkingRule {
  pattern: string;
  accountId: string;
  confidence: number;
}

export interface UserAccountPreferencesInterface extends Document {
  userId: mongoose.Types.ObjectId;
  linkingRules: AccountLinkingRule[];
  defaultAccounts: {
    [category: string]: string; // category -> accountId mapping
  };
  autoLinkingEnabled: boolean;
  confidenceThreshold: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AccountLinkingRuleSchema = new Schema({
  pattern: {
    type: String,
    required: true,
    trim: true
  },
  accountId: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    default: 0.8
  }
}, { _id: false });

const UserAccountPreferencesSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  linkingRules: {
    type: [AccountLinkingRuleSchema],
    default: []
  },
  defaultAccounts: {
    type: Map,
    of: String,
    default: new Map()
  },
  autoLinkingEnabled: {
    type: Boolean,
    default: true
  },
  confidenceThreshold: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 1
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'userAccountPreferences'
});

// Indexes for performance
UserAccountPreferencesSchema.index({ userId: 1 });
UserAccountPreferencesSchema.index({ 'linkingRules.pattern': 1 });

// Update lastUpdated on save
UserAccountPreferencesSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Instance methods
UserAccountPreferencesSchema.methods.addLinkingRule = function(
  pattern: string, 
  accountId: string, 
  confidence: number = 0.8
) {
  // Remove existing rule with same pattern
  this.linkingRules = this.linkingRules.filter((rule: AccountLinkingRule) => 
    rule.pattern !== pattern
  );
  
  // Add new rule
  this.linkingRules.push({ pattern, accountId, confidence });
  return this.save();
};

UserAccountPreferencesSchema.methods.setDefaultAccount = function(
  category: string, 
  accountId: string
) {
  this.defaultAccounts.set(category, accountId);
  return this.save();
};

UserAccountPreferencesSchema.methods.getDefaultAccount = function(category: string): string | null {
  return this.defaultAccounts.get(category) || null;
};

UserAccountPreferencesSchema.methods.removeLinkingRule = function(pattern: string) {
  this.linkingRules = this.linkingRules.filter((rule: AccountLinkingRule) => 
    rule.pattern !== pattern
  );
  return this.save();
};

// Static methods
UserAccountPreferencesSchema.statics.findByUserId = function(userId: mongoose.Types.ObjectId) {
  return this.findOne({ userId });
};

UserAccountPreferencesSchema.statics.createDefault = function(userId: mongoose.Types.ObjectId) {
  return this.create({
    userId,
    linkingRules: [],
    defaultAccounts: new Map(),
    autoLinkingEnabled: true,
    confidenceThreshold: 0.7
  });
};

// Export the model
export const UserAccountPreferences = mongoose.model<UserAccountPreferencesInterface>(
  'UserAccountPreferences', 
  UserAccountPreferencesSchema
);
