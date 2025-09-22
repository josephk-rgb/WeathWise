#!/usr/bin/env ts-node

/**
 * Migration script to populate historical data for existing investments
 * Run this once to backfill historical price data
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

async function populateHistoricalData() {
  try {
    logger.info('🚀 Starting historical data population...');
    
    // Connect to database
    await connectDB();
    logger.info('✅ Connected to database');
    
    // Get all active investments
    const investments = await Investment.find({ isActive: true });
    logger.info(`📊 Found ${investments.length} active investments`);
    
    if (investments.length === 0) {
      logger.info('No active investments found. Exiting.');
      return;
    }
    
    // Get unique symbols
    const symbols = [...new Set(investments.map(inv => inv.securityInfo.symbol))];
    logger.info(`📈 Symbols to populate: ${symbols.join(', ')}`);
    
    // Initialize daily price service
    const dailyPriceService = new DailyPriceService();
    
    // Populate historical data for the last 2 years (730 days)
    // This covers most investment purchase dates
    await dailyPriceService.populateHistoricalData(730);
    
    logger.info('✅ Historical data population completed successfully');
    
    // Show summary
    const totalRecords = await DailyPrice.countDocuments();
    logger.info(`📊 Total daily price records in database: ${totalRecords}`);
    
  } catch (error) {
    logger.error('❌ Error populating historical data:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  populateHistoricalData();
}

export { populateHistoricalData };
