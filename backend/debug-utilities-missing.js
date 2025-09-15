const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { Transaction, User } = require('./dist/models');

async function debugUtilitiesMissing() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/weathwise');
    console.log('✅ Connected to MongoDB');

    // Get the user with transactions
    const user = await User.findOne({ email: 'test@tpp1235.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`\n🔍 === DEBUGGING MISSING UTILITIES FOR: ${user.email} ===`);

    const userObjectId = new mongoose.Types.ObjectId(user._id);
    
    // Get all transactions
    const allTransactions = await Transaction.find({ userId: userObjectId }).lean();
    console.log(`📈 Total transactions: ${allTransactions.length}`);

    // Find all Utilities transactions
    const utilitiesTransactions = allTransactions.filter(t => 
      t.transactionInfo?.category === 'Utilities'
    );
    
    console.log(`\n🔌 ALL UTILITIES TRANSACTIONS (${utilitiesTransactions.length}):`);
    utilitiesTransactions.forEach((tx, index) => {
      const date = new Date(tx.transactionInfo?.date);
      console.log(`  ${index + 1}. ${tx.transactionInfo?.description} - $${tx.transactionInfo?.amount} - ${date.toISOString()} (${date.toLocaleDateString()})`);
    });

    // Check current month range
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    console.log('\n📅 Current month range:', {
      start: currentMonthStart.toISOString(),
      end: currentMonthEnd.toISOString(),
      month: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    });

    // Check which Utilities transactions fall within current month
    const currentMonthUtilities = utilitiesTransactions.filter(tx => {
      const transactionDate = new Date(tx.transactionInfo?.date);
      return transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd;
    });

    console.log(`\n🔌 UTILITIES TRANSACTIONS IN CURRENT MONTH: ${currentMonthUtilities.length}`);
    currentMonthUtilities.forEach((tx, index) => {
      const date = new Date(tx.transactionInfo?.date);
      console.log(`  ${index + 1}. ${tx.transactionInfo?.description} - $${tx.transactionInfo?.amount} - ${date.toISOString()}`);
    });

    // Check if there are any Utilities transactions in September 2025
    const september2025Start = new Date(2025, 8, 1); // September 2025 (month is 0-indexed)
    const september2025End = new Date(2025, 8, 30, 23, 59, 59, 999);
    
    console.log('\n📅 September 2025 range:', {
      start: september2025Start.toISOString(),
      end: september2025End.toISOString()
    });

    const septemberUtilities = utilitiesTransactions.filter(tx => {
      const transactionDate = new Date(tx.transactionInfo?.date);
      return transactionDate >= september2025Start && transactionDate <= september2025End;
    });

    console.log(`\n🔌 UTILITIES TRANSACTIONS IN SEPTEMBER 2025: ${septemberUtilities.length}`);
    septemberUtilities.forEach((tx, index) => {
      const date = new Date(tx.transactionInfo?.date);
      console.log(`  ${index + 1}. ${tx.transactionInfo?.description} - $${tx.transactionInfo?.amount} - ${date.toISOString()}`);
    });

    // Check what month the Utilities transactions are actually in
    console.log('\n📊 UTILITIES TRANSACTIONS BY MONTH:');
    const utilitiesByMonth = utilitiesTransactions.reduce((acc, tx) => {
      const date = new Date(tx.transactionInfo?.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[monthKey]) acc[monthKey] = [];
      acc[monthKey].push(tx);
      return acc;
    }, {});

    Object.entries(utilitiesByMonth).forEach(([month, transactions]) => {
      console.log(`  ${month}: ${transactions.length} transactions`);
      transactions.forEach((tx, index) => {
        const date = new Date(tx.transactionInfo?.date);
        console.log(`    ${index + 1}. ${tx.transactionInfo?.description} - $${tx.transactionInfo?.amount} - ${date.toLocaleDateString()}`);
      });
    });

    // Check if there are any transactions in the current month at all
    const currentMonthAllTransactions = allTransactions.filter(tx => {
      const transactionDate = new Date(tx.transactionInfo?.date);
      return transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd;
    });

    console.log(`\n📊 ALL TRANSACTIONS IN CURRENT MONTH: ${currentMonthAllTransactions.length}`);
    currentMonthAllTransactions.forEach((tx, index) => {
      const date = new Date(tx.transactionInfo?.date);
      console.log(`  ${index + 1}. ${tx.transactionInfo?.description} - ${tx.transactionInfo?.category} - ${tx.transactionInfo?.type} - $${tx.transactionInfo?.amount} - ${date.toLocaleDateString()}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the debug script
debugUtilitiesMissing();
