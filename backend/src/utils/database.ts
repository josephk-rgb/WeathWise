import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectDB(): Promise<void> {
  try {
    const baseUri = process.env['MONGODB_URI'] || 'mongodb://localhost:27017';
    const dbName = process.env['MONGODB_DB_NAME'] || 'wealthwise';
    
    let mongoUri: string;
    
    if (baseUri.includes('mongodb+srv://')) {
      // Atlas connection - insert database name before query parameters
      if (baseUri.includes('mongodb.net/?')) {
        mongoUri = baseUri.replace('mongodb.net/?', `mongodb.net/${dbName}?`);
      } else if (baseUri.includes('mongodb.net/')) {
        mongoUri = baseUri.replace('mongodb.net/', `mongodb.net/${dbName}/`);
      } else {
        mongoUri = baseUri;
      }
    } else {
      // Local MongoDB connection
      mongoUri = `${baseUri}/${dbName}`;
    }
    
    if (!process.env['MONGODB_URI']) {
      logger.warn(`MONGODB_URI environment variable not found, using default: mongodb://localhost:27017/${dbName}`);
    }
    
    logger.info(`Connecting to database: ${dbName}`);
    logger.info(`Mongo URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials for debugging

    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased for Atlas
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });

    logger.info(`MongoDB connected successfully to database: ${dbName}`);
    logger.info(`Connection string: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}

