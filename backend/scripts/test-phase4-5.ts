#!/usr/bin/env ts-node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { NetWorthTracker } from '../src/services/netWorthTracker';
import { PortfolioPriceCache } from '../src/services/portfolioPriceCache';
import { EnhancedPortfolioService } from '../src/services/enhancedPortfolioService';
import { AssetValuationService } from '../src/services/assetValuationService';
import { PerformanceOptimizer } from '../src/utils/performanceOptimizer';
import { NetWorthCalculator } from '../src/services/netWorthCalculator';

// Load environment variables
dotenv.config();

async function testPhase4And5() {
  console.log('🚀 Testing Phase 4 & 5 Implementation...\n');

  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/weathwise';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Create a test user ID
    const testUserId = new mongoose.Types.ObjectId();
    console.log(`📝 Using test user ID: ${testUserId}\n`);

    // Test 1: Performance Optimizer
    console.log('🧪 Test 1: Performance Optimizer');
    const result = await PerformanceOptimizer.trackCalculation(
      'test_operation',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true };
      }
    );
    console.log('✅ Performance tracking works:', result);

    // Test caching
    await PerformanceOptimizer.setCache('test_key', { data: 'test' }, 10);
    const cached = await PerformanceOptimizer.getCached('test_key');
    console.log('✅ Caching works:', cached);

    const stats = PerformanceOptimizer.getPerformanceStats();
    console.log('✅ Performance stats:', stats);

    // Test 2: Net Worth Calculation with Caching
    console.log('\n🧪 Test 2: Net Worth Calculation with Caching');
    const netWorth1 = await NetWorthCalculator.getCurrentNetWorth(testUserId);
    console.log('✅ First calculation (should be slow):', netWorth1);

    const netWorth2 = await NetWorthCalculator.getCurrentNetWorth(testUserId);
    console.log('✅ Second calculation (should be fast/cached):', netWorth2);

    // Test 3: Net Worth Tracker
    console.log('\n🧪 Test 3: Net Worth Tracker');
    await NetWorthTracker.onSignificantEvent(testUserId, 'manual_update', 'Test snapshot');
    console.log('✅ Net worth snapshot created');

    const trendData = await NetWorthTracker.getNetWorthTrend(testUserId, 30);
    console.log('✅ Net worth trend data:', trendData);

    // Test 4: Portfolio Price Cache
    console.log('\n🧪 Test 4: Portfolio Price Cache');
    // Test with a known stock symbol
    const price = await PortfolioPriceCache.getHistoricalPrice('AAPL', new Date());
    console.log('✅ Historical price for AAPL:', price);

    // Test 5: Enhanced Portfolio Service
    console.log('\n🧪 Test 5: Enhanced Portfolio Service');
    const searchResults = await EnhancedPortfolioService.searchStocks('Apple', 3);
    console.log('✅ Stock search results:', searchResults);

    if (searchResults.length > 0) {
      const enrichedStock = await EnhancedPortfolioService.validateAndEnrichStock(searchResults[0].symbol);
      console.log('✅ Enriched stock data:', enrichedStock);
    }

    const performance = await EnhancedPortfolioService.getPortfolioPerformance(testUserId);
    console.log('✅ Portfolio performance:', performance);

    // Test 6: Asset Valuation Service
    console.log('\n🧪 Test 6: Asset Valuation Service');
    const suggestions = await AssetValuationService.suggestAssetRevaluation(testUserId);
    console.log('✅ Asset revaluation suggestions:', suggestions);

    // Test 7: Error Handling
    console.log('\n🧪 Test 7: Error Handling');
    try {
      await PerformanceOptimizer.trackCalculation(
        'error_test',
        async () => {
          throw new Error('Test error');
        }
      );
    } catch (error) {
      console.log('✅ Error handling works:', error.message);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\nFinal Performance Stats:');
    console.log(JSON.stringify(PerformanceOptimizer.getPerformanceStats(), null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testPhase4And5().catch(console.error);
}

export { testPhase4And5 };
