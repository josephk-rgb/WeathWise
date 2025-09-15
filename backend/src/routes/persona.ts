import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PersonaController } from '../controllers/personaController';
import { authMiddleware } from '../middleware/auth';
import { adminOnlyMiddleware } from '../middleware/adminOnly';
import rateLimit from 'express-rate-limit';

const router = Router();
const personaController = new PersonaController();

/**
 * Persona Management Routes
 * 
 * These routes provide admin functionality for managing persona data,
 * including loading, validating, and managing persona-based mock data.
 */

// Apply rate limiting to all persona routes
const personaRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many persona requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(personaRateLimit);

// Apply authentication to all routes
router.use(authMiddleware);

// Apply admin middleware to all routes (only admins can manage personas)
router.use(adminOnlyMiddleware);

/**
 * @route GET /api/admin/persona/available
 * @desc Get available personas
 * @access Admin
 */
router.get('/available', personaController.getAvailablePersonas);

/**
 * @route GET /api/admin/persona/info/:personaName
 * @desc Get persona information
 * @access Admin
 */
router.get('/info/:personaName', [
  param('personaName').isString().notEmpty().withMessage('Persona name is required'),
], personaController.getPersonaInfo);

/**
 * @route POST /api/admin/persona/load/:userId
 * @desc Load persona data for a user
 * @access Admin
 */
router.post('/load/:userId', [
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  body('personaName').isString().notEmpty().withMessage('Persona name is required'),
  body('options').optional().isObject().withMessage('Options must be an object'),
  body('options.clearExistingData').optional().isBoolean().withMessage('clearExistingData must be boolean'),
  body('options.generateHistoricalData').optional().isBoolean().withMessage('generateHistoricalData must be boolean'),
  body('options.batchSize').optional().isInt({ min: 1, max: 10000 }).withMessage('batchSize must be between 1 and 10000'),
  body('options.validateData').optional().isBoolean().withMessage('validateData must be boolean'),
], personaController.loadPersonaData);

/**
 * @route POST /api/admin/persona/load-bulk
 * @desc Load persona data for multiple users
 * @access Admin
 */
router.post('/load-bulk', [
  body('userIds').isArray({ min: 1, max: 10 }).withMessage('userIds must be an array with 1-10 items'),
  body('userIds.*').isMongoId().withMessage('Each user ID must be valid'),
  body('personaName').isString().notEmpty().withMessage('Persona name is required'),
  body('options').optional().isObject().withMessage('Options must be an object'),
], personaController.loadPersonaDataBulk);

/**
 * @route GET /api/admin/persona/validate/:userId
 * @desc Validate persona data for a user
 * @access Admin
 */
router.get('/validate/:userId', [
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  query('config').optional().isObject().withMessage('Config must be an object'),
], personaController.validatePersonaData);

/**
 * @route POST /api/admin/persona/generate-historical/:userId
 * @desc Generate historical data for a user
 * @access Admin
 */
router.post('/generate-historical/:userId', [
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  body('config').optional().isObject().withMessage('Config must be an object'),
  body('config.startDate').optional().isISO8601().withMessage('startDate must be valid ISO date'),
  body('config.endDate').optional().isISO8601().withMessage('endDate must be valid ISO date'),
  body('config.accountBalanceGranularity').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid granularity'),
  body('config.investmentPriceGranularity').optional().isIn(['daily', 'weekly']).withMessage('Invalid granularity'),
  body('config.netWorthSnapshotFrequency').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid frequency'),
], personaController.generateHistoricalData);

/**
 * @route DELETE /api/admin/persona/clear/:userId
 * @desc Clear all persona data for a user
 * @access Admin
 */
router.delete('/clear/:userId', [
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  body('confirm').equals('true').withMessage('Confirmation required'),
  body('backup').optional().isBoolean().withMessage('backup must be boolean'),
], personaController.clearPersonaData);

/**
 * @route GET /api/admin/persona/debug/clear-status/:userId
 * @desc Get clear operation status for debugging
 * @access Admin
 */
router.get('/debug/clear-status/:userId', [
  param('userId').isMongoId().withMessage('Valid user ID is required'),
], personaController.getClearOperationStatus);

/**
 * @route GET /api/admin/persona/status/:userId
 * @desc Get persona data status for a user
 * @access Admin
 */
router.get('/status/:userId', [
  param('userId').isMongoId().withMessage('Valid user ID is required'),
], personaController.getPersonaStatus);

/**
 * @route GET /api/admin/persona/summary
 * @desc Get summary of all persona data
 * @access Admin
 */
router.get('/summary', [
  query('personaName').optional().isString().withMessage('personaName must be string'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('offset must be non-negative'),
], personaController.getPersonaSummary);

/**
 * @route POST /api/admin/persona/backup
 * @desc Create backup of persona data
 * @access Admin
 */
router.post('/backup', [
  body('userId').optional().isMongoId().withMessage('userId must be valid if provided'),
  body('personaName').optional().isString().withMessage('personaName must be string if provided'),
  body('includeHistoricalData').optional().isBoolean().withMessage('includeHistoricalData must be boolean'),
], personaController.createBackup);

/**
 * @route POST /api/admin/persona/restore
 * @desc Restore persona data from backup
 * @access Admin
 */
router.post('/restore', [
  body('backupName').isString().notEmpty().withMessage('backupName is required'),
  body('userId').optional().isMongoId().withMessage('userId must be valid if provided'),
  body('confirm').equals('true').withMessage('Confirmation required'),
], personaController.restoreBackup);

/**
 * @route GET /api/admin/persona/backups
 * @desc List available backups
 * @access Admin
 */
router.get('/backups', [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
], personaController.listBackups);

/**
 * @route DELETE /api/admin/persona/backup/:backupName
 * @desc Delete a backup
 * @access Admin
 */
router.delete('/backup/:backupName', [
  param('backupName').isString().notEmpty().withMessage('backupName is required'),
  body('confirm').equals('true').withMessage('Confirmation required'),
], personaController.deleteBackup);

/**
 * @route GET /api/admin/persona/health
 * @desc Get persona system health status
 * @access Admin
 */
router.get('/health', personaController.getSystemHealth);

/**
 * @route POST /api/admin/persona/test/:personaName
 * @desc Test persona loading without saving to database
 * @access Admin
 */
router.post('/test/:personaName', [
  param('personaName').isString().notEmpty().withMessage('Persona name is required'),
  body('options').optional().isObject().withMessage('Options must be an object'),
], personaController.testPersonaLoading);

/**
 * @route GET /api/admin/persona/analytics
 * @desc Get persona usage analytics
 * @access Admin
 */
router.get('/analytics', [
  query('timeframe').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Invalid timeframe'),
  query('personaName').optional().isString().withMessage('personaName must be string'),
], personaController.getAnalytics);

/**
 * @route POST /api/admin/persona/export/:userId
 * @desc Export persona data for a user
 * @access Admin
 */
router.post('/export/:userId', [
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  body('format').optional().isIn(['json', 'csv', 'xlsx']).withMessage('Invalid export format'),
  body('includeHistoricalData').optional().isBoolean().withMessage('includeHistoricalData must be boolean'),
], personaController.exportPersonaData);

/**
 * @route POST /api/admin/persona/import
 * @desc Import persona data from file
 * @access Admin
 */
router.post('/import', [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('format').isIn(['json', 'csv', 'xlsx']).withMessage('Invalid import format'),
  body('data').isString().notEmpty().withMessage('Data is required'),
  body('options').optional().isObject().withMessage('Options must be an object'),
], personaController.importPersonaData);

/**
 * @route GET /api/admin/persona/templates
 * @desc Get persona template information
 * @access Admin
 */
router.get('/templates', [
  query('personaName').optional().isString().withMessage('personaName must be string'),
], personaController.getPersonaTemplates);

/**
 * @route PUT /api/admin/persona/template/:personaName
 * @desc Update persona template
 * @access Admin
 */
router.put('/template/:personaName', [
  param('personaName').isString().notEmpty().withMessage('Persona name is required'),
  body('template').isObject().withMessage('Template data is required'),
], personaController.updatePersonaTemplate);

/**
 * @route POST /api/admin/persona/template
 * @desc Create new persona template
 * @access Admin
 */
router.post('/template', [
  body('personaName').isString().notEmpty().withMessage('Persona name is required'),
  body('template').isObject().withMessage('Template data is required'),
], personaController.createPersonaTemplate);

/**
 * @route DELETE /api/admin/persona/template/:personaName
 * @desc Delete persona template
 * @access Admin
 */
router.delete('/template/:personaName', [
  param('personaName').isString().notEmpty().withMessage('Persona name is required'),
  body('confirm').equals('true').withMessage('Confirmation required'),
], personaController.deletePersonaTemplate);

/**
 * @route POST /api/admin/persona/snapshot/create
 * @desc Manually trigger snapshot creation
 * @access Admin
 */
router.post('/snapshot/create', [
  body('userId').optional().isMongoId().withMessage('userId must be valid if provided'),
  body('type').optional().isIn(['daily', 'manual', 'all']).withMessage('Invalid snapshot type'),
], personaController.createSnapshot);

/**
 * @route GET /api/admin/persona/snapshot/status
 * @desc Get snapshot system status
 * @access Admin
 */
router.get('/snapshot/status', personaController.getSnapshotStatus);

/**
 * @route POST /api/admin/persona/snapshot/cleanup
 * @desc Clean up old snapshots
 * @access Admin
 */
router.post('/snapshot/cleanup', [
  body('daysToKeep').optional().isInt({ min: 1, max: 3650 }).withMessage('daysToKeep must be between 1 and 3650'),
], personaController.cleanupSnapshots);

// Error handling middleware
router.use((req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
});

export default router;
