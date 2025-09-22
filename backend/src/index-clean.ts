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

console.log('Final environment Debug:');
console.log('AUTH0_DOMAIN:', process.env['AUTH0_DOMAIN']);
console.log('AUTH0_AUDIENCE:', process.env['AUTH0_AUDIENCE']);
console.log('NODE_ENV:', process.env['NODE_ENV']);
console.log('PORT:', process.env['PORT']);

// NOW import everything else after env vars are loaded
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import portfolioRoutes from './routes/portfolio';
import transactionRoutes from './routes/transactions';
import investmentRoutes from './routes/investments';
import marketRoutes from './routes/market';
import aiRoutes from './routes/ai';
import goalRoutes from './routes/goals';
import authTestRoutes from './routes/auth-test';

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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Accept', 'Accept-Encoding', 'Accept-Language', 'User-Agent'],
  optionsSuccessStatus: 200
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'],
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
app.use('/api/market', authMiddleware, marketRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// WebSocket setup for real-time data
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, _req) => {
  logger.info('New WebSocket connection established');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      logger.info('WebSocket message received:', data);
      
      // Handle different message types
      switch (data.type) {
        case 'subscribe_market_data':
          // Subscribe to market data updates
          break;
        case 'portfolio_update':
          // Handle portfolio updates
          break;
        default:
          ws.send(JSON.stringify({ error: 'Unknown message type' }));
      }
    } catch (error) {
      logger.error('WebSocket message parsing error:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    logger.info('WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
  });
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
    // Try to connect to database, but continue without it for Auth0 testing
    try {
      await connectDB();
      logger.info('Database connected successfully');
    } catch (dbError) {
      logger.warn('Database connection failed, continuing without DB for Auth0 testing:', dbError);
    }
    
    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env['NODE_ENV']}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
  logger.error('Promise:', promise);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
