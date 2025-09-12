import { DailyPrice, IDailyPrice, Investment } from '../models';
import { MarketDataService } from './marketDataService';
import { logger } from '../utils/logger';

export class DailyPriceService {
  private marketDataService: MarketDataService;

  constructor() {
    this.marketDataService = new MarketDataService();
  }

  /**
   * Update daily prices for all active investment symbols
   * This should be called at end of trading day
   */
  async updateDailyPrices(): Promise<void> {
    try {
      logger.info('Starting daily price update...');
      
      // Get all unique symbols from active investments
      const symbols = await Investment.distinct('securityInfo.symbol', { isActive: true });
      
      if (symbols.length === 0) {
        logger.info('No active investment symbols found');
        return;
      }

      logger.info(`Updating prices for ${symbols.length} symbols:`, symbols);

      // Process symbols in batches to avoid overwhelming the API
      const batchSize = 5;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < symbols.length; i += batchSize) {
        const symbolBatch = symbols.slice(i, i + batchSize);
        
        await Promise.all(symbolBatch.map(async (symbol) => {
          try {
            await this.updateSymbolPrice(symbol);
            successCount++;
          } catch (error) {
            logger.error(`Failed to update price for ${symbol}:`, error);
            errorCount++;
          }
        }));
        
        // Small delay between batches to be respectful to the API
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      logger.info(`Daily price update completed. Success: ${successCount}, Errors: ${errorCount}`);
    } catch (error) {
      logger.error('Error in daily price update:', error);
      throw error;
    }
  }

  /**
   * Update price for a specific symbol
   */
  async updateSymbolPrice(symbol: string): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day

      // Check if we already have today's price
      const existingPrice = await DailyPrice.findOne({
        symbol: symbol.toUpperCase(),
        date: today
      });

      if (existingPrice) {
        logger.debug(`Price for ${symbol} already exists for today`);
        return;
      }

      // Get current market data
      const marketData = await this.marketDataService.getQuote(symbol);
      
      if (!marketData) {
        throw new Error(`No market data available for ${symbol}`);
      }

      // Create daily price record
      const dailyPrice = new DailyPrice({
        symbol: symbol.toUpperCase(),
        date: today,
        open: marketData.open || marketData.currentPrice,
        high: marketData.high || marketData.currentPrice,
        low: marketData.low || marketData.currentPrice,
        close: marketData.currentPrice,
        volume: marketData.volume || 0,
        source: 'yahoo_finance'
      });

      await dailyPrice.save();
      logger.debug(`Updated price for ${symbol}: $${marketData.currentPrice}`);
    } catch (error) {
      logger.error(`Error updating price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get historical prices for a symbol within a date range
   */
  async getHistoricalPrices(symbol: string, startDate: Date, endDate: Date): Promise<IDailyPrice[]> {
    try {
      return await DailyPrice.find({
        symbol: symbol.toUpperCase(),
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });
    } catch (error) {
      logger.error(`Error getting historical prices for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get latest price for a symbol
   */
  async getLatestPrice(symbol: string): Promise<IDailyPrice | null> {
    try {
      return await DailyPrice.findOne({ symbol: symbol.toUpperCase() })
        .sort({ date: -1 })
        .limit(1);
    } catch (error) {
      logger.error(`Error getting latest price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Populate historical data for existing investments
   * This should be run once to backfill historical data
   */
  async populateHistoricalData(days: number = 365): Promise<void> {
    try {
      logger.info(`Starting historical data population for last ${days} days...`);
      
      const symbols = await Investment.distinct('securityInfo.symbol', { isActive: true });
      
      if (symbols.length === 0) {
        logger.info('No active investment symbols found');
        return;
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      logger.info(`Populating data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Process symbols in batches for better performance
      const batchSize = 3; // Process 3 symbols at a time
      for (let i = 0; i < symbols.length; i += batchSize) {
        const symbolBatch = symbols.slice(i, i + batchSize);
        
        // Process batch in parallel
        await Promise.all(symbolBatch.map(async (symbol) => {
          try {
            await this.populateSymbolHistoricalData(symbol, startDate, endDate);
          } catch (error) {
            logger.error(`Failed to populate historical data for ${symbol}:`, error);
          }
        }));
        
        // Small delay between batches to be respectful to APIs
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info('Historical data population completed');
    } catch (error) {
      logger.error('Error in historical data population:', error);
      throw error;
    }
  }

  /**
   * Populate historical data for a specific symbol
   */
  private async populateSymbolHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<void> {
    try {
      // Get historical data from Yahoo Finance
      const historicalData = await this.marketDataService.getHistoricalData(symbol, '1y');
      
      if (!historicalData || historicalData.length === 0) {
        logger.warn(`No historical data found for ${symbol}`);
        return;
      }

      // Filter data within our date range
      const filteredData = historicalData.filter(day => {
        const dayDate = new Date(day.date);
        return dayDate >= startDate && dayDate <= endDate;
      });

      logger.info(`Found ${filteredData.length} historical data points for ${symbol}`);

      // Prepare bulk operations for efficient insertion
      const bulkOps = filteredData.map(day => ({
        replaceOne: {
          filter: { 
            symbol: symbol.toUpperCase(), 
            date: new Date(day.date) 
          },
          replacement: {
            symbol: symbol.toUpperCase(),
            date: new Date(day.date),
            open: day.open,
            high: day.high,
            low: day.low,
            close: day.close,
            volume: day.volume || 0,
            adjustedClose: day.adjClose,
            source: 'yahoo_finance'
          },
          upsert: true
        }
      }));

      // Execute bulk operation
      if (bulkOps.length > 0) {
        await DailyPrice.bulkWrite(bulkOps);
        logger.info(`Bulk inserted ${bulkOps.length} data points for ${symbol}`);
      }

      logger.info(`Populated ${filteredData.length} data points for ${symbol}`);
    } catch (error) {
      logger.error(`Error populating historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Calculate portfolio historical performance using stored daily prices
   * FIXED: Only includes investments that existed on each historical date
   */
  async calculatePortfolioHistoricalPerformance(investments: any[]): Promise<any[]> {
    try {
      if (investments.length === 0) {
        return [];
      }

      // Filter only active investments
      const activeInvestments = investments.filter(inv => inv.isActive !== false);
      
      if (activeInvestments.length === 0) {
        return [];
      }

      // Get the earliest purchase date
      const earliestPurchase = new Date(Math.min(
        ...activeInvestments.map(inv => new Date(inv.acquisition.purchaseDate).getTime())
      ));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      logger.info(`Calculating portfolio history from ${earliestPurchase.toISOString()} to ${today.toISOString()}`);
      logger.info(`Found ${activeInvestments.length} active investments`);

      // Get all symbols
      const symbols = [...new Set(activeInvestments.map(inv => inv.securityInfo.symbol))];
      
      // Get all daily prices for these symbols
      const dailyPrices = await DailyPrice.find({
        symbol: { $in: symbols },
        date: { $gte: earliestPurchase, $lte: today }
      }).sort({ date: 1 });

      logger.info(`Found ${dailyPrices.length} daily price records for ${symbols.length} symbols`);

      // Group prices by symbol and date for efficient lookup
      const priceMap = new Map<string, Map<string, IDailyPrice>>();
      dailyPrices.forEach(price => {
        if (!priceMap.has(price.symbol)) {
          priceMap.set(price.symbol, new Map());
        }
        const dateKey = price.date.toISOString().split('T')[0];
        priceMap.get(price.symbol)!.set(dateKey, price);
      });

      // Generate portfolio history
      const portfolioHistory = [];
      const currentDate = new Date(earliestPurchase);
      
      while (currentDate <= today) {
        const dateKey = currentDate.toISOString().split('T')[0];
        let totalValue = 0;
        let hasData = false;
        let investmentsIncluded = 0;

        // CRITICAL FIX: Only include investments that were purchased on or before this date
        const investmentsForDate = activeInvestments.filter(investment => {
          const purchaseDate = new Date(investment.acquisition.purchaseDate);
          purchaseDate.setHours(0, 0, 0, 0);
          return purchaseDate <= currentDate;
        });

        investmentsIncluded = investmentsForDate.length;

        investmentsForDate.forEach(investment => {
          const symbol = investment.securityInfo.symbol;
          const symbolPrices = priceMap.get(symbol);
          
          if (symbolPrices) {
            // Find price for this date or the most recent previous date
            let priceData = symbolPrices.get(dateKey);
            
            if (!priceData) {
              // Find the most recent price before this date
              const availableDates = Array.from(symbolPrices.keys()).sort();
              const previousDate = availableDates
                .filter(d => d <= dateKey)
                .pop();
              
              if (previousDate) {
                priceData = symbolPrices.get(previousDate);
              }
            }
            
            if (priceData) {
              const positionValue = investment.position.shares * priceData.close;
              totalValue += positionValue;
              hasData = true;
            } else {
              // Use purchase price only if this is the purchase date or very close to it
              const purchaseDate = new Date(investment.acquisition.purchaseDate);
              const daysSincePurchase = Math.floor((currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysSincePurchase <= 7) { // Only use purchase price for first week
                const positionValue = investment.position.shares * investment.acquisition.purchasePrice;
                totalValue += positionValue;
                logger.debug(`Using purchase price for ${symbol} on ${dateKey} (${daysSincePurchase} days since purchase)`);
              } else {
                logger.warn(`No price data for ${symbol} on ${dateKey}, skipping (${daysSincePurchase} days since purchase)`);
              }
            }
          } else {
            // Use purchase price only if this is the purchase date or very close to it
            const purchaseDate = new Date(investment.acquisition.purchaseDate);
            const daysSincePurchase = Math.floor((currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysSincePurchase <= 7) { // Only use purchase price for first week
              const positionValue = investment.position.shares * investment.acquisition.purchasePrice;
              totalValue += positionValue;
              logger.debug(`Using purchase price for ${symbol} on ${dateKey} (no price data, ${daysSincePurchase} days since purchase)`);
            } else {
              logger.warn(`No price data available for ${symbol} on ${dateKey}, skipping (${daysSincePurchase} days since purchase)`);
            }
          }
        });

        // Only add data point if we have meaningful data
        if (hasData && investmentsIncluded > 0) {
          portfolioHistory.push({
            date: dateKey,
            value: Math.round(totalValue * 100) / 100,
            investmentsCount: investmentsIncluded
          });
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      logger.info(`Generated ${portfolioHistory.length} portfolio history data points`);
      
      // Validation: Compare with current real-time value
      if (portfolioHistory.length > 0) {
        const latestHistoricalValue = portfolioHistory[portfolioHistory.length - 1].value;
        const currentRealTimeValue = activeInvestments.reduce((sum, inv) => 
          sum + (inv.position.shares * inv.position.currentPrice), 0);
        
        const difference = Math.abs(latestHistoricalValue - currentRealTimeValue);
        const percentDifference = currentRealTimeValue > 0 ? (difference / currentRealTimeValue) * 100 : 0;
        
        logger.info(`Historical vs Real-time validation:`);
        logger.info(`  Historical (latest): $${latestHistoricalValue.toFixed(2)}`);
        logger.info(`  Real-time (current): $${currentRealTimeValue.toFixed(2)}`);
        logger.info(`  Difference: $${difference.toFixed(2)} (${percentDifference.toFixed(2)}%)`);
        
        if (percentDifference > 5) {
          logger.warn(`Large discrepancy detected between historical and real-time values!`);
        }
      }
      
      return portfolioHistory;
    } catch (error) {
      logger.error('Error calculating portfolio historical performance:', error);
      return [];
    }
  }

  /**
   * Ensure we have sufficient historical data for portfolio calculations
   * This method checks data coverage and populates missing data if needed
   */
  async ensureHistoricalDataCoverage(investments: any[], daysBack: number = 365): Promise<void> {
    try {
      const symbols = [...new Set(investments.map(inv => inv.securityInfo.symbol))];
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      logger.info(`Ensuring historical data coverage for ${symbols.length} symbols from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      for (const symbol of symbols) {
        // Check data coverage for this symbol
        const existingData = await DailyPrice.find({
          symbol: symbol.toUpperCase(),
          date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        const expectedDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const actualDays = existingData.length;
        const coveragePercent = (actualDays / expectedDays) * 100;

        logger.info(`Symbol ${symbol}: ${actualDays}/${expectedDays} days (${coveragePercent.toFixed(1)}% coverage)`);

        // If coverage is less than 80%, populate missing data
        if (coveragePercent < 80) {
          logger.info(`Low coverage for ${symbol}, populating missing data...`);
          await this.populateSymbolHistoricalData(symbol, startDate, endDate);
        }
      }
    } catch (error) {
      logger.error('Error ensuring historical data coverage:', error);
      throw error;
    }
  }

  /**
   * Get data quality metrics for portfolio historical calculations
   */
  async getDataQualityMetrics(investments: any[], daysBack: number = 365): Promise<any> {
    try {
      const symbols = [...new Set(investments.map(inv => inv.securityInfo.symbol))];
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const metrics = {
        symbols: symbols.length,
        dateRange: { startDate, endDate },
        expectedDays: Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        symbolCoverage: [] as any[],
        overallCoverage: 0
      };

      let totalCoverage = 0;

      for (const symbol of symbols) {
        const existingData = await DailyPrice.find({
          symbol: symbol.toUpperCase(),
          date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        const coveragePercent = (existingData.length / metrics.expectedDays) * 100;
        totalCoverage += coveragePercent;

        metrics.symbolCoverage.push({
          symbol,
          dataPoints: existingData.length,
          coveragePercent: Math.round(coveragePercent * 100) / 100,
          firstDate: existingData[0]?.date,
          lastDate: existingData[existingData.length - 1]?.date
        });
      }

      metrics.overallCoverage = Math.round((totalCoverage / symbols.length) * 100) / 100;

      return metrics;
    } catch (error) {
      logger.error('Error getting data quality metrics:', error);
      return null;
    }
  }

  /**
   * Clean up old price data (keep only last 2 years)
   */
  async cleanOldPrices(daysToKeep: number = 730): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await DailyPrice.deleteMany({
        date: { $lt: cutoffDate }
      });
      
      logger.info(`Cleaned ${result.deletedCount} old price records`);
    } catch (error) {
      logger.error('Error cleaning old prices:', error);
      throw error;
    }
  }
}
