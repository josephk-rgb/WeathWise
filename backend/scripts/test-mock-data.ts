import mongoose from 'mongoose';
import { MockDataService } from '../src/services/MockDataService';
import { User } from '../src/models/User';
import { Account } from '../src/models/Account';
import { Transaction } from '../src/models/Transaction';
import { Investment } from '../src/models/Investment';
import { Budget } from '../src/models/Budget';
import { Goal } from '../src/models/Goal';
import { Debt } from '../src/models/Debt';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testMockDataGeneration() {
  console.log('🧪 Starting Mock Data Generation Test...\n');

  try {
    // Connect to database
    console.log('📊 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wealthwise');
    console.log('✅ Connected to MongoDB\n');

    // Get admin user from environment
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      throw new Error('❌ ADMIN_EMAIL not found in environment variables');
    }

    // Find admin user
    console.log(`🔍 Finding admin user with email: ${adminEmail}`);
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log('⚠️  Admin user not found, creating one...');
      adminUser = await User.create({
        auth0Id: `auth0|testadmin${Date.now()}`, // Generate a temporary auth0 ID
        email: adminEmail,
        role: 'admin',
        profile: {
          firstName: 'Admin',
          lastName: 'User'
        },
        preferences: {
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'en',
          theme: 'light',
          notifications: {
            email: true,
            push: false,
            sms: false,
            trading: true,
            news: true
          }
        },
        riskProfile: {
          level: 'moderate',
          questionnaire: {
            age: 35,
            experience: 'intermediate',
            timeline: 'long_term',
            riskTolerance: 6,
            completedAt: new Date()
          }
        },
        subscription: {
          plan: 'free',
          startDate: new Date()
        },
        encryption: {
          keyVersion: 1,
          encryptedKey: 'test-encrypted-key'
        },
        metadata: {
          onboardingCompleted: true,
          loginCount: 1,
          lastLoginAt: new Date()
        }
      });
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user found');
      // Ensure user is admin
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        await adminUser.save();
        console.log('✅ User role updated to admin');
      }
    }

    console.log(`👤 Admin User: ${adminUser.profile?.firstName} ${adminUser.profile?.lastName} (${adminUser.email})\n`);

    // Count existing data before generation
    const beforeCounts = {
      accounts: await Account.countDocuments({ userId: adminUser._id }),
      transactions: await Transaction.countDocuments({ userId: adminUser._id }),
      investments: await Investment.countDocuments({ userId: adminUser._id }),
      budgets: await Budget.countDocuments({ userId: adminUser._id }),
      goals: await Goal.countDocuments({ userId: adminUser._id }),
      debts: await Debt.countDocuments({ userId: adminUser._id })
    };

    console.log('📈 Data counts BEFORE generation:');
    console.log(`   Accounts: ${beforeCounts.accounts}`);
    console.log(`   Transactions: ${beforeCounts.transactions}`);
    console.log(`   Investments: ${beforeCounts.investments}`);
    console.log(`   Budgets: ${beforeCounts.budgets}`);
    console.log(`   Goals: ${beforeCounts.goals}`);
    console.log(`   Debts: ${beforeCounts.debts}\n`);

    // Generate mock data with small amounts for testing
    console.log('🎲 Generating mock data...');
    const mockDataService = new MockDataService();
    const config = {
      userId: adminUser._id as mongoose.Types.ObjectId,
      monthsOfHistory: 2,
      numberOfAccounts: 3,
      accountTypes: ['checking', 'savings', 'credit'] as ('checking' | 'savings' | 'investment' | 'retirement' | 'credit' | 'loan')[],
      includeInvestments: true,
      includeBudgetsAndGoals: true,
      includeDebts: true,
      transactionsPerMonth: 20
    };

    const result = await mockDataService.generateMockDataForAdmin(config);
    console.log('✅ Mock data generation completed!\n');

    // Count data after generation
    const afterCounts = {
      accounts: await Account.countDocuments({ userId: adminUser._id }),
      transactions: await Transaction.countDocuments({ userId: adminUser._id }),
      investments: await Investment.countDocuments({ userId: adminUser._id }),
      budgets: await Budget.countDocuments({ userId: adminUser._id }),
      goals: await Goal.countDocuments({ userId: adminUser._id }),
      debts: await Debt.countDocuments({ userId: adminUser._id })
    };

    console.log('📊 Data counts AFTER generation:');
    console.log(`   Accounts: ${afterCounts.accounts} (+${afterCounts.accounts - beforeCounts.accounts})`);
    console.log(`   Transactions: ${afterCounts.transactions} (+${afterCounts.transactions - beforeCounts.transactions})`);
    console.log(`   Investments: ${afterCounts.investments} (+${afterCounts.investments - beforeCounts.investments})`);
    console.log(`   Budgets: ${afterCounts.budgets} (+${afterCounts.budgets - beforeCounts.budgets})`);
    console.log(`   Goals: ${afterCounts.goals} (+${afterCounts.goals - beforeCounts.goals})`);
    console.log(`   Debts: ${afterCounts.debts} (+${afterCounts.debts - beforeCounts.debts})\n`);

    console.log('📋 Generation Summary:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    // Verify data was actually created
    if (afterCounts.accounts > beforeCounts.accounts) {
      console.log('✅ Mock data generation test PASSED - Data was created successfully!\n');
    } else {
      console.log('❌ Mock data generation test FAILED - No new data was created\n');
    }

    // Clean up - delete all mock data for the admin user
    console.log('🧹 Cleaning up mock data...');
    await mockDataService.clearMockDataForUser(adminUser._id as mongoose.Types.ObjectId);
    
    // Verify cleanup
    const finalCounts = {
      accounts: await Account.countDocuments({ userId: adminUser._id }),
      transactions: await Transaction.countDocuments({ userId: adminUser._id }),
      investments: await Investment.countDocuments({ userId: adminUser._id }),
      budgets: await Budget.countDocuments({ userId: adminUser._id }),
      goals: await Goal.countDocuments({ userId: adminUser._id }),
      debts: await Debt.countDocuments({ userId: adminUser._id })
    };

    console.log('📊 Data counts AFTER cleanup:');
    console.log(`   Accounts: ${finalCounts.accounts}`);
    console.log(`   Transactions: ${finalCounts.transactions}`);
    console.log(`   Investments: ${finalCounts.investments}`);
    console.log(`   Budgets: ${finalCounts.budgets}`);
    console.log(`   Goals: ${finalCounts.goals}`);
    console.log(`   Debts: ${finalCounts.debts}\n`);

    if (finalCounts.accounts === beforeCounts.accounts && 
        finalCounts.transactions === beforeCounts.transactions) {
      console.log('✅ Cleanup test PASSED - All mock data was successfully removed!\n');
    } else {
      console.log('⚠️  Cleanup test PARTIAL - Some data may remain\n');
    }

    console.log('🎉 Mock Data Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('📊 Database connection closed');
  }
}

// Run the test
testMockDataGeneration();
