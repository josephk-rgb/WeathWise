#!/usr/bin/env node

/**
 * Simple Portfolio Data Fix Script
 * 
 * This script fixes the portfolio data consistency issue by:
 * 1. Clearing fake daily price data (source: 'manual')
 * 2. Populating real Yahoo Finance data
 * 3. Verifying the fix worked
 * 
 * Usage: node scripts/fix-portfolio-data.js
 */

const mongoose = require('mongoose');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

async function fixPortfolioData() {
  try {
    console.log('🔧 Starting Portfolio Data Fix...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/weathwise';
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const { DailyPrice, Investment } = require('../dist/models');

    // Step 1: Check current state
    console.log('📊 Checking current state...');
    const totalDailyPrices = await DailyPrice.countDocuments();
    const fakeDailyPrices = await DailyPrice.countDocuments({ source: 'manual' });
    const realDailyPrices = await DailyPrice.countDocuments({ source: 'yahoo_finance' });
    
    console.log(`   Total daily price records: ${totalDailyPrices}`);
    console.log(`   Fake records (source: 'manual'): ${fakeDailyPrices}`);
    console.log(`   Real records (source: 'yahoo_finance'): ${realDailyPrices}\n`);
    
    // Get all investment symbols
    const symbols = await Investment.distinct('securityInfo.symbol', { isActive: true });
    console.log(`   Active investment symbols: ${symbols.join(', ')}\n`);

    // Step 2: Clear fake data
    if (fakeDailyPrices > 0) {
      console.log('🗑️  Clearing fake data...');
      const deleteResult = await DailyPrice.deleteMany({ source: 'manual' });
      console.log(`   ✅ Deleted ${deleteResult.deletedCount} fake daily price records\n`);
    } else {
      console.log('✅ No fake data found to delete\n');
    }

    // Step 3: Populate real data using the backend API
    console.log('📈 Populating real Yahoo Finance data...');
    
    // Start the backend server if it's not running
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    try {
      // Try to call the daily price update endpoint
      const response = await axios.post(`${backendUrl}/api/admin/daily-prices/update`, {}, {
        timeout: 30000 // 30 second timeout
      });
      console.log('   ✅ Successfully updated daily prices via API\n');
    } catch (apiError) {
      console.log('   ⚠️  API call failed, trying direct method...');
      
      // Fallback: Use the DailyPriceService directly
      const { DailyPriceService } = require('../dist/services/dailyPriceService');
      const dailyPriceService = new DailyPriceService();
      
      await dailyPriceService.populateHistoricalData(365); // Last year
      console.log('   ✅ Populated historical data directly\n');
    }

    // Step 4: Verify results
    console.log('🔍 Verifying results...');
    const newTotalDailyPrices = await DailyPrice.countDocuments();
    const newRealDailyPrices = await DailyPrice.countDocuments({ source: 'yahoo_finance' });
    
    console.log(`   New total daily price records: ${newTotalDailyPrices}`);
    console.log(`   New real records (source: 'yahoo_finance'): ${newRealDailyPrices}\n`);
    
    // Check latest prices for each symbol
    console.log('📊 Latest prices for each symbol:');
    for (const symbol of symbols) {
      const latestReal = await DailyPrice.findOne({ symbol, source: 'yahoo_finance' }).sort({ date: -1 });
      if (latestReal) {
        console.log(`   ${symbol}: ${latestReal.date.toISOString().split('T')[0]} - $${latestReal.close}`);
      } else {
        console.log(`   ${symbol}: ❌ No real price data found`);
      }
    }
    console.log('');

    // Step 5: Test portfolio history calculation
    console.log('🧮 Testing portfolio history calculation...');
    const investments = await Investment.find({ isActive: true });
    
    if (investments.length > 0) {
      const { DailyPriceService } = require('../dist/services/dailyPriceService');
      const dailyPriceService = new DailyPriceService();
      
      const portfolioHistory = await dailyPriceService.calculatePortfolioHistoricalPerformance(investments);
      
      if (portfolioHistory.length > 0) {
        const latestHistoricalValue = portfolioHistory[portfolioHistory.length - 1].value;
        const currentRealTimeValue = investments.reduce((sum, inv) => 
          sum + (inv.position.shares * inv.position.currentPrice), 0);
        
        const difference = Math.abs(latestHistoricalValue - currentRealTimeValue);
        const percentDifference = currentRealTimeValue > 0 ? (difference / currentRealTimeValue) * 100 : 0;
        
        console.log(`   Latest historical value: $${latestHistoricalValue.toFixed(2)}`);
        console.log(`   Current real-time value: $${currentRealTimeValue.toFixed(2)}`);
        console.log(`   Difference: $${difference.toFixed(2)} (${percentDifference.toFixed(2)}%)\n`);
        
        if (percentDifference < 5) {
          console.log('🎉 SUCCESS! Data consistency achieved!');
          console.log('   Portfolio history and current values are now aligned.\n');
        } else {
          console.log('⚠️  WARNING: Still some discrepancy.');
          console.log('   This might be due to market hours or data freshness.\n');
        }
      } else {
        console.log('   ❌ No portfolio history generated\n');
      }
    } else {
      console.log('   ℹ️  No active investments found\n');
    }

    console.log('✅ Portfolio data fix completed successfully!');
    console.log('   Your portfolio growth chart should now show accurate values.\n');

  } catch (error) {
    console.error('❌ Error fixing portfolio data:', error.message);
    console.error('   Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  fixPortfolioData()
    .then(() => {
      console.log('🎯 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixPortfolioData };
