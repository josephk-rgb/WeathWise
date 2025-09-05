// IMPORTANT: Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables - try multiple paths to be robust
const possibleEnvPaths = [
  path.resolve(__dirname, '..', '.env'),          // backend/.env
  path.resolve(__dirname, '..', '..', '.env'),    // root/.env
  path.resolve(process.cwd(), 'backend', '.env'), // from root/backend/.env
  path.resolve(process.cwd(), '.env')             // current working directory
];

console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  const envExists = require('fs').existsSync(envPath);
  console.log(`Checking .env at: ${envPath} - exists: ${envExists}`);
  
  if (envExists) {
    console.log(`Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    if (process.env['AUTH0_DOMAIN']) {
      envLoaded = true;
      break;
    }
  }
}

if (!envLoaded) {
  console.log('No .env file with AUTH0_DOMAIN found, trying default dotenv.config()');
  dotenv.config();
}

// NOW import everything else after env vars are loaded
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import portfolioRoutes from './routes/portfolio';
import transactionRoutes from './routes/transactions';
import investmentRoutes from './routes/investments';
import marketRoutes from './routes/market';
import aiRoutes from './routes/ai';
import goalRoutes from './routes/goals';
import budgetRoutes from './routes/budgets';
import analyticsRoutes from './routes/analytics';
import authTestRoutes from './routes/auth-test';
import testApisRoutes from './routes/test-apis';
import mlProxyRoutes from './routes/ml-proxy';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';
import { connectDB } from './utils/database';

const app = express();
const server = createServer(app);
const PORT = process.env['PORT'] || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // Default 15 minutes
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '500'), // Increased default limit
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count successful requests toward limit
  skipFailedRequests: false, // Count failed requests toward limit
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  const dbStatus = require('mongoose').connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'],
    database: {
      status: dbStates[dbStatus as keyof typeof dbStates] || 'unknown',
      ready: dbStatus === 1
    }
  });
});

// DEBUG: Add route debugging endpoint
app.get('/debug/routes', (_req, res) => {
  res.json({
    message: 'WeathWise Backend Route Debug',
    registered_routes: [
      'GET /health - Backend health check',
      'GET /debug/routes - This debug endpoint',
      'POST /api/auth/* - Authentication routes',
      'GET /api/users/* - User management (auth required)',
      'GET /api/portfolio/* - Portfolio data (auth required)',
      'GET /api/transactions/* - Transaction data (auth required)',
      'GET /api/investments/* - Investment data (auth required)',
      'GET /api/goals/* - Goals data (auth required)',
      'GET /api/budgets/* - Budget data (auth required)',
      'GET /api/analytics/* - Analytics data (auth required)',
      'GET /api/market/* - Market data (auth required)',
      'GET /api/ai/* - AI services (auth required)',
      'POST /api/ml/chat - ML proxy chat (auth required)',
      'GET /api/ml/health - ML proxy health (auth required)',
      'GET /api/ml/debug/routes - ML proxy debug routes',
      'GET /api/test-apis/* - Test endpoints (no auth)'
    ],
    ml_proxy_status: 'should_be_registered',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth-test', authMiddleware, authTestRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/portfolio', authMiddleware, portfolioRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/investments', authMiddleware, investmentRoutes);
app.use('/api/goals', authMiddleware, goalRoutes);
app.use('/api/budgets', authMiddleware, budgetRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/market', authMiddleware, marketRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// DEBUG: Log ML proxy route registration
console.log('🔧 [DEBUG] Registering ML proxy routes at /api/ml');
app.use('/api/ml', (req, res, next) => {
  console.log(`🔧 [DEBUG] ML proxy request: ${req.method} ${req.path} - Full URL: ${req.originalUrl}`);
  next();
}, mlProxyRoutes); // ML proxy with built-in auth

app.use('/api/test-apis', testApisRoutes); // No auth required for testing

// DEBUG: Add global route debugging
app.use('*', (req, res, next) => {
  console.log(`🔧 [DEBUG] Unmatched route: ${req.method} ${req.originalUrl}`);
  console.log(`🔧 [DEBUG] Available ML routes should be: POST /api/ml/chat, GET /api/ml/health, GET /api/ml/debug/routes`);
  next();
});

// Test ML service integration (no auth required)
app.post('/api/test-ml', async (req, res) => {
  try {
    const { AIServiceManager } = await import('./services/aiServiceManager');
    const aiService = new AIServiceManager();
    
    const { message = 'Hello from test endpoint' } = req.body;
    
    try {
      const response = await aiService.chat(message, { test: true });
      res.json({
        success: true,
        data: response,
        source: 'ml-service',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.json({
        success: false,
        error: error.message,
        fallback: 'ML service not available',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Start server
async function startServer() {
  try {
    logger.info('🚀 Starting WeathWise backend server...');
    
    // FIRST: Connect to MongoDB and wait for it to be ready
    logger.info('📊 Connecting to MongoDB...');
    await connectDB();
    logger.info('✅ MongoDB connected successfully');
    
    // ONLY start the server AFTER database is ready
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Database: ${process.env['NODE_ENV']}`);
      logger.info(`🌐 Environment: ${process.env['NODE_ENV']}`);
      logger.info(`📡 API Base URL: http://localhost:${PORT}/api`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
      logger.info('✅ Server is ready to accept requests');
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    
    // Log specific MongoDB connection errors
    if (error && typeof error === 'object' && 'name' in error) {
      logger.error('📊 Database connection error details:', {
        name: (error as any).name,
        message: (error as any).message,
        uri: process.env['MONGODB_URI'] ? 'URI configured' : 'No URI found'
      });
    }
    
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully...');
  try {
    await require('mongoose').connection.close();
    logger.info('📊 Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
  server.close(() => {
    logger.info('🛑 Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('🛑 SIGINT received, shutting down gracefully...');
  try {
    await require('mongoose').connection.close();
    logger.info('📊 Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
  server.close(() => {
    logger.info('🛑 Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

