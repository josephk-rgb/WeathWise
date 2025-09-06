import dotenv from 'dotenv';
import path from 'path';

// Load environment variables with fallback paths
const possibleEnvPaths = [
  path.resolve(__dirname, '..', '..', '.env'),          // backend/.env
  path.resolve(__dirname, '..', '..', '..', '.env'),    // root/.env
  path.resolve(process.cwd(), 'backend', '.env'),       // from root/backend/.env
  path.resolve(process.cwd(), '.env')                   // current working directory
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  const envExists = require('fs').existsSync(envPath);
  if (envExists) {
    console.log(`Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('No .env file found, using default configuration');
  dotenv.config();
}

import mongoose from 'mongoose';
import { User } from '../models/User';
import { connectDB } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * Migration script to add role field to existing users
 * Run this script to update the User model with the new role field
 */

async function addRoleFieldToUsers() {
  try {
    console.log('Starting migration: Adding role field to existing users...');
    
    // Connect to database with fallback
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/wealthwise';
    console.log(`Connecting to MongoDB: ${mongoUri}`);
    
    // Connect to database
    await connectDB();
    
    // Update all existing users to have 'user' role if they don't have a role
    const result = await User.updateMany(
      { role: { $exists: false } }, // Find users without role field
      { $set: { role: 'user' } }    // Set default role to 'user'
    );
    
    console.log(`✅ Migration completed: Updated ${result.modifiedCount} users with default role 'user'`);
    
    // Optionally, set a specific user as admin (replace with actual email)
    const adminEmail = process.env.ADMIN_EMAIL; // Set this in your .env file
    if (adminEmail) {
      const adminResult = await User.updateOne(
        { email: adminEmail },
        { $set: { role: 'admin' } }
      );
      
      if (adminResult.matchedCount > 0) {
        console.log(`✅ Set user with email '${adminEmail}' as admin`);
      } else {
        console.log(`⚠️  No user found with email '${adminEmail}' to set as admin`);
      }
    } else {
      console.log('💡 To set a specific user as admin, set ADMIN_EMAIL in your .env file and run this script again');
    }
    
    // Show current role distribution
    const roleCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📊 Current role distribution:');
    roleCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count} users`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔐 Database connection closed');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  addRoleFieldToUsers()
    .then(() => {
      console.log('✨ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { addRoleFieldToUsers };
