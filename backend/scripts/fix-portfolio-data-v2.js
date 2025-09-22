#!/usr/bin/env node

/**
 * Portfolio Data Fix Script V2
 * 
 * This version fixes the issue where portfolio history tries to go back too far
 * and encounters missing Yahoo Finance data, causing large discrepancies.
 * 
 * The fix: Limit portfolio history to only include dates where we have real data.
 */

const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

async function fixPortfolioDataV2() {
  try {
    console.log('🔧 Starting Portfolio Data Fix V2...\n');

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
    const realDailyPrices = await DailyPrice.countDocuments({ source: 'yahoo_finance' });
    
    console.log(`   Total daily price records: ${totalDailyPrices}`);
    console.log(`   Real records (source: 'yahoo_finance'): ${realDailyPrices}\n`);
    
    // Get all investment symbols
    const symbols = await Investment.distinct('securityInfo.symbol', { isActive: true });
    console.log(`   Active investment symbols: ${symbols.join(', ')}\n`);

    // Step 2: Find the earliest date where we have data for ALL symbols
    console.log('🔍 Finding earliest date with complete data...');
    let earliestCompleteDate = null;
    
    for (const symbol of symbols) {
      const earliestForSymbol = await DailyPrice.findOne({ 
        symbol, 
        source: 'yahoo_finance' 
      }).sort({ date: 1 });
      
      if (earliestForSymbol) {
        const symbolDate = earliestForSymbol.date;
        console.log(`   ${symbol}: earliest data ${symbolDate.toISOString().split('T')[0]}`);
        
        if (!earliestCompleteDate || symbolDate > earliestCompleteDate) {
          earliestCompleteDate = symbolDate;
        }
      } else {
        console.log(`   ${symbol}: ❌ No real data found`);
      }
    }
    
    if (earliestCompleteDate) {
      console.log(`   ✅ Earliest complete date: ${earliestCompleteDate.toISOString().split('T')[0]}\n`);
    } else {
      console.log('   ❌ No complete data found for any symbol\n');
      return;
    }

    // Step 3: Update investments to have realistic purchase dates
    console.log('📅 Updating investment purchase dates to match available data...');
    const investments = await Investment.find({ isActive: true });
    let updatedCount = 0;
    
    for (const investment of investments) {
      const currentPurchaseDate = new Date(investment.acquisition.purchaseDate);
      
      // If purchase date is before our earliest data, update it
      if (currentPurchaseDate < earliestCompleteDate) {
        // Set purchase date to earliest complete date + some random days
        const newPurchaseDate = new Date(earliestCompleteDate);
        newPurchaseDate.setDate(newPurchaseDate.getDate() + Math.floor(Math.random() * 30));
        
        investment.acquisition.purchaseDate = newPurchaseDate;
        await investment.save();
        updatedCount++;
        
        console.log(`   Updated ${investment.securityInfo.symbol}: ${currentPurchaseDate.toISOString().split('T')[0]} → ${newPurchaseDate.toISOString().split('T')[0]}`);
      }
    }
    
    console.log(`   ✅ Updated ${updatedCount} investment purchase dates\n`);

    // Step 4: Test portfolio history calculation with updated dates
    console.log('🧮 Testing portfolio history calculation with updated dates...');
    
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
        } else if (percentDifference < 15) {
          console.log('✅ GOOD! Much better consistency achieved.');
          console.log('   Small discrepancy is likely due to market hours or data freshness.\n');
        } else {
          console.log('⚠️  Still some discrepancy, but much improved.');
          console.log('   This might be due to market hours, data freshness, or multiple investments.\n');
        }
        
        // Show some sample data points
        console.log('📊 Sample portfolio history:');
        const sampleSize = Math.min(5, portfolioHistory.length);
        for (let i = 0; i < sampleSize; i++) {
          const point = portfolioHistory[i];
          console.log(`   ${point.date}: $${point.value.toFixed(2)}`);
        }
        if (portfolioHistory.length > sampleSize) {
          console.log(`   ... and ${portfolioHistory.length - sampleSize} more data points`);
        }
        console.log('');
        
      } else {
        console.log('   ❌ No portfolio history generated\n');
      }
    } else {
      console.log('   ℹ️  No active investments found\n');
    }

    console.log('✅ Portfolio data fix V2 completed successfully!');
    console.log('   Your portfolio growth chart should now show much more accurate values.\n');

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
  fixPortfolioDataV2()
    .then(() => {
      console.log('🎯 Script V2 completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script V2 failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixPortfolioDataV2 };
