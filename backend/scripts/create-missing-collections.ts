import mongoose from 'mongoose';
import { logger } from '../src/utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Script to create missing collections in the database
 * This ensures that the database optimization script can create indexes for all collections
 */

async function createMissingCollections() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    console.log(`Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials
    await mongoose.connect(mongoUri);
    logger.info('📊 Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Collections to create
    const collectionsToCreate = [
      'accountbalancehistories',
      'useraccountpreferences'
    ];

    logger.info('🚀 Creating missing collections...');

    for (const collectionName of collectionsToCreate) {
      try {
        // Check if collection already exists
        const collections = await db.listCollections({ name: collectionName }).toArray();
        
        if (collections.length === 0) {
          // Create the collection by inserting and immediately deleting a document
          const tempCollection = db.collection(collectionName);
          await tempCollection.insertOne({ _temp: true, createdAt: new Date() });
          await tempCollection.deleteOne({ _temp: true });
          
          logger.info(`✅ Created collection: ${collectionName}`);
        } else {
          logger.info(`⏭️ Collection already exists: ${collectionName}`);
        }
      } catch (error) {
        logger.error(`❌ Failed to create collection ${collectionName}:`, error);
      }
    }

    // Verify collections exist
    logger.info('📋 Verifying collections...');
    const allCollections = await db.listCollections().toArray();
    const collectionNames = allCollections.map(col => col.name);
    
    for (const collectionName of collectionsToCreate) {
      if (collectionNames.includes(collectionName)) {
        logger.info(`✅ Verified: ${collectionName} exists`);
      } else {
        logger.warn(`⚠️ Warning: ${collectionName} was not created`);
      }
    }

    logger.info('✅ Collection creation completed successfully');

  } catch (error) {
    logger.error('💥 Collection creation failed:', error);
    throw error;
  } finally {
    // Close connection
    await mongoose.connection.close();
    logger.info('📊 Database connection closed');
  }
}

// Run if this script is executed directly
if (require.main === module) {
  createMissingCollections()
    .then(() => {
      logger.info('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export default createMissingCollections;
