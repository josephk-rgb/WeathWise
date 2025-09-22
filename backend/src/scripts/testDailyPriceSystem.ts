#!/usr/bin/env ts-node

/**
 * Test script to verify the daily price system works correctly
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

import { connectDB } from '../utils/database';
import { DailyPriceService } from '../services/dailyPriceService';
import { Investment, DailyPrice } from '../models';
import { logger } from '../utils/logger';

async function testDailyPriceSystem() {
  try {
    logger.info('🧪 Starting daily price system test...');
    
    // Connect to database
    await connectDB();
    logger.info('✅ Connected to database');
    
    // Initialize daily price service
    const dailyPriceService = new DailyPriceService();
    
    // Test 1: Get all active investments
    const investments = await Investment.find({ isActive: true });
    logger.info(`📊 Found ${investments.length} active investments`);
    
    if (investments.length === 0) {
      logger.warn('No active investments found. Creating test investment...');
      // You would create a test investment here if needed
      return;
    }
    
    // Test 2: Update prices for one symbol
    const firstSymbol = investments[0].securityInfo.symbol;
    logger.info(`📈 Testing price update for ${firstSymbol}...`);
    
    try {
      await dailyPriceService.updateSymbolPrice(firstSymbol);
      logger.info(`✅ Successfully updated price for ${firstSymbol}`);
    } catch (error) {
      logger.error(`❌ Failed to update price for ${firstSymbol}:`, error);
    }
    
    // Test 3: Get latest price
    const latestPrice = await dailyPriceService.getLatestPrice(firstSymbol);
    if (latestPrice) {
      logger.info(`💰 Latest price for ${firstSymbol}: $${latestPrice.close} (${latestPrice.date})`);
    } else {
      logger.warn(`⚠️ No price data found for ${firstSymbol}`);
    }
    
    // Test 4: Calculate portfolio historical performance
    logger.info('📊 Testing portfolio historical performance calculation...');
    const portfolioHistory = await dailyPriceService.calculatePortfolioHistoricalPerformance(investments);
    logger.info(`📈 Generated ${portfolioHistory.length} portfolio history data points`);
    
    if (portfolioHistory.length > 0) {
      const firstValue = portfolioHistory[0];
      const lastValue = portfolioHistory[portfolioHistory.length - 1];
      logger.info(`📊 Portfolio value range: $${firstValue.value} to $${lastValue.value}`);
      logger.info(`📅 Date range: ${firstValue.date} to ${lastValue.date}`);
    }
    
    // Test 5: Check database records
    const totalRecords = await DailyPrice.countDocuments();
    const uniqueSymbols = await DailyPrice.distinct('symbol');
    
    logger.info(`📊 Database stats:`);
    logger.info(`  - Total price records: ${totalRecords}`);
    logger.info(`  - Unique symbols: ${uniqueSymbols.length}`);
    logger.info(`  - Symbols: ${uniqueSymbols.join(', ')}`);
    
    logger.info('✅ Daily price system test completed successfully');
    
  } catch (error) {
    logger.error('❌ Error testing daily price system:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the test
if (require.main === module) {
  testDailyPriceSystem();
}

export { testDailyPriceSystem };
