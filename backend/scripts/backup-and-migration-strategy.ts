import mongoose from 'mongoose';
import { User, Account, Transaction, Investment, Debt, Budget, Goal, PhysicalAsset, NetWorthMilestone, AccountBalanceHistory } from '../src/models';
import { logger } from '../src/utils/logger';

/**
 * Database Backup and Migration Strategy for Persona-Based System
 * 
 * This script provides comprehensive backup and migration utilities
 * to safely transition from the current mock data system to the
 * new persona-based system.
 */

export interface BackupConfig {
  backupDirectory: string;
  includeCollections: string[];
  compressionEnabled: boolean;
  timestampFormat: string;
}

export interface MigrationPlan {
  phase: string;
  description: string;
  risks: string[];
  rollbackPlan: string;
  estimatedDuration: string;
}

export class DatabaseBackupService {
  private static defaultConfig: BackupConfig = {
    backupDirectory: './backups',
    includeCollections: [
      'users',
      'accounts', 
      'transactions',
      'investments',
      'debts',
      'budgets',
      'goals',
      'physicalassets',
      'networthmilestones',
      'accountbalancehistory',
      'portfoliopricehistory',
      'daily_prices',
      'recommendations',
      'useraccountpreferences'
    ],
    compressionEnabled: true,
    timestampFormat: 'YYYY-MM-DD_HH-mm-ss'
  };

  /**
   * Create a complete database backup before persona system migration
   */
  static async createFullBackup(config: BackupConfig = this.defaultConfig): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `full_backup_${timestamp}`;
      
      logger.info(`🔄 Starting full database backup: ${backupName}`);
      
      // Create backup directory if it doesn't exist
      await this.ensureBackupDirectory(config.backupDirectory);
      
      // Backup each collection
      const backupResults = await Promise.all(
        config.includeCollections.map(collection => 
          this.backupCollection(collection, backupName, config)
        )
      );
      
      const summary = {
        backupName,
        timestamp: new Date().toISOString(),
        collections: backupResults,
        totalRecords: backupResults.reduce((sum, result) => sum + result.recordCount, 0)
      };
      
      // Save backup metadata
      await this.saveBackupMetadata(backupName, summary, config);
      
      logger.info(`✅ Full backup completed: ${backupName}`);
      logger.info(`📊 Total records backed up: ${summary.totalRecords}`);
      
      return backupName;
    } catch (error) {
      logger.error('❌ Full backup failed:', error);
      throw error;
    }
  }

  /**
   * Backup a specific collection
   */
  private static async backupCollection(
    collectionName: string, 
    backupName: string, 
    config: BackupConfig
  ): Promise<{ collection: string; recordCount: number; filePath: string }> {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);
      
      // Get all documents from collection
      const documents = await collection.find({}).toArray();
      
      // Create backup file path
      const fileName = `${collectionName}_${backupName}.json`;
      const filePath = `${config.backupDirectory}/${fileName}`;
      
      // Write documents to file
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, JSON.stringify(documents, null, 2));
      
      logger.info(`📁 Backed up ${collectionName}: ${documents.length} records`);
      
      return {
        collection: collectionName,
        recordCount: documents.length,
        filePath
      };
    } catch (error) {
      logger.error(`❌ Failed to backup collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  static async restoreFromBackup(backupName: string, config: BackupConfig = this.defaultConfig): Promise<void> {
    try {
      logger.info(`🔄 Starting database restore from backup: ${backupName}`);
      
      // Load backup metadata
      const metadata = await this.loadBackupMetadata(backupName, config);
      
      // Restore each collection
      for (const collectionInfo of metadata.collections) {
        await this.restoreCollection(collectionInfo.collection, collectionInfo.filePath);
      }
      
      logger.info(`✅ Database restore completed from backup: ${backupName}`);
    } catch (error) {
      logger.error('❌ Database restore failed:', error);
      throw error;
    }
  }

  /**
   * Restore a specific collection from backup file
   */
  private static async restoreCollection(collectionName: string, filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);
      
      // Read backup file
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const documents = JSON.parse(fileContent);
      
      // Clear existing data
      await collection.deleteMany({});
      
      // Insert backed up documents
      if (documents.length > 0) {
        await collection.insertMany(documents);
      }
      
      logger.info(`📁 Restored ${collectionName}: ${documents.length} records`);
    } catch (error) {
      logger.error(`❌ Failed to restore collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get current data summary for validation
   */
  static async getCurrentDataSummary(): Promise<{
    users: number;
    accounts: number;
    transactions: number;
    investments: number;
    debts: number;
    budgets: number;
    goals: number;
    physicalAssets: number;
    netWorthMilestones: number;
    accountBalanceHistory: number;
  }> {
    try {
      const [
        userCount,
        accountCount,
        transactionCount,
        investmentCount,
        debtCount,
        budgetCount,
        goalCount,
        physicalAssetCount,
        netWorthMilestoneCount,
        accountBalanceHistoryCount
      ] = await Promise.all([
        User.countDocuments(),
        Account.countDocuments(),
        Transaction.countDocuments(),
        Investment.countDocuments(),
        Debt.countDocuments(),
        Budget.countDocuments(),
        Goal.countDocuments(),
        PhysicalAsset.countDocuments(),
        NetWorthMilestone.countDocuments(),
        AccountBalanceHistory.countDocuments()
      ]);

      return {
        users: userCount,
        accounts: accountCount,
        transactions: transactionCount,
        investments: investmentCount,
        debts: debtCount,
        budgets: budgetCount,
        goals: goalCount,
        physicalAssets: physicalAssetCount,
        netWorthMilestones: netWorthMilestoneCount,
        accountBalanceHistory: accountBalanceHistoryCount
      };
    } catch (error) {
      logger.error('❌ Failed to get data summary:', error);
      throw error;
    }
  }

  /**
   * Validate data integrity after restore
   */
  static async validateDataIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    summary: any;
  }> {
    try {
      const issues: string[] = [];
      const summary = await this.getCurrentDataSummary();
      
      // Check for orphaned records
      const orphanedTransactions = await Transaction.countDocuments({
        userId: { $exists: false }
      });
      
      const orphanedAccounts = await Account.countDocuments({
        userId: { $exists: false }
      });
      
      if (orphanedTransactions > 0) {
        issues.push(`${orphanedTransactions} transactions without valid userId`);
      }
      
      if (orphanedAccounts > 0) {
        issues.push(`${orphanedAccounts} accounts without valid userId`);
      }
      
      // Check for negative balances (might be valid for credit cards)
      const negativeBalances = await Account.countDocuments({
        'accountInfo.balance': { $lt: 0 },
        type: { $nin: ['credit'] }
      });
      
      if (negativeBalances > 0) {
        issues.push(`${negativeBalances} non-credit accounts with negative balances`);
      }
      
      // Check for missing account references in transactions
      const transactionsWithoutAccounts = await Transaction.countDocuments({
        accountId: { $exists: false }
      });
      
      if (transactionsWithoutAccounts > 0) {
        issues.push(`${transactionsWithoutAccounts} transactions without account references`);
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        summary
      };
    } catch (error) {
      logger.error('❌ Data integrity validation failed:', error);
      throw error;
    }
  }

  /**
   * Create migration plan with risk assessment
   */
  static createMigrationPlan(): MigrationPlan[] {
    return [
      {
        phase: "Phase 1: Foundation",
        description: "Create backup, persona templates, and daily snapshot service",
        risks: [
          "Backup process might fail due to large dataset",
          "Persona templates might have validation errors",
          "Daily snapshot service might conflict with existing system"
        ],
        rollbackPlan: "Restore from full backup, disable new services",
        estimatedDuration: "2-3 hours"
      },
      {
        phase: "Phase 2: Core Services",
        description: "Build persona data loader, historical generator, and validator",
        risks: [
          "Bulk inserts might cause memory issues",
          "Historical data generation might be inaccurate",
          "Data validation might reveal existing inconsistencies"
        ],
        rollbackPlan: "Stop data loading, restore from backup, fix validation issues",
        estimatedDuration: "4-6 hours"
      },
      {
        phase: "Phase 3: API Layer",
        description: "Create admin API endpoints and controller",
        risks: [
          "API endpoints might conflict with existing routes",
          "Controller logic might have bugs",
          "Authentication/authorization might fail"
        ],
        rollbackPlan: "Remove new routes, restore old endpoints",
        estimatedDuration: "2-3 hours"
      },
      {
        phase: "Phase 4: Frontend",
        description: "Update frontend API service, admin UI, and TypeScript interfaces",
        risks: [
          "Frontend updates might break existing functionality",
          "TypeScript compilation errors",
          "API integration issues"
        ],
        rollbackPlan: "Revert frontend changes, use backup API endpoints",
        estimatedDuration: "3-4 hours"
      },
      {
        phase: "Phase 5: Integration",
        description: "Register routes, test end-to-end functionality",
        risks: [
          "Route conflicts might break application",
          "End-to-end tests might reveal integration issues",
          "Performance issues with large datasets"
        ],
        rollbackPlan: "Restore old routes, rollback to previous phase",
        estimatedDuration: "2-3 hours"
      },
      {
        phase: "Phase 6: Cleanup",
        description: "Remove old system and optimize performance",
        risks: [
          "Removing old system might break dependencies",
          "Performance optimization might introduce bugs",
          "Final cleanup might miss critical components"
        ],
        rollbackPlan: "Restore old system files, rollback optimizations",
        estimatedDuration: "1-2 hours"
      }
    ];
  }

  /**
   * Utility methods
   */
  private static async ensureBackupDirectory(directory: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.access(directory);
    } catch {
      await fs.mkdir(directory, { recursive: true });
    }
  }

  private static async saveBackupMetadata(backupName: string, summary: any, config: BackupConfig): Promise<void> {
    const fs = await import('fs/promises');
    const metadataPath = `${config.backupDirectory}/${backupName}_metadata.json`;
    await fs.writeFile(metadataPath, JSON.stringify(summary, null, 2));
  }

  private static async loadBackupMetadata(backupName: string, config: BackupConfig): Promise<any> {
    const fs = await import('fs/promises');
    const metadataPath = `${config.backupDirectory}/${backupName}_metadata.json`;
    const fileContent = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(fileContent);
  }
}

/**
 * CLI interface for backup operations
 */
if (require.main === module) {
  const command = process.argv[2];
  
  async function runCommand() {
    try {
      switch (command) {
        case 'backup':
          const backupName = await DatabaseBackupService.createFullBackup();
          console.log(`✅ Backup created: ${backupName}`);
          break;
          
        case 'summary':
          const summary = await DatabaseBackupService.getCurrentDataSummary();
          console.log('📊 Current Data Summary:');
          console.log(JSON.stringify(summary, null, 2));
          break;
          
        case 'validate':
          const validation = await DatabaseBackupService.validateDataIntegrity();
          console.log('🔍 Data Integrity Validation:');
          console.log(`Valid: ${validation.isValid}`);
          if (validation.issues.length > 0) {
            console.log('Issues:');
            validation.issues.forEach(issue => console.log(`  - ${issue}`));
          }
          break;
          
        case 'plan':
          const plan = DatabaseBackupService.createMigrationPlan();
          console.log('📋 Migration Plan:');
          plan.forEach((phase, index) => {
            console.log(`\n${index + 1}. ${phase.phase}`);
            console.log(`   Description: ${phase.description}`);
            console.log(`   Duration: ${phase.estimatedDuration}`);
            console.log(`   Risks: ${phase.risks.length} identified`);
            console.log(`   Rollback: ${phase.rollbackPlan}`);
          });
          break;
          
        default:
          console.log('Usage: node backup-and-migration-strategy.ts [backup|summary|validate|plan]');
      }
    } catch (error) {
      console.error('❌ Command failed:', error);
      process.exit(1);
    }
  }
  
  runCommand();
}

export default DatabaseBackupService;
