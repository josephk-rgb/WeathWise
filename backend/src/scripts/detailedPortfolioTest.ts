import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import mongoose from 'mongoose';
import { Investment, DailyPrice } from '../models';
import { logger } from '../utils/logger';

/**
 * Detailed test to show exactly how portfolio values are calculated
 * This will output step-by-step calculations for the last 15 days
 */
async function detailedPortfolioTest() {
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
    investments.forEach((inv, index) => {
      console.log(`  ${index + 1}. ${inv.securityInfo.symbol}: ${inv.position.shares} shares @ $${inv.position.currentPrice} (purchased: ${inv.acquisition.purchaseDate})`);
    });

    // Calculate current portfolio value
    const currentValue = investments.reduce((sum, inv) => {
      return sum + (inv.position.shares * inv.position.currentPrice);
    }, 0);
    console.log(`\n💰 Current portfolio value: $${currentValue.toFixed(2)}`);

    // Get last 15 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 15);

    console.log(`\n📅 Testing date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Get all symbols
    const symbols = [...new Set(investments.map(inv => inv.securityInfo.symbol))];
    console.log(`\n🔍 Symbols to check: ${symbols.join(', ')}`);

    // Pre-fetch all daily price data for efficiency
    console.log('\n📈 FETCHING DAILY PRICE DATA:');
    console.log('=' .repeat(100));

    const priceDataMap = new Map<string, Map<string, any>>();
    
    for (const symbol of symbols) {
      console.log(`\nFetching data for ${symbol}...`);
      
      const dailyPrices = await DailyPrice.find({
        symbol: symbol.toUpperCase(),
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });

      console.log(`  Found ${dailyPrices.length} price records`);
      
      if (dailyPrices.length > 0) {
        const dateMap = new Map<string, any>();
        dailyPrices.forEach(price => {
          const dateKey = price.date.toISOString().split('T')[0];
          dateMap.set(dateKey, price);
          console.log(`    ${dateKey}: $${price.close.toFixed(2)}`);
        });
        priceDataMap.set(symbol, dateMap);
      } else {
        console.log(`  ❌ No price data found for ${symbol}`);
        priceDataMap.set(symbol, new Map());
      }
    }

    // Calculate portfolio value for each day with detailed breakdown
    console.log('\n\n📊 DETAILED PORTFOLIO CALCULATIONS:');
    console.log('=' .repeat(120));

    const currentDate = new Date(startDate);
    let dayCount = 0;

    while (currentDate <= endDate) {
      dayCount++;
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      console.log(`\n${dayCount}. ${dayName} ${dateStr} (${dateKey})`);
      console.log('-' .repeat(80));
      
      let totalValue = 0;
      let investmentsIncluded = 0;
      let missingDataCount = 0;
      let usedCurrentPriceCount = 0;

      for (const investment of investments) {
        const symbol = investment.securityInfo.symbol;
        const shares = investment.position.shares;
        const currentPrice = investment.position.currentPrice;
        const purchaseDate = new Date(investment.acquisition.purchaseDate);
        purchaseDate.setHours(0, 0, 0, 0);
        
        // Check if investment existed on this date
        if (purchaseDate <= currentDate) {
          investmentsIncluded++;
          
          // Get price for this date
          const symbolPrices = priceDataMap.get(symbol);
          let priceUsed = 0;
          let priceSource = '';
          
          if (symbolPrices && symbolPrices.has(dateKey)) {
            // Exact date price available
            const dailyPrice = symbolPrices.get(dateKey);
            priceUsed = dailyPrice.close;
            priceSource = 'historical';
          } else if (symbolPrices && symbolPrices.size > 0) {
            // Find most recent previous price
            const availableDates = Array.from(symbolPrices.keys()).sort();
            const previousDates = availableDates.filter(d => d <= dateKey);
            
            if (previousDates.length > 0) {
              const mostRecentDate = previousDates[previousDates.length - 1];
              const daysDiff = Math.floor(
                (new Date(dateKey).getTime() - new Date(mostRecentDate).getTime()) / (1000 * 60 * 60 * 24)
              );
              
              if (daysDiff <= 7) {
                const dailyPrice = symbolPrices.get(mostRecentDate);
                priceUsed = dailyPrice.close;
                priceSource = `historical (${daysDiff} days old)`;
              } else {
                priceUsed = currentPrice;
                priceSource = 'current (no recent data)';
                usedCurrentPriceCount++;
              }
            } else {
              priceUsed = currentPrice;
              priceSource = 'current (no data)';
              usedCurrentPriceCount++;
            }
          } else {
            priceUsed = currentPrice;
            priceSource = 'current (no data)';
            usedCurrentPriceCount++;
          }
          
          const positionValue = shares * priceUsed;
          totalValue += positionValue;
          
          console.log(`  ${symbol}: ${shares} shares × $${priceUsed.toFixed(2)} = $${positionValue.toFixed(2)} (${priceSource})`);
          
          if (priceSource.includes('no data')) {
            missingDataCount++;
          }
        } else {
          console.log(`  ${symbol}: Not included (purchased ${purchaseDate.toISOString().split('T')[0]})`);
        }
      }

      const status = missingDataCount > 0 ? `⚠️  (${missingDataCount} missing data)` : '✅';
      console.log(`\n  TOTAL: $${totalValue.toFixed(2)} | ${investmentsIncluded} investments ${status}`);
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Summary
    console.log('\n\n📋 SUMMARY:');
    console.log('=' .repeat(100));
    console.log(`Total investments: ${investments.length}`);
    console.log(`Symbols tracked: ${symbols.length}`);
    console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`Current portfolio value: $${currentValue.toFixed(2)}`);
    
    // Data quality summary
    console.log('\n📊 DATA QUALITY SUMMARY:');
    for (const symbol of symbols) {
      const symbolPrices = priceDataMap.get(symbol);
      const dataPoints = symbolPrices ? symbolPrices.size : 0;
      const expectedDays = 15; // Last 15 days
      const coverage = (dataPoints / expectedDays) * 100;
      
      console.log(`  ${symbol}: ${dataPoints}/${expectedDays} days (${coverage.toFixed(1)}% coverage)`);
    }

    console.log('\n🎯 DETAILED TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ Detailed test failed:', error);
    logger.error('Detailed portfolio test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  detailedPortfolioTest()
    .then(() => {
      console.log('✅ Detailed test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Detailed test failed:', error);
      process.exit(1);
    });
}

export { detailedPortfolioTest };
