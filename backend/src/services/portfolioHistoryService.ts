import { DailyPrice, Investment } from '../models';
import { MarketDataService } from './marketDataService';
import { logger } from '../utils/logger';

export interface PortfolioSnapshot {
  date: string;
  value: number;
  investmentsCount: number;
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface HistoricalDataQuality {
  overallCoverage: number;
  symbolCoverage: Array<{
    symbol: string;
    coveragePercent: number;
    dataPoints: number;
    firstDate?: Date;
    lastDate?: Date;
  }>;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export class PortfolioHistoryService {
  private marketDataService: MarketDataService;

  constructor() {
    this.marketDataService = new MarketDataService();
  }

  /**
   * Calculate portfolio historical performance from scratch
   * This is the main method that orchestrates the entire process
   */
  async calculatePortfolioHistory(
    investments: any[],
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    snapshots: PortfolioSnapshot[];
    dataQuality: HistoricalDataQuality;
    currentValue: number;
  }> {
    try {
      logger.info('=== STARTING PORTFOLIO HISTORY CALCULATION ===');
      
      // Step 1: Validate and prepare investments
      const activeInvestments = this.prepareInvestments(investments);
      if (activeInvestments.length === 0) {
        return {
          snapshots: [],
          dataQuality: this.createEmptyDataQuality(),
          currentValue: 0
        };
      }

      // Step 2: Determine date range
      const dateRange = this.determineDateRange(activeInvestments, startDate, endDate);
      logger.info(`Date range: ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);

      // Step 3: Ensure we have price data for all symbols
      await this.ensurePriceDataCoverage(activeInvestments, dateRange);

      // Step 4: Get data quality metrics
      const dataQuality = await this.assessDataQuality(activeInvestments, dateRange);

      // Step 5: Calculate portfolio snapshots for each date
      const snapshots = await this.calculatePortfolioSnapshots(activeInvestments, dateRange);

      // Step 6: Calculate current value for validation
      const currentValue = this.calculateCurrentValue(activeInvestments);

      // Step 7: Validate results
      this.validateResults(snapshots, currentValue, dataQuality);

      logger.info(`=== PORTFOLIO HISTORY CALCULATION COMPLETE ===`);
      logger.info(`Generated ${snapshots.length} snapshots`);
      logger.info(`Data quality: ${dataQuality.overallCoverage.toFixed(1)}% coverage`);

      return {
        snapshots,
        dataQuality,
        currentValue
      };
    } catch (error) {
      logger.error('Error calculating portfolio history:', error);
      throw error;
    }
  }

  /**
   * Step 1: Prepare and validate investments
   */
  private prepareInvestments(investments: any[]): any[] {
    const activeInvestments = investments.filter(inv => {
      // Must be active
      if (inv.isActive === false) return false;
      
      // Must have required fields
      if (!inv.securityInfo?.symbol || !inv.position?.shares || !inv.acquisition?.purchaseDate) {
        logger.warn(`Skipping investment with missing data:`, inv);
        return false;
      }
      
      // Must have positive shares
      if (inv.position.shares <= 0) {
        logger.warn(`Skipping investment with zero/negative shares:`, inv.securityInfo.symbol);
        return false;
      }
      
      return true;
    });

    logger.info(`Prepared ${activeInvestments.length} active investments from ${investments.length} total`);
    return activeInvestments;
  }

  /**
   * Step 2: Determine the date range for calculations
   */
  private determineDateRange(investments: any[], startDate?: Date, endDate?: Date): { start: Date; end: Date } {
    const earliestPurchase = new Date(Math.min(
      ...investments.map(inv => new Date(inv.acquisition.purchaseDate).getTime())
    ));

    const defaultStart = startDate || earliestPurchase;
    const defaultEnd = endDate || new Date();

    // Ensure start is not before earliest purchase
    const actualStart = defaultStart < earliestPurchase ? earliestPurchase : defaultStart;

    return {
      start: actualStart,
      end: defaultEnd
    };
  }

  /**
   * Step 3: Ensure we have sufficient price data coverage
   */
  private async ensurePriceDataCoverage(investments: any[], dateRange: { start: Date; end: Date }): Promise<void> {
    const symbols = [...new Set(investments.map(inv => inv.securityInfo.symbol))];
    logger.info(`Ensuring price data coverage for ${symbols.length} symbols`);

    for (const symbol of symbols) {
      const coverage = await this.getSymbolDataCoverage(symbol, dateRange);
      
      if (coverage.percentage < 80) {
        logger.info(`Low coverage for ${symbol} (${coverage.percentage.toFixed(1)}%), populating data...`);
        await this.populateSymbolPriceData(symbol, dateRange);
      }
    }
  }

  /**
   * Step 4: Assess data quality
   */
  private async assessDataQuality(investments: any[], dateRange: { start: Date; end: Date }): Promise<HistoricalDataQuality> {
    const symbols = [...new Set(investments.map(inv => inv.securityInfo.symbol))];
    const expectedDays = Math.floor((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    const symbolCoverage = await Promise.all(
      symbols.map(async (symbol) => {
        const coverage = await this.getSymbolDataCoverage(symbol, dateRange);
        return {
          symbol,
          coveragePercent: coverage.percentage,
          dataPoints: coverage.dataPoints,
          firstDate: coverage.firstDate,
          lastDate: coverage.lastDate
        };
      })
    );

    const overallCoverage = symbolCoverage.reduce((sum, item) => sum + item.coveragePercent, 0) / symbols.length;

    return {
      overallCoverage,
      symbolCoverage,
      dateRange
    };
  }

  /**
   * Step 5: Calculate portfolio snapshots for each date
   */
  private async calculatePortfolioSnapshots(
    investments: any[],
    dateRange: { start: Date; end: Date }
  ): Promise<PortfolioSnapshot[]> {
    const snapshots: PortfolioSnapshot[] = [];
    const currentDate = new Date(dateRange.start);
    
    // Get all price data for efficiency
    const priceData = await this.getAllPriceData(investments, dateRange);
    
    while (currentDate <= dateRange.end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      
      // Get investments that existed on this date
      const activeInvestmentsForDate = investments.filter(inv => {
        const purchaseDate = new Date(inv.acquisition.purchaseDate);
        purchaseDate.setHours(0, 0, 0, 0);
        return purchaseDate <= currentDate;
      });

      if (activeInvestmentsForDate.length > 0) {
        const snapshot = await this.calculateSnapshotForDate(
          activeInvestmentsForDate,
          dateKey,
          priceData
        );
        
        if (snapshot) {
          snapshots.push(snapshot);
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return snapshots;
  }

  /**
   * Calculate portfolio snapshot for a specific date
   */
  private async calculateSnapshotForDate(
    investments: any[],
    date: string,
    priceData: Map<string, Map<string, any>>
  ): Promise<PortfolioSnapshot | null> {
    let totalValue = 0;
    let dataQualityScore = 0;
    let totalInvestments = investments.length;

    // Detailed logging for debugging
    logger.debug(`=== CALCULATING PORTFOLIO SNAPSHOT FOR ${date} ===`);
    logger.debug(`Processing ${totalInvestments} investments`);

    for (const investment of investments) {
      const symbol = investment.securityInfo.symbol;
      const shares = investment.position.shares;
      const currentPrice = investment.position.currentPrice;
      
      const price = this.getPriceForDate(symbol, date, priceData);
      
      if (price) {
        const positionValue = shares * price.value;
        totalValue += positionValue;
        dataQualityScore += price.quality;
        
        logger.debug(`${symbol}: ${shares} shares × $${price.value.toFixed(2)} = $${positionValue.toFixed(2)} (quality: ${price.quality.toFixed(2)})`);
      } else {
        // Investment has no price data - this affects data quality
        dataQualityScore += 0;
        logger.debug(`${symbol}: No price data available for ${date}, skipping`);
      }
    }

    // Determine overall data quality for this date
    const averageQuality = dataQualityScore / totalInvestments;
    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (averageQuality >= 0.9) quality = 'excellent';
    else if (averageQuality >= 0.7) quality = 'good';
    else if (averageQuality >= 0.5) quality = 'fair';
    else quality = 'poor';

    logger.debug(`Total value: $${totalValue.toFixed(2)}, Quality: ${quality} (${averageQuality.toFixed(2)})`);
    logger.debug(`=== END SNAPSHOT CALCULATION FOR ${date} ===`);

    return {
      date,
      value: Math.round(totalValue * 100) / 100,
      investmentsCount: totalInvestments,
      dataQuality: quality
    };
  }

  /**
   * Get price for a specific symbol and date
   */
  private getPriceForDate(symbol: string, date: string, priceData: Map<string, Map<string, any>>): { value: number; quality: number } | null {
    const symbolPrices = priceData.get(symbol);
    if (!symbolPrices) {
      logger.debug(`No price data available for symbol ${symbol}`);
      return null;
    }

    // Try exact date first
    let priceRecord = symbolPrices.get(date);
    if (priceRecord) {
      logger.debug(`${symbol} on ${date}: Using exact date price $${priceRecord.close.toFixed(2)} (quality: 1.0)`);
      return { value: priceRecord.close, quality: 1.0 };
    }

    // Find most recent previous price (within 7 days)
    const availableDates = Array.from(symbolPrices.keys()).sort();
    const previousDates = availableDates.filter(d => d <= date);
    
    if (previousDates.length > 0) {
      const mostRecentDate = previousDates[previousDates.length - 1];
      const daysDiff = Math.floor(
        (new Date(date).getTime() - new Date(mostRecentDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff <= 7) {
        priceRecord = symbolPrices.get(mostRecentDate);
        if (priceRecord) {
          // Quality decreases with age
          const quality = Math.max(0.5, 1.0 - (daysDiff * 0.1));
          logger.debug(`${symbol} on ${date}: Using ${daysDiff} day old price $${priceRecord.close.toFixed(2)} from ${mostRecentDate} (quality: ${quality.toFixed(2)})`);
          return { value: priceRecord.close, quality };
        }
      } else {
        logger.debug(`${symbol} on ${date}: Most recent price is ${daysDiff} days old (too old, skipping)`);
      }
    } else {
      logger.debug(`${symbol} on ${date}: No previous price data available`);
    }

    logger.debug(`${symbol} on ${date}: No suitable price data found`);
    return null;
  }

  /**
   * Get all price data for investments in date range
   */
  private async getAllPriceData(
    investments: any[],
    dateRange: { start: Date; end: Date }
  ): Promise<Map<string, Map<string, any>>> {
    const symbols = [...new Set(investments.map(inv => inv.securityInfo.symbol))];
    const priceData = new Map<string, Map<string, any>>();

    for (const symbol of symbols) {
      const symbolPrices = await DailyPrice.find({
        symbol: symbol.toUpperCase(),
        date: { $gte: dateRange.start, $lte: dateRange.end }
      }).sort({ date: 1 });

      const dateMap = new Map<string, any>();
      symbolPrices.forEach(price => {
        const dateKey = price.date.toISOString().split('T')[0];
        dateMap.set(dateKey, price);
      });

      priceData.set(symbol, dateMap);
    }

    return priceData;
  }

  /**
   * Calculate current portfolio value for validation
   */
  private calculateCurrentValue(investments: any[]): number {
    return investments.reduce((sum, inv) => {
      return sum + (inv.position.shares * inv.position.currentPrice);
    }, 0);
  }

  /**
   * Validate calculation results
   */
  private validateResults(
    snapshots: PortfolioSnapshot[],
    currentValue: number,
    dataQuality: HistoricalDataQuality
  ): void {
    if (snapshots.length === 0) {
      logger.warn('No portfolio snapshots generated');
      return;
    }

    const latestSnapshot = snapshots[snapshots.length - 1];
    const difference = Math.abs(latestSnapshot.value - currentValue);
    const percentDifference = currentValue > 0 ? (difference / currentValue) * 100 : 0;

    logger.info('=== VALIDATION RESULTS ===');
    logger.info(`Latest snapshot value: $${latestSnapshot.value.toFixed(2)}`);
    logger.info(`Current real-time value: $${currentValue.toFixed(2)}`);
    logger.info(`Difference: $${difference.toFixed(2)} (${percentDifference.toFixed(2)}%)`);
    logger.info(`Data quality: ${dataQuality.overallCoverage.toFixed(1)}% coverage`);

    if (percentDifference > 5) {
      logger.warn(`Large discrepancy detected! This may indicate data quality issues.`);
    }
  }

  /**
   * Helper methods
   */
  private async getSymbolDataCoverage(symbol: string, dateRange: { start: Date; end: Date }): Promise<{
    percentage: number;
    dataPoints: number;
    firstDate?: Date;
    lastDate?: Date;
  }> {
    const prices = await DailyPrice.find({
      symbol: symbol.toUpperCase(),
      date: { $gte: dateRange.start, $lte: dateRange.end }
    }).sort({ date: 1 });

    const expectedDays = Math.floor((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const actualDays = prices.length;
    const percentage = (actualDays / expectedDays) * 100;

    return {
      percentage,
      dataPoints: actualDays,
      firstDate: prices[0]?.date,
      lastDate: prices[prices.length - 1]?.date
    };
  }

  private async populateSymbolPriceData(symbol: string, dateRange: { start: Date; end: Date }): Promise<void> {
    try {
      const historicalData = await this.marketDataService.getHistoricalData(symbol, '1y');
      
      if (!historicalData || historicalData.length === 0) {
        logger.warn(`No historical data available for ${symbol}`);
        return;
      }

      const filteredData = historicalData.filter(day => {
        const dayDate = new Date(day.date);
        return dayDate >= dateRange.start && dayDate <= dateRange.end;
      });

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

      if (bulkOps.length > 0) {
        await DailyPrice.bulkWrite(bulkOps);
        logger.info(`Populated ${bulkOps.length} price records for ${symbol}`);
      }
    } catch (error) {
      logger.error(`Error populating price data for ${symbol}:`, error);
    }
  }

  private createEmptyDataQuality(): HistoricalDataQuality {
    return {
      overallCoverage: 0,
      symbolCoverage: [],
      dateRange: { start: new Date(), end: new Date() }
    };
  }
}
