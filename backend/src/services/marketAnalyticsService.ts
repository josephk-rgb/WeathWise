import yahooFinance from 'yahoo-finance2';
import { logger } from '../utils/logger';

export interface HistoricalPrice {
  date: Date;
  close: number;
  adjustedClose: number;
  volume: number;
}

export interface RiskMetrics {
  beta: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  var95: number; // Value at Risk (95%)
  correlation: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  informationRatio: number;
  sortingRatio: number;
}

export class MarketAnalyticsService {
  private readonly cacheTimeout = 3600000; // 1 hour
  private priceCache = new Map<string, { data: HistoricalPrice[]; timestamp: number }>();
  private benchmarkSymbol = 'SPY'; // S&P 500 ETF as default benchmark

  /**
   * Get historical price data for a symbol
   */
  async getHistoricalPrices(symbol: string, period: '1mo' | '3mo' | '6mo' | '1y' | '2y' = '1y'): Promise<HistoricalPrice[]> {
    const cacheKey = `${symbol}_${period}`;
    const cached = this.priceCache.get(cacheKey);
    
    // Check cache
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Set start date based on period
      switch (period) {
        case '1mo':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3mo':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6mo':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case '2y':
          startDate.setFullYear(endDate.getFullYear() - 2);
          break;
      }

      const result = await yahooFinance.historical(symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      });

      const prices: HistoricalPrice[] = result.map(item => ({
        date: item.date,
        close: item.close || 0,
        adjustedClose: item.adjClose || item.close || 0,
        volume: item.volume || 0
      }));

      // Cache the result
      this.priceCache.set(cacheKey, {
        data: prices,
        timestamp: Date.now()
      });

      return prices;
    } catch (error) {
      logger.error(`Error fetching historical prices for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Calculate daily returns from price data
   */
  private calculateReturns(prices: HistoricalPrice[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const prevPrice = prices[i - 1].adjustedClose;
      const currentPrice = prices[i].adjustedClose;
      
      if (prevPrice > 0) {
        const dailyReturn = (currentPrice - prevPrice) / prevPrice;
        returns.push(dailyReturn);
      }
    }
    
    return returns;
  }

  /**
   * Calculate beta relative to market benchmark
   */
  async calculateBeta(symbol: string, period: '1y' | '2y' = '1y'): Promise<number> {
    try {
      // Get stock and benchmark price data
      const [stockPrices, benchmarkPrices] = await Promise.all([
        this.getHistoricalPrices(symbol, period),
        this.getHistoricalPrices(this.benchmarkSymbol, period)
      ]);

      if (stockPrices.length < 30 || benchmarkPrices.length < 30) {
        logger.warn(`Insufficient data for beta calculation: ${symbol}`);
        return 1.0; // Default beta
      }

      // Calculate returns
      const stockReturns = this.calculateReturns(stockPrices);
      const benchmarkReturns = this.calculateReturns(benchmarkPrices);

      // Align data (ensure same dates)
      const minLength = Math.min(stockReturns.length, benchmarkReturns.length);
      const alignedStockReturns = stockReturns.slice(-minLength);
      const alignedBenchmarkReturns = benchmarkReturns.slice(-minLength);

      // Calculate covariance and variance
      const covariance = this.calculateCovariance(alignedStockReturns, alignedBenchmarkReturns);
      const benchmarkVariance = this.calculateVariance(alignedBenchmarkReturns);

      if (benchmarkVariance === 0) {
        return 1.0;
      }

      const beta = covariance / benchmarkVariance;
      return Math.round(beta * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      logger.error(`Error calculating beta for ${symbol}:`, error);
      return 1.0; // Default beta on error
    }
  }

  /**
   * Calculate historical volatility (annualized)
   */
  async calculateVolatility(symbol: string, period: '1y' | '2y' = '1y'): Promise<number> {
    try {
      const prices = await this.getHistoricalPrices(symbol, period);
      
      if (prices.length < 30) {
        logger.warn(`Insufficient data for volatility calculation: ${symbol}`);
        return 20.0; // Default volatility percentage
      }

      const returns = this.calculateReturns(prices);
      const volatility = this.calculateStandardDeviation(returns);
      
      // Annualize volatility (assuming 252 trading days per year)
      const annualizedVolatility = volatility * Math.sqrt(252) * 100;
      
      return Math.round(annualizedVolatility * 100) / 100;
    } catch (error) {
      logger.error(`Error calculating volatility for ${symbol}:`, error);
      return 20.0; // Default volatility on error
    }
  }

  /**
   * Calculate comprehensive risk metrics
   */
  async calculateRiskMetrics(symbol: string, period: '1y' | '2y' = '1y'): Promise<RiskMetrics> {
    try {
      const [beta, volatility, prices] = await Promise.all([
        this.calculateBeta(symbol, period),
        this.calculateVolatility(symbol, period),
        this.getHistoricalPrices(symbol, period)
      ]);

      const returns = this.calculateReturns(prices);
      const benchmarkPrices = await this.getHistoricalPrices(this.benchmarkSymbol, period);
      const benchmarkReturns = this.calculateReturns(benchmarkPrices);

      return {
        beta,
        volatility,
        sharpeRatio: this.calculateSharpeRatio(returns),
        maxDrawdown: this.calculateMaxDrawdown(prices),
        var95: this.calculateVaR(returns, 0.05),
        correlation: this.calculateCorrelation(returns, benchmarkReturns)
      };
    } catch (error) {
      logger.error(`Error calculating risk metrics for ${symbol}:`, error);
      // Return default values on error
      return {
        beta: 1.0,
        volatility: 20.0,
        sharpeRatio: 0.0,
        maxDrawdown: 0.0,
        var95: 0.0,
        correlation: 0.5
      };
    }
  }

  /**
   * Calculate portfolio-level metrics
   */
  async calculatePortfolioMetrics(holdings: { symbol: string; weight: number }[]): Promise<RiskMetrics> {
    try {
      const individualMetrics = await Promise.all(
        holdings.map(holding => this.calculateRiskMetrics(holding.symbol))
      );

      // Weighted average of individual metrics
      let portfolioBeta = 0;
      let portfolioVolatility = 0;

      for (let i = 0; i < holdings.length; i++) {
        portfolioBeta += individualMetrics[i].beta * holdings[i].weight;
        portfolioVolatility += individualMetrics[i].volatility * holdings[i].weight;
      }

      // For correlation and other metrics, use weighted averages
      const weightedCorrelation = individualMetrics.reduce((sum, metrics, i) => 
        sum + metrics.correlation * holdings[i].weight, 0);

      const weightedSharpe = individualMetrics.reduce((sum, metrics, i) => 
        sum + metrics.sharpeRatio * holdings[i].weight, 0);

      const weightedMaxDrawdown = individualMetrics.reduce((sum, metrics, i) => 
        sum + metrics.maxDrawdown * holdings[i].weight, 0);

      const weightedVaR = individualMetrics.reduce((sum, metrics, i) => 
        sum + metrics.var95 * holdings[i].weight, 0);

      return {
        beta: Math.round(portfolioBeta * 100) / 100,
        volatility: Math.round(portfolioVolatility * 100) / 100,
        sharpeRatio: Math.round(weightedSharpe * 100) / 100,
        maxDrawdown: Math.round(weightedMaxDrawdown * 100) / 100,
        var95: Math.round(weightedVaR * 100) / 100,
        correlation: Math.round(weightedCorrelation * 100) / 100
      };
    } catch (error) {
      logger.error('Error calculating portfolio metrics:', error);
      return {
        beta: 1.0,
        volatility: 15.0,
        sharpeRatio: 0.0,
        maxDrawdown: 0.0,
        var95: 0.0,
        correlation: 0.5
      };
    }
  }

  // Statistical helper methods
  private calculateCovariance(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let covariance = 0;
    for (let i = 0; i < n; i++) {
      covariance += (x[i] - meanX) * (y[i] - meanY);
    }

    return covariance / (n - 1);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  }

  private calculateStandardDeviation(values: number[]): number {
    return Math.sqrt(this.calculateVariance(values));
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const covariance = this.calculateCovariance(x, y);
    const stdX = this.calculateStandardDeviation(x);
    const stdY = this.calculateStandardDeviation(y);

    if (stdX === 0 || stdY === 0) return 0;
    return covariance / (stdX * stdY);
  }

  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    const annualizedReturn = returns.reduce((a, b) => a + b, 0) * 252; // Annualize
    const volatility = this.calculateStandardDeviation(returns) * Math.sqrt(252);
    
    if (volatility === 0) return 0;
    return (annualizedReturn - riskFreeRate) / volatility;
  }

  private calculateMaxDrawdown(prices: HistoricalPrice[]): number {
    let maxDrawdown = 0;
    let peak = prices[0]?.adjustedClose || 0;

    for (const price of prices) {
      if (price.adjustedClose > peak) {
        peak = price.adjustedClose;
      }
      
      const drawdown = (peak - price.adjustedClose) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown * 100; // Return as percentage
  }

  private calculateVaR(returns: number[], confidence: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * confidence);
    return sortedReturns[index] * 100; // Return as percentage
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.priceCache.clear();
    logger.info('Market analytics cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return {
      cacheSize: this.priceCache.size,
      cacheEntries: Array.from(this.priceCache.keys()),
      cacheTimeout: this.cacheTimeout
    };
  }
}
