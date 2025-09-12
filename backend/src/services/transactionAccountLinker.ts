import mongoose from 'mongoose';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { UserAccountPreferences } from '../models/UserAccountPreferences';

export interface AccountLinkingRule {
  pattern: string;
  accountId: string;
  confidence: number;
}

export interface LinkingResult {
  accountId: string | null;
  confidence: number;
  method: 'exact_match' | 'pattern_match' | 'merchant_history' | 'manual' | 'default';
  suggestions?: string[];
}

export class TransactionAccountLinker {
  /**
   * Links a transaction to the most appropriate account based on:
   * 1. User preferences and rules
   * 2. Historical transaction patterns
   * 3. Merchant/description matching
   * 4. Default account fallback
   */
  static async linkTransactionToAccount(
    userId: mongoose.Types.ObjectId,
    transactionData: {
      description: string;
      merchant?: string;
      amount: number;
      category?: string;
    }
  ): Promise<LinkingResult> {
    try {
      // 1. Check user-defined rules first
      const userPreferences = await UserAccountPreferences.findOne({ userId });
      if (userPreferences) {
        const ruleMatch = this.checkUserRules(transactionData, userPreferences.linkingRules);
        if (ruleMatch.confidence > 0.8) {
          return ruleMatch;
        }
      }

      // 2. Check historical patterns
      const historyMatch = await this.checkHistoricalPatterns(userId, transactionData);
      if (historyMatch.confidence > 0.7) {
        return historyMatch;
      }

      // 3. Use default account preferences
      if (userPreferences?.defaultAccounts) {
        const categoryDefault = this.getDefaultAccountByCategory(
          transactionData.category,
          userPreferences.defaultAccounts
        );
        if (categoryDefault) {
          return {
            accountId: categoryDefault,
            confidence: 0.6,
            method: 'default'
          };
        }
      }

      // 4. Fallback to primary checking account
      const primaryAccount = await Account.findOne({
        userId,
        type: 'checking',
        isActive: true
      }).sort({ createdAt: 1 });

      return {
        accountId: primaryAccount?._id?.toString() || null,
        confidence: 0.3,
        method: 'default'
      };

    } catch (error) {
      console.error('Error linking transaction to account:', error);
      return {
        accountId: null,
        confidence: 0,
        method: 'manual'
      };
    }
  }

  /**
   * Check user-defined linking rules
   */
  private static checkUserRules(
    transactionData: { description: string; merchant?: string },
    rules: AccountLinkingRule[]
  ): LinkingResult {
    for (const rule of rules) {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(transactionData.description) || 
          (transactionData.merchant && regex.test(transactionData.merchant))) {
        return {
          accountId: rule.accountId,
          confidence: rule.confidence,
          method: 'exact_match'
        };
      }
    }

    return {
      accountId: null,
      confidence: 0,
      method: 'manual'
    };
  }

  /**
   * Check historical transaction patterns
   */
  private static async checkHistoricalPatterns(
    userId: mongoose.Types.ObjectId,
    transactionData: { description: string; merchant?: string }
  ): Promise<LinkingResult> {
    try {
      // Look for similar transactions in the last 90 days
      const lookupDate = new Date();
      lookupDate.setDate(lookupDate.getDate() - 90);

      const searchPatterns = [
        transactionData.merchant,
        transactionData.description.split(' ').slice(0, 3).join(' '), // First 3 words
      ].filter(Boolean);

      for (const pattern of searchPatterns) {
        const historicalTransactions = await Transaction.find({
          userId,
          $or: [
            { 'details.description': { $regex: pattern, $options: 'i' } },
            { 'details.merchant': { $regex: pattern, $options: 'i' } }
          ],
          accountId: { $exists: true },
          date: { $gte: lookupDate }
        }).limit(10);

        if (historicalTransactions.length > 0) {
          // Find most frequent account
          const accountFrequency: { [key: string]: number } = {};
          historicalTransactions.forEach(tx => {
            const accountId = tx.accountId?.toString();
            if (accountId) {
              accountFrequency[accountId] = (accountFrequency[accountId] || 0) + 1;
            }
          });

          const mostFrequentAccount = Object.entries(accountFrequency)
            .sort(([,a], [,b]) => b - a)[0];

          if (mostFrequentAccount) {
            const confidence = Math.min(0.9, mostFrequentAccount[1] / historicalTransactions.length);
            return {
              accountId: mostFrequentAccount[0],
              confidence,
              method: 'merchant_history'
            };
          }
        }
      }

      return {
        accountId: null,
        confidence: 0,
        method: 'manual'
      };

    } catch (error) {
      console.error('Error checking historical patterns:', error);
      return {
        accountId: null,
        confidence: 0,
        method: 'manual'
      };
    }
  }

  /**
   * Get default account by transaction category
   */
  private static getDefaultAccountByCategory(
    category: string | undefined,
    defaultAccounts: { [key: string]: string }
  ): string | null {
    if (!category) return null;

    const categoryMappings: { [key: string]: string[] } = {
      'groceries': ['food', 'grocery', 'supermarket'],
      'gas': ['fuel', 'gas', 'gasoline', 'auto'],
      'dining': ['restaurant', 'food', 'dining'],
      'shopping': ['retail', 'shopping', 'merchandise'],
      'bills': ['utilities', 'bill', 'subscription'],
      'entertainment': ['entertainment', 'movies', 'games']
    };

    for (const [defaultCategory, keywords] of Object.entries(categoryMappings)) {
      if (keywords.some(keyword => category.toLowerCase().includes(keyword))) {
        return defaultAccounts[defaultCategory] || null;
      }
    }

    return defaultAccounts['general'] || null;
  }

  /**
   * Learn from user manual corrections to improve future linking
   */
  static async learnFromCorrection(
    userId: mongoose.Types.ObjectId,
    transactionData: {
      description: string;
      merchant?: string;
      category?: string;
    },
    correctAccountId: string
  ): Promise<void> {
    try {
      let userPreferences = await UserAccountPreferences.findOne({ userId });
      
      if (!userPreferences) {
        userPreferences = new UserAccountPreferences({
          userId,
          linkingRules: [],
          defaultAccounts: {}
        });
      }

      // Create a new rule based on the correction
      const pattern = transactionData.merchant || 
                     transactionData.description.split(' ').slice(0, 2).join(' ');

      // Check if rule already exists
      const existingRuleIndex = userPreferences.linkingRules.findIndex(
        rule => rule.pattern === pattern
      );

      if (existingRuleIndex >= 0) {
        // Update existing rule
        userPreferences.linkingRules[existingRuleIndex].accountId = correctAccountId;
        userPreferences.linkingRules[existingRuleIndex].confidence = Math.min(
          0.95,
          userPreferences.linkingRules[existingRuleIndex].confidence + 0.1
        );
      } else {
        // Add new rule
        userPreferences.linkingRules.push({
          pattern,
          accountId: correctAccountId,
          confidence: 0.8
        });
      }

      await userPreferences.save();
    } catch (error) {
      console.error('Error learning from correction:', error);
    }
  }

  /**
   * Get suggested accounts for a transaction
   */
  static async getSuggestions(
    userId: mongoose.Types.ObjectId,
    transactionData: {
      description: string;
      merchant?: string;
      amount: number;
      category?: string;
    }
  ): Promise<string[]> {
    try {
      const result = await this.linkTransactionToAccount(userId, transactionData);
      const suggestions: string[] = [];

      if (result.accountId) {
        suggestions.push(result.accountId);
      }

      // Add other frequently used accounts
      const recentTransactions = await Transaction.find({
        userId,
        accountId: { $exists: true },
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }).limit(50);

      const accountFrequency: { [key: string]: number } = {};
      recentTransactions.forEach(tx => {
        const accountId = tx.accountId?.toString();
        if (accountId && !suggestions.includes(accountId)) {
          accountFrequency[accountId] = (accountFrequency[accountId] || 0) + 1;
        }
      });

      const sortedAccounts = Object.entries(accountFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([accountId]) => accountId);

      suggestions.push(...sortedAccounts);

      return [...new Set(suggestions)]; // Remove duplicates
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }
}
