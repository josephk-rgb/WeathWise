import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { MockDataService, MockDataConfig } from '../services/MockDataService';

export class MockDataController {
  private mockDataService: MockDataService;

  constructor() {
    this.mockDataService = new MockDataService();
  }

  // Generate mock data for admin user
  generateMockData = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const userId = new mongoose.Types.ObjectId(req.user.id);

      // Get configuration from request body or use defaults
      const config: MockDataConfig = {
        userId,
        monthsOfHistory: req.body.monthsOfHistory || 12,
        numberOfAccounts: req.body.numberOfAccounts || 4,
        accountTypes: req.body.accountTypes || ['checking', 'savings', 'credit', 'investment'],
        includeInvestments: req.body.includeInvestments !== false, // Default to true
        includeBudgetsAndGoals: req.body.includeBudgetsAndGoals !== false, // Default to true
        includeDebts: req.body.includeDebts !== false, // Default to true
        transactionsPerMonth: req.body.transactionsPerMonth || 75
      };

      console.log('Generating mock data with config:', config);

      // Clear existing data if requested
      if (req.body.clearExisting !== false) { // Default to true
        await this.mockDataService.clearMockDataForUser(userId);
      }

      // Generate mock data
      const result = await this.mockDataService.generateMockDataForAdmin(config);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          summary: result.summary,
          warnings: result.errors // Include any non-fatal errors as warnings
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.message,
          details: result.errors
        });
      }

    } catch (error) {
      console.error('Mock data generation controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during mock data generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get current data summary for admin user
  getDataSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const userId = new mongoose.Types.ObjectId(req.user.id);
      const summary = await this.mockDataService.getDataSummary(userId);

      res.json({
        success: true,
        summary
      });

    } catch (error) {
      console.error('Get data summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get data summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Clear all mock data for admin user
  clearMockData = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const userId = new mongoose.Types.ObjectId(req.user.id);
      await this.mockDataService.clearMockDataForUser(userId);

      res.json({
        success: true,
        message: 'All mock data cleared successfully'
      });

    } catch (error) {
      console.error('Clear mock data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear mock data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Get default configuration options
  getDefaultConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const userId = new mongoose.Types.ObjectId(req.user.id);
      const defaultConfig = MockDataService.getDefaultConfig(userId);

      // Remove userId from response for security
      const { userId: _, ...configWithoutUserId } = defaultConfig;

      res.json({
        success: true,
        defaultConfig: configWithoutUserId,
        options: {
          accountTypes: ['checking', 'savings', 'investment', 'retirement', 'credit', 'loan'],
          monthsRange: { min: 3, max: 24 },
          accountsRange: { min: 2, max: 8 },
          transactionsRange: { min: 20, max: 150 }
        }
      });

    } catch (error) {
      console.error('Get default config error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get default configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

// Validation middleware for mock data generation
export const validateMockDataGeneration = [
  body('monthsOfHistory')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('Months of history must be between 1 and 24'),
  
  body('numberOfAccounts')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Number of accounts must be between 1 and 10'),
  
  body('accountTypes')
    .optional()
    .isArray()
    .withMessage('Account types must be an array'),
  
  body('accountTypes.*')
    .optional()
    .isIn(['checking', 'savings', 'investment', 'retirement', 'credit', 'loan'])
    .withMessage('Invalid account type'),
  
  body('includeInvestments')
    .optional()
    .isBoolean()
    .withMessage('Include investments must be a boolean'),
  
  body('includeBudgetsAndGoals')
    .optional()
    .isBoolean()
    .withMessage('Include budgets and goals must be a boolean'),
  
  body('includeDebts')
    .optional()
    .isBoolean()
    .withMessage('Include debts must be a boolean'),
  
  body('transactionsPerMonth')
    .optional()
    .isInt({ min: 10, max: 200 })
    .withMessage('Transactions per month must be between 10 and 200'),
  
  body('clearExisting')
    .optional()
    .isBoolean()
    .withMessage('Clear existing must be a boolean')
];
