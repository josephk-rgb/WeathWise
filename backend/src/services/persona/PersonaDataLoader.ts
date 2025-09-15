import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger';
import { User, Account, Transaction, Investment, Debt, Budget, Goal, PhysicalAsset, NetWorthMilestone, AccountBalanceHistory, DailyPrice } from '../../models';
import { AccountBalanceHistoryService } from '../AccountBalanceHistoryService';

/**
 * PersonaDataLoader - Load Curated Financial Persona Data
 * 
 * This service loads pre-defined persona data from JSON templates
 * and creates a complete financial profile with historical data.
 */

export interface PersonaTemplate {
  personaInfo: {
    name: string;
    description: string;
    financialStory: string;
    netWorthJourney: string;
    timeframe: string;
    keyEvents: string[];
  };
  userProfile: any;
  accounts: any[];
  investments: any[];
  debts: any[];
  budgets: any[];
  goals: any[];
  physicalAssets: any[];
  netWorthProgression: any[];
  accountBalanceProgression: any;
  investmentPriceProgression: any;
  transactionPatterns: any;
  accountBalanceHistory?: any[]; // Add account balance history
}

export interface LoadResult {
  success: boolean;
  personaName: string;
  userId?: string;
  recordsCreated: {
    user: number;
    accounts: number;
    transactions: number;
    investments: number;
    debts: number;
    budgets: number;
    goals: number;
    physicalAssets: number;
    netWorthMilestones: number;
    accountBalanceHistory: number;
    dailyPrices: number;
  };
  processingTime: number;
  errors: string[];
}

export interface LoadOptions {
  clearExistingData: boolean;
  generateHistoricalData: boolean;
  batchSize: number;
  validateData: boolean;
}

export class PersonaDataLoader {
  private static readonly TEMPLATES_DIR = path.join(__dirname, 'templates');
  private static readonly AVAILABLE_PERSONAS = ['sarah-chen', 'marcus-johnson', 'elena-rodriguez'];

  /**
   * Load persona data for a user
   */
  static async loadPersonaData(
    userId: mongoose.Types.ObjectId,
    personaName: string,
    options: LoadOptions = {
      clearExistingData: true,
      generateHistoricalData: true,
      batchSize: 1000,
      validateData: true
    }
  ): Promise<LoadResult> {
    const startTime = Date.now();
    const result: LoadResult = {
      success: false,
      personaName,
      recordsCreated: {
        user: 0,
        accounts: 0,
        transactions: 0,
        investments: 0,
        debts: 0,
        budgets: 0,
        goals: 0,
        physicalAssets: 0,
        netWorthMilestones: 0,
        accountBalanceHistory: 0,
        dailyPrices: 0
      },
      processingTime: 0,
      errors: []
    };

    try {
      logger.info(`🔄 Loading persona data: ${personaName} for user ${userId}`);

      // Validate persona name
      if (!this.AVAILABLE_PERSONAS.includes(personaName)) {
        throw new Error(`Unknown persona: ${personaName}. Available: ${this.AVAILABLE_PERSONAS.join(', ')}`);
      }

      // Load persona template
      const template = await this.loadPersonaTemplate(personaName);
      
      // Clear existing data if requested
      if (options.clearExistingData) {
        await this.clearUserData(userId);
        logger.info(`🗑️ Cleared existing data for user ${userId}`);
      }

      // Load data in correct order to maintain relationships
      await this.loadUserProfile(userId, template.userProfile);
      result.recordsCreated.user = 1;

      const accountIds = await this.loadAccounts(userId, template.accounts, options.batchSize);
      result.recordsCreated.accounts = accountIds.length;

      const investmentIds = await this.loadInvestments(userId, template.investments, accountIds, options.batchSize);
      result.recordsCreated.investments = investmentIds.length;

      await this.loadDebts(userId, template.debts, options.batchSize);
      result.recordsCreated.debts = template.debts.length;

      await this.loadBudgets(userId, template.budgets, options.batchSize);
      result.recordsCreated.budgets = template.budgets.length;

      await this.loadGoals(userId, template.goals, options.batchSize);
      result.recordsCreated.goals = template.goals.length;

      // Load account balance history
      if (template.accountBalanceHistory && template.accountBalanceHistory.length > 0) {
        await this.loadAccountBalanceHistory(userId, template.accountBalanceHistory, options.batchSize);
        result.recordsCreated.accountBalanceHistory += template.accountBalanceHistory.length;
      }

      await this.loadPhysicalAssets(userId, template.physicalAssets, options.batchSize);
      result.recordsCreated.physicalAssets = template.physicalAssets.length;

      // Generate transactions from transaction patterns
      const transactionCount = await this.generateTransactions(userId, template.transactionPatterns, accountIds, options.batchSize);
      result.recordsCreated.transactions = transactionCount;

      // Generate historical data if requested
      if (options.generateHistoricalData) {
        const historicalResults = await this.generateHistoricalData(userId, template, options.batchSize);
        result.recordsCreated.netWorthMilestones += historicalResults.netWorthMilestones;
        result.recordsCreated.accountBalanceHistory += historicalResults.accountBalanceHistory;
        // Note: Daily prices are handled by DailyPriceService with real market data
        result.recordsCreated.dailyPrices = 0;
      }

      // Trigger real market data fetching for investments
      await this.triggerMarketDataFetch(userId);

      // Validate data if requested
      if (options.validateData) {
        const validationResult = await this.validatePersonaData(userId);
        if (!validationResult.isValid) {
          result.errors.push(...validationResult.issues);
        }
      }

      result.success = true;
      result.userId = userId.toString();
      result.processingTime = Date.now() - startTime;

      logger.info(`✅ Persona data loaded successfully: ${personaName}`);
      logger.info(`📊 Records created: ${JSON.stringify(result.recordsCreated)}`);
      logger.info(`⏱️ Processing time: ${result.processingTime}ms`);

      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.processingTime = Date.now() - startTime;
      
      logger.error(`❌ Failed to load persona data: ${personaName}`, error);
      return result;
    }
  }

  /**
   * Load persona template from JSON file
   */
  private static async loadPersonaTemplate(personaName: string): Promise<PersonaTemplate> {
    try {
      const templatePath = path.join(this.TEMPLATES_DIR, `${personaName}.json`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      return JSON.parse(templateContent);
    } catch (error) {
      throw new Error(`Failed to load persona template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all existing data for a user
   */
  private static async clearUserData(userId: mongoose.Types.ObjectId): Promise<void> {
    // Clear all persona-related data for the user
    await Transaction.deleteMany({ userId });
    await Investment.deleteMany({ userId });
    await Debt.deleteMany({ userId });
    await Budget.deleteMany({ userId });
    await Goal.deleteMany({ userId });
    await PhysicalAsset.deleteMany({ userId });
    await NetWorthMilestone.deleteMany({ userId });
    await AccountBalanceHistory.deleteMany({ userId });
    await Account.deleteMany({ userId });
  }

  /**
   * Load user profile
   */
  private static async loadUserProfile(userId: mongoose.Types.ObjectId, userProfile: any): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        $set: {
          profile: userProfile.profile || {},
          preferences: userProfile.preferences || {},
          riskProfile: userProfile.riskProfile || {},
          subscription: userProfile.subscription || {},
          'metadata.onboardingCompleted': true
        }
      }, { upsert: false });

      logger.debug(`👤 Updated user profile for ${userId}`);
    } catch (error) {
      throw new Error(`Failed to load user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load accounts and return account IDs
   */
  private static async loadAccounts(userId: mongoose.Types.ObjectId, accounts: any[], batchSize: number): Promise<string[]> {
    try {
      const accountIds: string[] = [];

      for (const accountData of accounts) {
        const account = new Account({
          userId,
          type: accountData.type,
          provider: accountData.provider,
          accountInfo: accountData.accountInfo,
          institutionName: accountData.institutionName,
          connectionStatus: accountData.connectionStatus,
          category: accountData.category,
          isActive: true
        });

        await account.save();
        accountIds.push(account._id.toString());
      }

      logger.debug(`🏦 Loaded ${accounts.length} accounts for user ${userId}`);
      return accountIds;
    } catch (error) {
      throw new Error(`Failed to load accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load investments and return investment IDs
   */
  private static async loadInvestments(userId: mongoose.Types.ObjectId, investments: any[], accountIds: string[], batchSize: number): Promise<string[]> {
    try {
      const investmentIds: string[] = [];

      for (const investmentData of investments) {
        // Assign to first investment account if available
        const accountId = accountIds.find(id => {
          const account = Account.findById(id);
          return account && (account as any).type === 'investment';
        }) || accountIds[0];

        const investment = new Investment({
          userId,
          accountId: accountId ? new mongoose.Types.ObjectId(accountId) : undefined,
          securityInfo: investmentData.securityInfo,
          position: investmentData.position,
          acquisition: investmentData.acquisition,
          performance: investmentData.performance,
          isActive: investmentData.isActive
        });

        await investment.save();
        investmentIds.push(investment._id.toString());
      }

      logger.debug(`📈 Loaded ${investments.length} investments for user ${userId}`);
      return investmentIds;
    } catch (error) {
      throw new Error(`Failed to load investments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load debts
   */
  private static async loadDebts(userId: mongoose.Types.ObjectId, debts: any[], batchSize: number): Promise<void> {
    try {
      for (const debtData of debts) {
        const debt = new Debt({
          userId,
          type: debtData.type,
          name: debtData.name,
          lender: debtData.lender,
          totalAmount: debtData.totalAmount,
          originalAmount: debtData.originalAmount,
          remainingBalance: debtData.remainingBalance,
          interestRate: debtData.interestRate,
          minimumPayment: debtData.minimumPayment,
          monthlyPayment: debtData.monthlyPayment,
          dueDate: debtData.dueDate,
          isActive: debtData.isActive,
          paidOffDate: debtData.paidOffDate
        });

        await debt.save();
      }

      logger.debug(`💳 Loaded ${debts.length} debts for user ${userId}`);
    } catch (error) {
      throw new Error(`Failed to load debts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load budgets
   */
  private static async loadBudgets(userId: mongoose.Types.ObjectId, budgets: any[], batchSize: number): Promise<void> {
    try {
      for (const budgetData of budgets) {
        const budget = new Budget({
          userId,
          category: budgetData.category,
          allocated: budgetData.allocated,
          spent: budgetData.spent,
          month: budgetData.month,
          year: budgetData.year,
          isActive: budgetData.isActive
        });

        await budget.save();
      }

      logger.debug(`💰 Loaded ${budgets.length} budgets for user ${userId}`);
    } catch (error) {
      throw new Error(`Failed to load budgets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load goals
   */
  private static async loadGoals(userId: mongoose.Types.ObjectId, goals: any[], batchSize: number): Promise<void> {
    try {
      for (const goalData of goals) {
        const goal = new Goal({
          userId,
          title: goalData.title,
          description: goalData.description,
          targetAmount: goalData.targetAmount,
          currentAmount: goalData.currentAmount,
          targetDate: goalData.targetDate,
          category: goalData.category,
          priority: goalData.priority,
          isActive: goalData.isActive,
          isCompleted: goalData.isCompleted,
          completedAt: goalData.completedAt
        });

        await goal.save();
      }

      logger.debug(`🎯 Loaded ${goals.length} goals for user ${userId}`);
    } catch (error) {
      throw new Error(`Failed to load goals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load physical assets
   */
  private static async loadPhysicalAssets(userId: mongoose.Types.ObjectId, assets: any[], batchSize: number): Promise<void> {
    try {
      for (const assetData of assets) {
        const asset = new PhysicalAsset({
          userId,
          type: assetData.type,
          name: assetData.name,
          currentValue: assetData.currentValue,
          purchasePrice: assetData.purchasePrice,
          purchaseDate: assetData.purchaseDate,
          description: assetData.description,
          loanInfo: assetData.loanInfo,
          equity: assetData.equity,
          depreciationRate: assetData.depreciationRate,
          lastValuationDate: assetData.lastValuationDate,
          isActive: assetData.isActive
        });

        await asset.save();
      }

      logger.debug(`🏠 Loaded ${assets.length} physical assets for user ${userId}`);
    } catch (error) {
      throw new Error(`Failed to load physical assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate transactions from transaction patterns
   */
  private static async generateTransactions(
    userId: mongoose.Types.ObjectId, 
    transactionPatterns: any, 
    accountIds: string[], 
    batchSize: number
  ): Promise<number> {
    try {
      if (!transactionPatterns) {
        logger.debug('No transaction patterns found, skipping transaction generation');
        return 0;
      }

      const transactions = [];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      const endDate = new Date();

      // Get accounts for transaction assignment
      const accounts = await Account.find({ userId, isActive: true });
      const checkingAccount = accounts.find(acc => acc.type === 'checking');
      const savingsAccount = accounts.find(acc => acc.type === 'savings');
      const creditAccount = accounts.find(acc => acc.type === 'credit');

      // Generate income transactions
      if (transactionPatterns.income) {
        for (const incomePattern of transactionPatterns.income) {
          const incomeTransactions = this.generateRecurringTransactions(
            incomePattern, 
            startDate, 
            endDate, 
            'income',
            checkingAccount?._id as mongoose.Types.ObjectId || accounts[0]?._id as mongoose.Types.ObjectId
          );
          transactions.push(...incomeTransactions);
        }
      }

      // Generate expense transactions
      if (transactionPatterns.expenses) {
        for (const expensePattern of transactionPatterns.expenses) {
          const expenseTransactions = this.generateRecurringTransactions(
            expensePattern, 
            startDate, 
            endDate, 
            'expense',
            checkingAccount?._id as mongoose.Types.ObjectId || accounts[0]?._id as mongoose.Types.ObjectId
          );
          transactions.push(...expenseTransactions);
        }
      }

      // Save transactions in batches
      let totalSaved = 0;
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        const transactionDocs = batch.map(tx => new Transaction({
          userId,
          accountId: tx.accountId,
          transactionInfo: {
            amount: tx.amount,
            currency: 'USD',
            description: tx.description,
            type: tx.type,
            category: tx.category,
            subcategory: tx.subcategory,
            date: tx.date
          },
          categorization: {
            automatic: true,
            confidence: 0.9,
            userOverridden: false
          },
          location: {
            merchant: tx.merchant
          },
          metadata: {
            tags: tx.tags || [],
            isRecurring: tx.isRecurring,
            notes: tx.description
          },
          audit: {
            source: 'manual',
            modifiedAt: new Date()
          }
        }));

        await Transaction.insertMany(transactionDocs);
        totalSaved += transactionDocs.length;
      }

      logger.debug(`💳 Generated ${totalSaved} transactions for user ${userId}`);
      return totalSaved;
    } catch (error) {
      throw new Error(`Failed to generate transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate recurring transactions from a pattern
   */
  private static generateRecurringTransactions(
    pattern: any,
    startDate: Date,
    endDate: Date,
    transactionType: 'income' | 'expense',
    defaultAccountId: mongoose.Types.ObjectId | undefined
  ): any[] {
    const transactions = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      let shouldGenerate = false;

      // Check if transaction should occur on this date based on frequency
      switch (pattern.frequency) {
        case 'monthly':
          shouldGenerate = currentDate.getDate() === (pattern.dayOfMonth || 1);
          break;
        case 'quarterly':
          shouldGenerate = pattern.months?.includes(currentDate.getMonth() + 1) && 
                          currentDate.getDate() === (pattern.dayOfMonth || 1);
          break;
        case 'weekly':
          shouldGenerate = currentDate.getDay() === (pattern.dayOfWeek || 1);
          break;
        case 'daily':
          shouldGenerate = true;
          break;
        default:
          shouldGenerate = currentDate.getDate() === (pattern.dayOfMonth || 1);
      }

      if (shouldGenerate) {
        // Apply variation if specified
        let amount = pattern.amount;
        if (pattern.variation) {
          const variation = (Math.random() - 0.5) * 2 * pattern.variation;
          amount = amount * (1 + variation);
        }

        // Determine account based on transaction type and pattern
        let accountId = defaultAccountId;
        if (transactionType === 'expense' && pattern.type === 'rent') {
          // Rent typically comes from checking account
          accountId = defaultAccountId;
        } else if (transactionType === 'income') {
          // Income typically goes to checking account
          accountId = defaultAccountId;
        }

        transactions.push({
          accountId,
          amount: transactionType === 'expense' ? -Math.abs(amount) : Math.abs(amount),
          type: transactionType,
          category: this.mapTransactionCategory(pattern.type),
          subcategory: pattern.type,
          merchant: pattern.merchant || 'Unknown',
          description: pattern.description || `${transactionType} - ${pattern.type}`,
          date: new Date(currentDate),
          isRecurring: true,
          tags: [pattern.type, pattern.frequency],
          metadata: {
            source: 'persona_template',
            pattern: pattern.type,
            frequency: pattern.frequency
          }
        });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return transactions;
  }

  /**
   * Map transaction pattern type to category
   */
  private static mapTransactionCategory(patternType: string): string {
    const categoryMap: { [key: string]: string } = {
      'salary': 'Income',
      'bonus': 'Income',
      'rent': 'Housing',
      'utilities': 'Utilities',
      'groceries': 'Food & Dining',
      'transportation': 'Transportation',
      'dining': 'Food & Dining',
      'entertainment': 'Entertainment',
      'shopping': 'Shopping',
      'healthcare': 'Healthcare',
      'insurance': 'Insurance',
      'investment': 'Investment',
      'savings': 'Savings'
    };

    return categoryMap[patternType] || 'Other';
  }

  /**
   * Trigger real market data fetching for user's investments
   */
  private static async triggerMarketDataFetch(userId: mongoose.Types.ObjectId): Promise<void> {
    try {
      // Import DailyPriceService dynamically to avoid circular dependencies
      const { DailyPriceService } = await import('../dailyPriceService');
      const dailyPriceService = new DailyPriceService();
      
      // Get user's investments
      const investments = await Investment.find({ userId, isActive: true });
      
      if (investments.length === 0) {
        logger.debug(`No investments found for user ${userId}, skipping market data fetch`);
        return;
      }

      // Get unique symbols
      const symbols = [...new Set(investments.map(inv => inv.securityInfo.symbol).filter(Boolean))];
      
      if (symbols.length === 0) {
        logger.debug(`No valid symbols found for user ${userId}, skipping market data fetch`);
        return;
      }

      logger.info(`📈 Triggering market data fetch for ${symbols.length} symbols: ${symbols.join(', ')}`);
      
      // Populate historical data for the last year
      await dailyPriceService.populateHistoricalData(365);
      
      logger.info(`✅ Market data fetch completed for user ${userId}`);
    } catch (error) {
      logger.warn(`⚠️ Failed to trigger market data fetch for user ${userId}:`, error);
      // Don't throw error - this is not critical for persona loading
    }
  }

  /**
   * Generate historical data from persona template
   */
  private static async generateHistoricalData(userId: mongoose.Types.ObjectId, template: PersonaTemplate, batchSize: number): Promise<{
    netWorthMilestones: number;
    accountBalanceHistory: number;
    dailyPrices: number;
  }> {
    try {
      logger.info(`📊 Generating historical data for user ${userId}`);

      // Generate net worth milestones
      const netWorthMilestones = await this.generateNetWorthMilestones(userId, template.netWorthProgression);
      
      // Generate account balance history
      const accountBalanceHistory = await this.generateAccountBalanceHistory(userId, template.accountBalanceProgression);
      
      // Skip daily price generation - use real market data from DailyPriceService instead
      logger.info(`📊 Historical data generated: ${netWorthMilestones} milestones, ${accountBalanceHistory} balance records`);
      logger.info(`💡 Daily prices will be fetched from real market data via DailyPriceService`);

      return {
        netWorthMilestones,
        accountBalanceHistory,
        dailyPrices: 0 // Daily prices handled by DailyPriceService
      };
    } catch (error) {
      throw new Error(`Failed to generate historical data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate net worth milestones from progression data
   */
  private static async generateNetWorthMilestones(userId: mongoose.Types.ObjectId, progression: any[]): Promise<number> {
    try {
      let count = 0;

      for (const milestone of progression) {
        const milestoneDoc = new NetWorthMilestone({
          userId,
          date: new Date(milestone.date),
          trigger: 'daily_snapshot',
          netWorth: milestone.netWorth,
          breakdown: milestone.breakdown,
          metadata: {
            triggerDetails: 'Persona historical data',
            snapshotData: {
              dataQuality: 'complete',
              source: 'manual'
            }
          }
        });

        await milestoneDoc.save();
        count++;
      }

      logger.debug(`📈 Generated ${count} net worth milestones`);
      return count;
    } catch (error) {
      throw new Error(`Failed to generate net worth milestones: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate account balance history from progression data
   */
  private static async generateAccountBalanceHistory(userId: mongoose.Types.ObjectId, progression: any): Promise<number> {
    try {
      const accounts = await Account.find({ userId, isActive: true });
      let count = 0;

      for (const account of accounts) {
        const accountType = account.type;
        const progressionData = progression[accountType];

        if (progressionData) {
          for (const balancePoint of progressionData) {
            const historyDoc = new AccountBalanceHistory({
              accountId: account._id,
              userId,
              date: new Date(balancePoint.date),
              balance: balancePoint.balance,
              changeType: 'initial',
              changeAmount: balancePoint.balance,
              previousBalance: 0,
              description: `Persona historical data - ${accountType}`
            });

            await historyDoc.save();
            count++;
          }
        }
      }

      logger.debug(`📊 Generated ${count} account balance history records`);
      return count;
    } catch (error) {
      throw new Error(`Failed to generate account balance history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate loaded persona data
   */
  private static async validatePersonaData(userId: mongoose.Types.ObjectId): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        issues.push('User not found');
      }

      // Check account balances are positive (except credit cards)
      const accounts = await Account.find({ userId, isActive: true });
      for (const account of accounts) {
        if (account.type !== 'credit' && account.accountInfo.balance < 0) {
          issues.push(`Account ${account.accountInfo.name} has negative balance`);
        }
      }

      // Check investment values
      const investments = await Investment.find({ userId, isActive: true });
      for (const investment of investments) {
        if (investment.position.shares <= 0) {
          issues.push(`Investment ${investment.securityInfo.symbol} has zero or negative shares`);
        }
      }

      logger.debug(`🔍 Data validation completed: ${issues.length} issues found`);
      
      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        issues
      };
    }
  }

  /**
   * Load account balance history from template
   */
  private static async loadAccountBalanceHistory(
    userId: mongoose.Types.ObjectId,
    balanceHistoryData: any[],
    batchSize: number
  ): Promise<void> {
    try {
      if (!balanceHistoryData || balanceHistoryData.length === 0) {
        logger.debug('No account balance history data to load');
        return;
      }

      logger.info(`📊 Loading ${balanceHistoryData.length} account balance history records`);

      // Process in batches
      for (let i = 0; i < balanceHistoryData.length; i += batchSize) {
        const batch = balanceHistoryData.slice(i, i + batchSize);
        const historyDocs = [];

        for (const historyData of batch) {
          // Convert accountId string to ObjectId if needed
          let accountId: mongoose.Types.ObjectId;
          if (typeof historyData.accountId === 'string') {
            // Find account by the string ID from template
            const account = await Account.findOne({ 
              userId, 
              'accountInfo.name': { $regex: historyData.accountId, $options: 'i' } 
            });
            if (!account) {
              logger.warn(`Account not found for balance history: ${historyData.accountId}`);
              continue;
            }
            accountId = account._id as mongoose.Types.ObjectId;
          } else {
            accountId = historyData.accountId;
          }

          const historyDoc = new AccountBalanceHistory({
            accountId,
            userId,
            date: new Date(historyData.date),
            balance: historyData.balance,
            changeType: historyData.changeType || 'initial',
            changeAmount: historyData.changeAmount,
            previousBalance: historyData.previousBalance,
            description: historyData.description,
            transactionId: historyData.transactionId,
            goalId: historyData.goalId,
            metadata: historyData.metadata
          });

          historyDocs.push(historyDoc);
        }

        if (historyDocs.length > 0) {
          await AccountBalanceHistory.insertMany(historyDocs);
          logger.debug(`✅ Loaded ${historyDocs.length} account balance history records`);
        }
      }

      logger.info(`📊 Successfully loaded ${balanceHistoryData.length} account balance history records`);
    } catch (error) {
      logger.error('❌ Error loading account balance history:', error);
      throw new Error(`Failed to load account balance history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available personas
   */
  static getAvailablePersonas(): string[] {
    return [...this.AVAILABLE_PERSONAS];
  }

  /**
   * Get persona information
   */
  static async getPersonaInfo(personaName: string): Promise<PersonaTemplate['personaInfo'] | null> {
    try {
      if (!this.AVAILABLE_PERSONAS.includes(personaName)) {
        return null;
      }

      const template = await this.loadPersonaTemplate(personaName);
      return template.personaInfo;
    } catch (error) {
      logger.error(`❌ Failed to get persona info for ${personaName}:`, error);
      return null;
    }
  }
}

export default PersonaDataLoader;
