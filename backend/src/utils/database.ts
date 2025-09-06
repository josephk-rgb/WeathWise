import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectDB(): Promise<void> {
  try {
    const baseUri = process.env['MONGODB_URI'] || 'mongodb://localhost:27017';
    const dbName = process.env['MONGODB_DB_NAME'] || 'wealthwise';
    
    // Construct the full URI with database name
    const mongoUri = baseUri.includes('mongodb+srv://') 
      ? `${baseUri.replace('/?', `/${dbName}?`)}`
      : `${baseUri}/${dbName}`;
    
    if (!process.env['MONGODB_URI']) {
      logger.warn(`MONGODB_URI environment variable not found, using default: mongodb://localhost:27017/${dbName}`);
    }
    
    logger.info(`Connecting to database: ${dbName}`);

    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
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

