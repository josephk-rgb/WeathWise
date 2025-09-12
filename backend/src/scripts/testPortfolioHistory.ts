import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import mongoose from 'mongoose';
import { PortfolioHistoryService } from '../services/portfolioHistoryService';
import { Investment } from '../models';
import { logger } from '../utils/logger';

/**
 * Test script to verify portfolio historical data accuracy
 * This will output portfolio values for the last 15 days using database historical data
 */
async function testPortfolioHistory() {
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

    // Get a test user (you can modify this to use a specific user ID)
    const testUserIdString = process.env.TEST_USER_ID || '507f1f77bcf86cd799439011'; // Default valid ObjectId
    const testUserId = new mongoose.Types.ObjectId(testUserIdString);
    console.log(`🔍 Testing portfolio history for user: ${testUserId}`);

    // Get all active investments for the test user
    const investments = await Investment.find({ 
      userId: testUserId, 
      isActive: true 
    });

    if (investments.length === 0) {
      console.log('❌ No investments found for test user');
      console.log('💡 Please add some investments first or set TEST_USER_ID environment variable');
      return;
    }

    console.log(`📊 Found ${investments.length} active investments:`);
    investments.forEach(inv => {
      console.log(`  - ${inv.securityInfo.symbol}: ${inv.position.shares} shares @ $${inv.position.currentPrice} (purchased: ${inv.acquisition.purchaseDate})`);
    });

    // Calculate current portfolio value for comparison
    const currentValue = investments.reduce((sum, inv) => {
      return sum + (inv.position.shares * inv.position.currentPrice);
    }, 0);
    console.log(`💰 Current portfolio value: $${currentValue.toFixed(2)}`);

    // Set up date range for last 15 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 15);

    console.log(`\n📅 Testing date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Initialize the portfolio history service
    const portfolioHistoryService = new PortfolioHistoryService();

    // Calculate portfolio history
    console.log('\n🔄 Calculating portfolio history...');
    const result = await portfolioHistoryService.calculatePortfolioHistory(
      investments,
      startDate,
      endDate
    );

    console.log('\n📈 PORTFOLIO HISTORY RESULTS:');
    console.log('='.repeat(80));

    // Display each day's portfolio value
    result.snapshots.forEach((snapshot, index) => {
      const date = new Date(snapshot.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${dayName} ${dateStr} | $${snapshot.value.toFixed(2)} | ${snapshot.investmentsCount} investments | Quality: ${snapshot.dataQuality}`);
    });

    console.log('='.repeat(80));

    // Display data quality metrics
    console.log('\n📊 DATA QUALITY METRICS:');
    console.log(`Overall Coverage: ${result.dataQuality.overallCoverage.toFixed(1)}%`);
    console.log(`Date Range: ${result.dataQuality.dateRange.start.toISOString().split('T')[0]} to ${result.dataQuality.dateRange.end.toISOString().split('T')[0]}`);
    
    console.log('\nSymbol Coverage Details:');
    result.dataQuality.symbolCoverage.forEach(symbol => {
      console.log(`  ${symbol.symbol}: ${symbol.coveragePercent.toFixed(1)}% (${symbol.dataPoints} data points)`);
      if (symbol.firstDate && symbol.lastDate) {
        console.log(`    First: ${symbol.firstDate.toISOString().split('T')[0]}, Last: ${symbol.lastDate.toISOString().split('T')[0]}`);
      }
    });

    // Validation results
    console.log('\n✅ VALIDATION RESULTS:');
    const latestSnapshot = result.snapshots[result.snapshots.length - 1];
    const difference = Math.abs(latestSnapshot.value - result.currentValue);
    const percentDifference = result.currentValue > 0 ? (difference / result.currentValue) * 100 : 0;
    
    console.log(`Latest Historical Value: $${latestSnapshot.value.toFixed(2)}`);
    console.log(`Current Real-time Value: $${result.currentValue.toFixed(2)}`);
    console.log(`Difference: $${difference.toFixed(2)} (${percentDifference.toFixed(2)}%)`);
    
    if (percentDifference < 1) {
      console.log('🎉 EXCELLENT: Historical and current values match within 1%');
    } else if (percentDifference < 5) {
      console.log('✅ GOOD: Historical and current values match within 5%');
    } else {
      console.log('⚠️  WARNING: Large discrepancy between historical and current values');
    }

    // Detailed analysis for each investment
    console.log('\n🔍 DETAILED INVESTMENT ANALYSIS:');
    console.log('='.repeat(80));
    
    for (const investment of investments) {
      const symbol = investment.securityInfo.symbol;
      const shares = investment.position.shares;
      const currentPrice = investment.position.currentPrice;
      const currentValue = shares * currentPrice;
      
      console.log(`\n${symbol}:`);
      console.log(`  Shares: ${shares}`);
      console.log(`  Current Price: $${currentPrice.toFixed(2)}`);
      console.log(`  Current Value: $${currentValue.toFixed(2)}`);
      console.log(`  Purchase Date: ${investment.acquisition.purchaseDate.toISOString().split('T')[0]}`);
      
      // Find symbol coverage
      const symbolCoverage = result.dataQuality.symbolCoverage.find(s => s.symbol === symbol);
      if (symbolCoverage) {
        console.log(`  Data Coverage: ${symbolCoverage.coveragePercent.toFixed(1)}%`);
        console.log(`  Data Points: ${symbolCoverage.dataPoints}`);
      }
    }

    console.log('\n🎯 TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    logger.error('Portfolio history test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testPortfolioHistory()
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testPortfolioHistory };
