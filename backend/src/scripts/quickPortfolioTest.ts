import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import mongoose from 'mongoose';
import { Investment, DailyPrice } from '../models';
import { logger } from '../utils/logger';

/**
 * Quick test to check portfolio values for the last 15 days
 * This script directly queries the database to show raw data
 */
async function quickPortfolioTest() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable not set');
      console.log('💡 Please set MONGODB_URI in your .env file or environment');
      return;
    }
    
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    // Get all active investments
    const investments = await Investment.find({ isActive: true });
    
    if (investments.length === 0) {
      console.log('❌ No investments found');
      return;
    }

    console.log(`📊 Found ${investments.length} active investments:`);
    investments.forEach(inv => {
      console.log(`  - ${inv.securityInfo.symbol}: ${inv.position.shares} shares @ $${inv.position.currentPrice} (purchased: ${inv.acquisition.purchaseDate})`);
    });

    // Calculate current portfolio value
    const currentValue = investments.reduce((sum, inv) => {
      return sum + (inv.position.shares * inv.position.currentPrice);
    }, 0);
    console.log(`💰 Current portfolio value: $${currentValue.toFixed(2)}`);

    // Get last 15 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 15);

    console.log(`\n📅 Checking last 15 days: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Get all symbols
    const symbols = [...new Set(investments.map(inv => inv.securityInfo.symbol))];
    console.log(`\n🔍 Symbols to check: ${symbols.join(', ')}`);

    // Check daily price data for each symbol
    console.log('\n📈 DAILY PRICE DATA:');
    console.log('=' .repeat(100));

    for (const symbol of symbols) {
      console.log(`\n${symbol}:`);
      
      const dailyPrices = await DailyPrice.find({
        symbol: symbol.toUpperCase(),
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });

      console.log(`  Found ${dailyPrices.length} price records:`);
      
      if (dailyPrices.length === 0) {
        console.log('  ❌ No price data found for this symbol');
        continue;
      }

      dailyPrices.forEach(price => {
        const date = price.date.toISOString().split('T')[0];
        console.log(`    ${date}: $${price.close.toFixed(2)}`);
      });

      // Check if we have data for today
      const today = new Date().toISOString().split('T')[0];
      const todayPrice = dailyPrices.find(p => p.date.toISOString().split('T')[0] === today);
      
      if (todayPrice) {
        console.log(`  ✅ Today's price: $${todayPrice.close.toFixed(2)}`);
      } else {
        console.log(`  ⚠️  No price data for today (${today})`);
      }
    }

    // Calculate portfolio value for each day
    console.log('\n📊 PORTFOLIO VALUES BY DAY:');
    console.log('=' .repeat(100));

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      let totalValue = 0;
      let investmentsIncluded = 0;
      let missingData = 0;

      for (const investment of investments) {
        const symbol = investment.securityInfo.symbol;
        const shares = investment.position.shares;
        
        // Check if investment existed on this date
        const purchaseDate = new Date(investment.acquisition.purchaseDate);
        purchaseDate.setHours(0, 0, 0, 0);
        
        if (purchaseDate <= currentDate) {
          investmentsIncluded++;
          
          // Get price for this date
          const dailyPrice = await DailyPrice.findOne({
            symbol: symbol.toUpperCase(),
            date: currentDate
          });

          if (dailyPrice) {
            totalValue += shares * dailyPrice.close;
          } else {
            missingData++;
            // Use current price as fallback for missing data
            totalValue += shares * investment.position.currentPrice;
          }
        }
      }

      const status = missingData > 0 ? `⚠️  (${missingData} missing)` : '✅';
      console.log(`${dayName} ${dateStr} | $${totalValue.toFixed(2)} | ${investmentsIncluded} investments ${status}`);
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('\n🎯 QUICK TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    logger.error('Quick portfolio test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  quickPortfolioTest()
    .then(() => {
      console.log('✅ Quick test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Quick test failed:', error);
      process.exit(1);
    });
}

export { quickPortfolioTest };
