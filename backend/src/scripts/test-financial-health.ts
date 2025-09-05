#!/usr/bin/env ts-node

/**
 * Test script to verify Financial Health database integration
 * Run with: npx ts-node src/scripts/test-financial-health.ts
 */

import mongoose from 'mongoose';
import { Transaction, Investment, Goal } from '../models';
import { connectDB } from '../utils/database';

async function testFinancialHealthDataRetrieval() {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Get a sample user ID (you can replace this with an actual user ID)
    const sampleUserId = new mongoose.Types.ObjectId();
    console.log(`🔍 Testing with sample User ID: ${sampleUserId}`);

    // Test Transaction queries
    console.log('\n📊 Testing Transaction Data Retrieval...');
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await Transaction.find({
      userId: sampleUserId,
      'transactionInfo.date': { $gte: sixMonthsAgo }
    });

    console.log(`   Found ${transactions.length} transactions in last 6 months`);
    
    if (transactions.length > 0) {
      const incomeTransactions = transactions.filter(t => t.transactionInfo.type === 'income');
      const expenseTransactions = transactions.filter(t => t.transactionInfo.type === 'expense');
      
      console.log(`   - Income transactions: ${incomeTransactions.length}`);
      console.log(`   - Expense transactions: ${expenseTransactions.length}`);
      
      // Test debt detection
      const debtTransactions = transactions.filter(t => 
        t.transactionInfo.type === 'expense' && 
        ['debt', 'loan', 'credit', 'mortgage'].some(keyword => 
          t.transactionInfo.category.toLowerCase().includes(keyword)
        )
      );
      console.log(`   - Debt-related transactions: ${debtTransactions.length}`);
    }

    // Test Investment queries
    console.log('\n💰 Testing Investment Data Retrieval...');
    const investments = await Investment.find({ 
      userId: sampleUserId, 
      isActive: true 
    });
    
    console.log(`   Found ${investments.length} active investments`);
    
    if (investments.length > 0) {
      const assetTypes = new Set(investments.map(inv => inv.securityInfo.type));
      const totalValue = investments.reduce((sum, inv) => sum + inv.position.marketValue, 0);
      
      console.log(`   - Asset types: ${Array.from(assetTypes).join(', ')}`);
      console.log(`   - Total portfolio value: $${totalValue.toFixed(2)}`);
    }

    // Test Goal queries
    console.log('\n🎯 Testing Goal Data Retrieval...');
    const emergencyFundGoal = await Goal.findOne({ 
      userId: sampleUserId, 
      category: 'Emergency Fund', 
      isActive: true 
    });
    
    if (emergencyFundGoal) {
      console.log(`   Found emergency fund goal: $${emergencyFundGoal.currentAmount}/$${emergencyFundGoal.targetAmount}`);
    } else {
      console.log(`   No emergency fund goal found`);
    }

    // Test with real data if any exists
    console.log('\n🔍 Checking for any real data in database...');
    const totalTransactions = await Transaction.countDocuments();
    const totalInvestments = await Investment.countDocuments();
    const totalGoals = await Goal.countDocuments();
    
    console.log(`   Total transactions in DB: ${totalTransactions}`);
    console.log(`   Total investments in DB: ${totalInvestments}`);
    console.log(`   Total goals in DB: ${totalGoals}`);

    if (totalTransactions > 0 || totalInvestments > 0 || totalGoals > 0) {
      console.log('\n✅ Database contains actual data! Financial health calculations will use real user data.');
    } else {
      console.log('\n⚠️  Database is empty. Consider adding sample data or check data seeding.');
    }

  } catch (error) {
    console.error('❌ Error testing financial health data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the test
testFinancialHealthDataRetrieval();
