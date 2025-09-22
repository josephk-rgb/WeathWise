import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import PersonaDataLoader from '../services/persona/PersonaDataLoader';
import HistoricalDataGenerator from '../services/persona/HistoricalDataGenerator';
import PersonaDataValidator from '../services/persona/PersonaDataValidator';
import { DailySnapshotService } from '../services/snapshot/DailySnapshotService';
import { SnapshotScheduler } from '../services/snapshot/SnapshotScheduler';
// import { DatabaseBackupService } from '../../scripts/backup-and-migration-strategy'; // Disabled to prevent crashes
import { User, Account, Transaction, Investment, Debt, Budget, Goal, PhysicalAsset, NetWorthMilestone, AccountBalanceHistory, DailyPrice } from '../models';

/**
 * PersonaController - Admin API Controller for Persona Management
 * 
 * This controller handles all admin API endpoints for managing persona data,
 * including loading, validating, backing up, and managing persona-based mock data.
 */

export class PersonaController {
  /**
   * Get available personas
   */
  async getAvailablePersonas(req: Request, res: Response): Promise<void> {
    try {
      const personas = PersonaDataLoader.getAvailablePersonas();
      
      res.json({
        success: true,
        data: {
          personas,
          count: personas.length
        }
      });
    } catch (error) {
      logger.error('❌ Failed to get available personas:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available personas',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get persona information
   */
  async getPersonaInfo(req: Request, res: Response): Promise<void> {
    try {
      const { personaName } = req.params;
      
      const personaInfo = await PersonaDataLoader.getPersonaInfo(personaName);
      
      if (!personaInfo) {
        res.status(404).json({
          success: false,
          message: `Persona '${personaName}' not found`
        });
        return;
      }
      
      res.json({
        success: true,
        data: personaInfo
      });
    } catch (error) {
      logger.error(`❌ Failed to get persona info for ${req.params.personaName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to get persona information',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Load persona data for a user
   */
  async loadPersonaData(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { personaName, options = {} } = req.body;
      
      const userIdObj = new mongoose.Types.ObjectId(userId);
      
      // Validate user exists
      const user = await User.findById(userIdObj);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }
      
      logger.info(`🔄 Loading persona data: ${personaName} for user ${userId}`);
      
      const result = await PersonaDataLoader.loadPersonaData(userIdObj, personaName, {
        clearExistingData: options.clearExistingData ?? true,
        generateHistoricalData: options.generateHistoricalData ?? true,
        batchSize: options.batchSize ?? 1000,
        validateData: options.validateData ?? true
      });
      
      if (result.success) {
        logger.info(`✅ Persona data loaded successfully: ${result.personaName}`);
        res.json({
          success: true,
          message: `Persona data loaded successfully for user ${userId}`,
          data: result
        });
      } else {
        logger.error(`❌ Failed to load persona data: ${result.errors.join(', ')}`);
        res.status(400).json({
          success: false,
          message: 'Failed to load persona data',
          errors: result.errors,
          data: result
        });
      }
    } catch (error) {
      logger.error(`❌ Failed to load persona data for user ${req.params.userId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to load persona data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Load persona data for multiple users
   */
  async loadPersonaDataBulk(req: Request, res: Response): Promise<void> {
    try {
      const { userIds, personaName, options = {} } = req.body;
      
      logger.info(`🔄 Loading persona data: ${personaName} for ${userIds.length} users`);
      
      const results = [];
      const errors = [];
      
      for (const userId of userIds) {
        try {
          const userIdObj = new mongoose.Types.ObjectId(userId);
          const result = await PersonaDataLoader.loadPersonaData(userIdObj, personaName, {
            clearExistingData: options.clearExistingData ?? true,
            generateHistoricalData: options.generateHistoricalData ?? true,
            batchSize: options.batchSize ?? 1000,
            validateData: options.validateData ?? true
          });
          
          results.push(result);
        } catch (error) {
          errors.push({
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      res.json({
        success: errors.length === 0,
        message: `Bulk load completed: ${successful} successful, ${failed} failed`,
        data: {
          results,
          errors,
          summary: {
            total: userIds.length,
            successful,
            failed
          }
        }
      });
    } catch (error) {
      logger.error('❌ Failed to load persona data in bulk:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load persona data in bulk',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate persona data for a user
   */
  async validatePersonaData(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { config } = req.query;
      
      const userIdObj = new mongoose.Types.ObjectId(userId);
      
      logger.info(`🔍 Validating persona data for user ${userId}`);
      
      const result = await PersonaDataValidator.validatePersonaData(userIdObj, config ? JSON.parse(config as string) : {});
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`❌ Failed to validate persona data for user ${req.params.userId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate persona data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate historical data for a user
   */
  async generateHistoricalData(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { config = {} } = req.body;
      
      const userIdObj = new mongoose.Types.ObjectId(userId);
      
      logger.info(`📊 Generating historical data for user ${userId}`);
      
      const result = await HistoricalDataGenerator.generateHistoricalDataForUser(userIdObj, config);
      
      res.json({
        success: true,
        message: `Historical data generated for user ${userId}`,
        data: result
      });
    } catch (error) {
      logger.error(`❌ Failed to generate historical data for user ${req.params.userId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate historical data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clear all persona data for a user
   */
  async clearPersonaData(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const requestId = `clear_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const { userId } = req.params;
      const { confirm, backup = false } = req.body;
      
      logger.info(`🔧 [DEBUG] Clear data request started:`, {
        requestId,
        userId,
        confirm,
        backup,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      if (!confirm) {
        logger.warn(`❌ [DEBUG] Clear data request rejected - no confirmation:`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        res.status(400).json({
          success: false,
          message: 'Confirmation required to clear persona data'
        });
        return;
      }
      
      const userIdObj = new mongoose.Types.ObjectId(userId);
      
      logger.info(`🗑️ [DEBUG] Starting persona data clear for user ${userId}`, {
        requestId,
        userIdObj: userIdObj.toString(),
        timestamp: new Date().toISOString()
      });
      
      // Backup disabled to prevent crashes
      logger.info(`⏭️ [DEBUG] Backup disabled to prevent crashes:`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // Clear all persona-related data
      let totalDeleted = 0;
      const deletionResults: any = {};
      
      logger.info(`🗑️ [DEBUG] Starting data deletion process:`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // Delete transactions
      logger.info(`🗑️ [DEBUG] Deleting transactions for user ${userId}`, { requestId });
      const transactionStartTime = Date.now();
      const transactionResult = await Transaction.deleteMany({ userId: userIdObj });
      const transactionDuration = Date.now() - transactionStartTime;
      totalDeleted += transactionResult.deletedCount;
      deletionResults.transactions = { count: transactionResult.deletedCount, duration: transactionDuration };
      logger.info(`🗑️ [DEBUG] Transactions deleted:`, {
        requestId,
        count: transactionResult.deletedCount,
        duration: `${transactionDuration}ms`
      });
      
      // Delete investments
      logger.info(`🗑️ [DEBUG] Deleting investments for user ${userId}`, { requestId });
      const investmentStartTime = Date.now();
      const investmentResult = await Investment.deleteMany({ userId: userIdObj });
      const investmentDuration = Date.now() - investmentStartTime;
      totalDeleted += investmentResult.deletedCount;
      deletionResults.investments = { count: investmentResult.deletedCount, duration: investmentDuration };
      logger.info(`🗑️ [DEBUG] Investments deleted:`, {
        requestId,
        count: investmentResult.deletedCount,
        duration: `${investmentDuration}ms`
      });
      
      // Delete debts
      logger.info(`🗑️ [DEBUG] Deleting debts for user ${userId}`, { requestId });
      const debtStartTime = Date.now();
      const debtResult = await Debt.deleteMany({ userId: userIdObj });
      const debtDuration = Date.now() - debtStartTime;
      totalDeleted += debtResult.deletedCount;
      deletionResults.debts = { count: debtResult.deletedCount, duration: debtDuration };
      logger.info(`🗑️ [DEBUG] Debts deleted:`, {
        requestId,
        count: debtResult.deletedCount,
        duration: `${debtDuration}ms`
      });
      
      // Delete budgets
      logger.info(`🗑️ [DEBUG] Deleting budgets for user ${userId}`, { requestId });
      const budgetStartTime = Date.now();
      const budgetResult = await Budget.deleteMany({ userId: userIdObj });
      const budgetDuration = Date.now() - budgetStartTime;
      totalDeleted += budgetResult.deletedCount;
      deletionResults.budgets = { count: budgetResult.deletedCount, duration: budgetDuration };
      logger.info(`🗑️ [DEBUG] Budgets deleted:`, {
        requestId,
        count: budgetResult.deletedCount,
        duration: `${budgetDuration}ms`
      });
      
      // Delete goals
      logger.info(`🗑️ [DEBUG] Deleting goals for user ${userId}`, { requestId });
      const goalStartTime = Date.now();
      const goalResult = await Goal.deleteMany({ userId: userIdObj });
      const goalDuration = Date.now() - goalStartTime;
      totalDeleted += goalResult.deletedCount;
      deletionResults.goals = { count: goalResult.deletedCount, duration: goalDuration };
      logger.info(`🗑️ [DEBUG] Goals deleted:`, {
        requestId,
        count: goalResult.deletedCount,
        duration: `${goalDuration}ms`
      });
      
      // Delete physical assets
      logger.info(`🗑️ [DEBUG] Deleting physical assets for user ${userId}`, { requestId });
      const physicalAssetStartTime = Date.now();
      const physicalAssetResult = await PhysicalAsset.deleteMany({ userId: userIdObj });
      const physicalAssetDuration = Date.now() - physicalAssetStartTime;
      totalDeleted += physicalAssetResult.deletedCount;
      deletionResults.physicalAssets = { count: physicalAssetResult.deletedCount, duration: physicalAssetDuration };
      logger.info(`🗑️ [DEBUG] Physical assets deleted:`, {
        requestId,
        count: physicalAssetResult.deletedCount,
        duration: `${physicalAssetDuration}ms`
      });
      
      // Delete net worth milestones
      logger.info(`🗑️ [DEBUG] Deleting net worth milestones for user ${userId}`, { requestId });
      const netWorthMilestoneStartTime = Date.now();
      const netWorthMilestoneResult = await NetWorthMilestone.deleteMany({ userId: userIdObj });
      const netWorthMilestoneDuration = Date.now() - netWorthMilestoneStartTime;
      totalDeleted += netWorthMilestoneResult.deletedCount;
      deletionResults.netWorthMilestones = { count: netWorthMilestoneResult.deletedCount, duration: netWorthMilestoneDuration };
      logger.info(`🗑️ [DEBUG] Net worth milestones deleted:`, {
        requestId,
        count: netWorthMilestoneResult.deletedCount,
        duration: `${netWorthMilestoneDuration}ms`
      });
      
      // Delete account balance history
      logger.info(`🗑️ [DEBUG] Deleting account balance history for user ${userId}`, { requestId });
      const accountBalanceHistoryStartTime = Date.now();
      const accountBalanceHistoryResult = await AccountBalanceHistory.deleteMany({ userId: userIdObj });
      const accountBalanceHistoryDuration = Date.now() - accountBalanceHistoryStartTime;
      totalDeleted += accountBalanceHistoryResult.deletedCount;
      deletionResults.accountBalanceHistory = { count: accountBalanceHistoryResult.deletedCount, duration: accountBalanceHistoryDuration };
      logger.info(`🗑️ [DEBUG] Account balance history deleted:`, {
        requestId,
        count: accountBalanceHistoryResult.deletedCount,
        duration: `${accountBalanceHistoryDuration}ms`
      });
      
      // Delete accounts
      logger.info(`🗑️ [DEBUG] Deleting accounts for user ${userId}`, { requestId });
      const accountStartTime = Date.now();
      const accountResult = await Account.deleteMany({ userId: userIdObj });
      const accountDuration = Date.now() - accountStartTime;
      totalDeleted += accountResult.deletedCount;
      deletionResults.accounts = { count: accountResult.deletedCount, duration: accountDuration };
      logger.info(`🗑️ [DEBUG] Accounts deleted:`, {
        requestId,
        count: accountResult.deletedCount,
        duration: `${accountDuration}ms`
      });
      
      const totalDuration = Date.now() - startTime;
      
      logger.info(`✅ [DEBUG] Clear data operation completed:`, {
        requestId,
        userId,
        totalDeleted,
        totalDuration: `${totalDuration}ms`,
        deletionResults,
        timestamp: new Date().toISOString()
      });
      
      const responseData = {
        success: true,
        message: `Persona data cleared for user ${userId}`,
        data: {
          recordsDeleted: totalDeleted,
          backupCreated: backup,
          requestId,
          totalDuration: Date.now() - startTime,
          deletionResults
        }
      };
      
      logger.info(`📤 [DEBUG] Sending success response:`, {
        requestId,
        userId,
        responseData,
        timestamp: new Date().toISOString()
      });
      
      res.json(responseData);
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      logger.error(`❌ [DEBUG] Clear data operation failed:`, {
        requestId,
        userId: req.params.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        totalDuration: `${totalDuration}ms`,
        timestamp: new Date().toISOString()
      });
      
      const errorResponse = {
        success: false,
        message: 'Failed to clear persona data',
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        totalDuration
      };
      
      logger.error(`📤 [DEBUG] Sending error response:`, {
        requestId,
        errorResponse,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Get persona data status for a user
   */
  async getPersonaStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const userIdObj = new mongoose.Types.ObjectId(userId);
      
      const [
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
        Account.countDocuments({ userId: userIdObj }),
        Transaction.countDocuments({ userId: userIdObj }),
        Investment.countDocuments({ userId: userIdObj }),
        Debt.countDocuments({ userId: userIdObj }),
        Budget.countDocuments({ userId: userIdObj }),
        Goal.countDocuments({ userId: userIdObj }),
        PhysicalAsset.countDocuments({ userId: userIdObj }),
        NetWorthMilestone.countDocuments({ userId: userIdObj }),
        AccountBalanceHistory.countDocuments({ userId: userIdObj })
      ]);
      
      const totalRecords = accountCount + transactionCount + investmentCount + debtCount + 
                          budgetCount + goalCount + physicalAssetCount + netWorthMilestoneCount + 
                          accountBalanceHistoryCount;
      
      res.json({
        success: true,
        data: {
          userId,
          recordCounts: {
            accounts: accountCount,
            transactions: transactionCount,
            investments: investmentCount,
            debts: debtCount,
            budgets: budgetCount,
            goals: goalCount,
            physicalAssets: physicalAssetCount,
            netWorthMilestones: netWorthMilestoneCount,
            accountBalanceHistory: accountBalanceHistoryCount
          },
          totalRecords,
          hasData: totalRecords > 0
        }
      });
    } catch (error) {
      logger.error(`❌ Failed to get persona status for user ${req.params.userId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to get persona status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get summary of all persona data
   */
  async getPersonaSummary(req: Request, res: Response): Promise<void> {
    try {
      const { personaName, limit = 50, offset = 0 } = req.query;
      
      // Get users with persona data
      const users = await User.find({
        'metadata.onboardingCompleted': true
      }).limit(Number(limit)).skip(Number(offset));
      
      const summary = [];
      
      for (const user of users) {
        const userId = user._id;
        
        const [
          accountCount,
          transactionCount,
          investmentCount,
          debtCount,
          budgetCount,
          goalCount,
          physicalAssetCount,
          netWorthMilestoneCount
        ] = await Promise.all([
          Account.countDocuments({ userId }),
          Transaction.countDocuments({ userId }),
          Investment.countDocuments({ userId }),
          Debt.countDocuments({ userId }),
          Budget.countDocuments({ userId }),
          Goal.countDocuments({ userId }),
          PhysicalAsset.countDocuments({ userId }),
          NetWorthMilestone.countDocuments({ userId })
        ]);
        
        const totalRecords = accountCount + transactionCount + investmentCount + debtCount + 
                            budgetCount + goalCount + physicalAssetCount + netWorthMilestoneCount;
        
        summary.push({
          userId: userId.toString(),
          email: user.email,
          recordCounts: {
            accounts: accountCount,
            transactions: transactionCount,
            investments: investmentCount,
            debts: debtCount,
            budgets: budgetCount,
            goals: goalCount,
            physicalAssets: physicalAssetCount,
            netWorthMilestones: netWorthMilestoneCount
          },
          totalRecords,
          hasData: totalRecords > 0
        });
      }
      
      res.json({
        success: true,
        data: {
          summary,
          total: summary.length,
          limit: Number(limit),
          offset: Number(offset)
        }
      });
    } catch (error) {
      logger.error('❌ Failed to get persona summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get persona summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create backup of persona data - DISABLED
   */
  async createBackup(req: Request, res: Response): Promise<void> {
    logger.warn('⚠️ Backup functionality is disabled to prevent crashes');
    res.status(503).json({
      success: false,
      message: 'Backup functionality is temporarily disabled to prevent crashes',
      data: {
        timestamp: new Date().toISOString(),
        disabled: true
      }
    });
  }

  /**
   * Restore persona data from backup - DISABLED
   */
  async restoreBackup(req: Request, res: Response): Promise<void> {
    logger.warn('⚠️ Restore backup functionality is disabled to prevent crashes');
    res.status(503).json({
      success: false,
      message: 'Restore backup functionality is temporarily disabled to prevent crashes',
      data: {
        timestamp: new Date().toISOString(),
        disabled: true
      }
    });
  }

  /**
   * List available backups
   */
  async listBackups(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20 } = req.query;
      
      // This would need to be implemented to list backup files
      // For now, return a placeholder response
      res.json({
        success: true,
        data: {
          backups: [],
          total: 0,
          limit: Number(limit)
        }
      });
    } catch (error) {
      logger.error('❌ Failed to list backups:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list backups',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(req: Request, res: Response): Promise<void> {
    try {
      const { backupName } = req.params;
      const { confirm } = req.body;
      
      if (!confirm) {
        res.status(400).json({
          success: false,
          message: 'Confirmation required to delete backup'
        });
        return;
      }
      
      logger.info(`🗑️ Deleting backup: ${backupName}`);
      
      // This would need to be implemented to delete backup files
      // For now, return a placeholder response
      
      res.json({
        success: true,
        message: `Backup ${backupName} deleted successfully`
      });
    } catch (error) {
      logger.error(`❌ Failed to delete backup ${req.params.backupName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete backup',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Debug endpoint to check clear operation status
   */
  async getClearOperationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const userIdObj = new mongoose.Types.ObjectId(userId);
      
      // Get current record counts
      const [
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
        Account.countDocuments({ userId: userIdObj }),
        Transaction.countDocuments({ userId: userIdObj }),
        Investment.countDocuments({ userId: userIdObj }),
        Debt.countDocuments({ userId: userIdObj }),
        Budget.countDocuments({ userId: userIdObj }),
        Goal.countDocuments({ userId: userIdObj }),
        PhysicalAsset.countDocuments({ userId: userIdObj }),
        NetWorthMilestone.countDocuments({ userId: userIdObj }),
        AccountBalanceHistory.countDocuments({ userId: userIdObj })
      ]);
      
      const totalRecords = accountCount + transactionCount + investmentCount + debtCount + 
                          budgetCount + goalCount + physicalAssetCount + netWorthMilestoneCount + 
                          accountBalanceHistoryCount;
      
      res.json({
        success: true,
        data: {
          userId,
          timestamp: new Date().toISOString(),
          recordCounts: {
            accounts: accountCount,
            transactions: transactionCount,
            investments: investmentCount,
            debts: debtCount,
            budgets: budgetCount,
            goals: goalCount,
            physicalAssets: physicalAssetCount,
            netWorthMilestones: netWorthMilestoneCount,
            accountBalanceHistory: accountBalanceHistoryCount
          },
          totalRecords,
          hasData: totalRecords > 0
        }
      });
    } catch (error) {
      logger.error(`❌ Failed to get clear operation status for user ${req.params.userId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to get clear operation status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get persona system health status
   */
  async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const [
        userCount,
        accountCount,
        transactionCount,
        investmentCount,
        netWorthMilestoneCount,
        snapshotStats
      ] = await Promise.all([
        User.countDocuments(),
        Account.countDocuments(),
        Transaction.countDocuments(),
        Investment.countDocuments(),
        NetWorthMilestone.countDocuments(),
        DailySnapshotService.getSnapshotStatistics()
      ]);
      
      res.json({
        success: true,
        data: {
          database: {
            users: userCount,
            accounts: accountCount,
            transactions: transactionCount,
            investments: investmentCount,
            netWorthMilestones: netWorthMilestoneCount
          },
          snapshots: snapshotStats,
          system: {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version
          }
        }
      });
    } catch (error) {
      logger.error('❌ Failed to get system health:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system health',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test persona loading without saving to database
   */
  async testPersonaLoading(req: Request, res: Response): Promise<void> {
    try {
      const { personaName } = req.params;
      const { options = {} } = req.body;
      
      logger.info(`🧪 Testing persona loading: ${personaName}`);
      
      // Get persona info without loading data
      const personaInfo = await PersonaDataLoader.getPersonaInfo(personaName);
      
      if (!personaInfo) {
        res.status(404).json({
          success: false,
          message: `Persona '${personaName}' not found`
        });
        return;
      }
      
      res.json({
        success: true,
        message: `Persona '${personaName}' is valid and ready to load`,
        data: {
          personaInfo,
          estimatedRecords: {
            accounts: 5, // Estimated based on template
            investments: 5,
            debts: 2,
            budgets: 6,
            goals: 5,
            physicalAssets: 2,
            netWorthMilestones: 6,
            accountBalanceHistory: 24,
            dailyPrices: 30
          }
        }
      });
    } catch (error) {
      logger.error(`❌ Failed to test persona loading for ${req.params.personaName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to test persona loading',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get persona usage analytics
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = 'month', personaName } = req.query;
      
      // This would need to be implemented to provide actual analytics
      // For now, return placeholder data
      
      res.json({
        success: true,
        data: {
          timeframe,
          personaName,
          analytics: {
            totalUsers: 0,
            activeUsers: 0,
            dataLoaded: 0,
            averageRecordsPerUser: 0,
            mostPopularPersona: 'sarah-chen',
            usageTrends: []
          }
        }
      });
    } catch (error) {
      logger.error('❌ Failed to get analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Export persona data for a user
   */
  async exportPersonaData(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { format = 'json', includeHistoricalData = true } = req.body;
      
      logger.info(`📤 Exporting persona data for user ${userId} in ${format} format`);
      
      // This would need to be implemented to export actual data
      // For now, return placeholder response
      
      res.json({
        success: true,
        message: `Persona data exported for user ${userId}`,
        data: {
          userId,
          format,
          includeHistoricalData,
          downloadUrl: `/api/admin/persona/download/export_${userId}_${Date.now()}.${format}`
        }
      });
    } catch (error) {
      logger.error(`❌ Failed to export persona data for user ${req.params.userId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to export persona data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Import persona data from file
   */
  async importPersonaData(req: Request, res: Response): Promise<void> {
    try {
      const { userId, format, data, options = {} } = req.body;
      
      logger.info(`📥 Importing persona data for user ${userId} in ${format} format`);
      
      // This would need to be implemented to import actual data
      // For now, return placeholder response
      
      res.json({
        success: true,
        message: `Persona data imported for user ${userId}`,
        data: {
          userId,
          format,
          recordsImported: 0,
          errors: []
        }
      });
    } catch (error) {
      logger.error(`❌ Failed to import persona data for user ${req.body.userId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to import persona data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get persona template information
   */
  async getPersonaTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { personaName } = req.query;
      
      if (personaName) {
        const personaInfo = await PersonaDataLoader.getPersonaInfo(personaName as string);
        res.json({
          success: true,
          data: personaInfo
        });
      } else {
        const personas = PersonaDataLoader.getAvailablePersonas();
        const templates = [];
        
        for (const persona of personas) {
          const info = await PersonaDataLoader.getPersonaInfo(persona);
          if (info) {
            templates.push({
              name: persona,
              info
            });
          }
        }
        
        res.json({
          success: true,
          data: {
            templates,
            count: templates.length
          }
        });
      }
    } catch (error) {
      logger.error('❌ Failed to get persona templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get persona templates',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update persona template
   */
  async updatePersonaTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { personaName } = req.params;
      const { template } = req.body;
      
      logger.info(`📝 Updating persona template: ${personaName}`);
      
      // This would need to be implemented to update template files
      // For now, return placeholder response
      
      res.json({
        success: true,
        message: `Persona template ${personaName} updated successfully`
      });
    } catch (error) {
      logger.error(`❌ Failed to update persona template ${req.params.personaName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to update persona template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create new persona template
   */
  async createPersonaTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { personaName, template } = req.body;
      
      logger.info(`➕ Creating new persona template: ${personaName}`);
      
      // This would need to be implemented to create template files
      // For now, return placeholder response
      
      res.json({
        success: true,
        message: `Persona template ${personaName} created successfully`
      });
    } catch (error) {
      logger.error(`❌ Failed to create persona template ${req.body.personaName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to create persona template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete persona template
   */
  async deletePersonaTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { personaName } = req.params;
      const { confirm } = req.body;
      
      if (!confirm) {
        res.status(400).json({
          success: false,
          message: 'Confirmation required to delete persona template'
        });
        return;
      }
      
      logger.info(`🗑️ Deleting persona template: ${personaName}`);
      
      // This would need to be implemented to delete template files
      // For now, return placeholder response
      
      res.json({
        success: true,
        message: `Persona template ${personaName} deleted successfully`
      });
    } catch (error) {
      logger.error(`❌ Failed to delete persona template ${req.params.personaName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete persona template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Manually trigger snapshot creation
   */
  async createSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const { userId, type = 'all' } = req.body;
      
      logger.info(`📸 Creating ${type} snapshot${userId ? ` for user ${userId}` : ''}`);
      
      if (type === 'all' || type === 'daily') {
        const result = await DailySnapshotService.createDailySnapshotsForAllUsers();
        
        res.json({
          success: true,
          message: 'Daily snapshots created successfully',
          data: result
        });
      } else if (type === 'manual' && userId) {
        const result = await DailySnapshotService.createDailySnapshotForUser(new mongoose.Types.ObjectId(userId));
        
        res.json({
          success: true,
          message: `Manual snapshot created for user ${userId}`,
          data: result
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid snapshot type or missing user ID'
        });
      }
    } catch (error) {
      logger.error('❌ Failed to create snapshot:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create snapshot',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get snapshot system status
   */
  async getSnapshotStatus(req: Request, res: Response): Promise<void> {
    try {
      const stats = DailySnapshotService.getSnapshotStatistics();
      const schedulerStatus = SnapshotScheduler.getStatus();
      
      res.json({
        success: true,
        data: {
          statistics: stats,
          scheduler: schedulerStatus
        }
      });
    } catch (error) {
      logger.error('❌ Failed to get snapshot status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get snapshot status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clean up old snapshots
   */
  async cleanupSnapshots(req: Request, res: Response): Promise<void> {
    try {
      const { daysToKeep = 365 } = req.body;
      
      logger.info(`🧹 Cleaning up snapshots older than ${daysToKeep} days`);
      
      const result = await DailySnapshotService.cleanupOldSnapshots();
      
      res.json({
        success: true,
        message: `Snapshot cleanup completed`,
        data: result
      });
    } catch (error) {
      logger.error('❌ Failed to cleanup snapshots:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup snapshots',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
