import PortfolioPriceHistory, { IPortfolioPriceHistory } from '../models/PortfolioPriceHistory';
import Investment from '../models/Investment';
import { MarketDataService } from './marketDataService';

export class PortfolioPriceCache {
  private static marketDataService = new MarketDataService();

  static async updateDailyPrices(): Promise<void> {
    try {
      const allSymbols = await Investment.distinct('securityInfo.symbol');
      
      if (allSymbols.length === 0) {
        console.log('No symbols found for price update');
        return;
      }

      console.log(`Updating prices for ${allSymbols.length} symbols...`);
      
      // Process symbols in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < allSymbols.length; i += batchSize) {
        const symbolBatch = allSymbols.slice(i, i + batchSize);
        
        await Promise.all(symbolBatch.map(async (symbol) => {
          try {
            const quote = await this.marketDataService.getQuote(symbol);
            
            if (quote && quote.currentPrice) {
              await PortfolioPriceHistory.create({
                symbol: symbol.toUpperCase(),
                date: new Date(),
                price: quote.currentPrice,
                volume: quote.volume || 0,
                source: 'yahoo_finance'
              });
            }
          } catch (error) {
            console.warn(`Failed to update price for ${symbol}:`, error);
          }
        }));
        
        // Small delay between batches to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`Successfully cached prices for symbols`);
    } catch (error) {
      console.error('Failed to update daily prices:', error);
    }
  }

  static async getHistoricalPrice(symbol: string, targetDate: Date): Promise<number> {
    try {
      // Try to get cached price first
      const cachedPrice = await PortfolioPriceHistory.findOne({
        symbol: symbol.toUpperCase(),
        date: { $lte: targetDate }
      }).sort({ date: -1 });
      
      if (cachedPrice && this.isRecentEnough(cachedPrice.date, targetDate)) {
        return cachedPrice.price;
      }
      
      // If no cache, try live API (fallback)
      try {
        const liveQuote = await this.marketDataService.getQuote(symbol);
        
        // Cache the current price for future use
        if (liveQuote && liveQuote.currentPrice) {
          await PortfolioPriceHistory.create({
            symbol: symbol.toUpperCase(),
            date: new Date(),
            price: liveQuote.currentPrice,
            source: 'yahoo_finance'
          });
          
          return liveQuote.currentPrice;
        }
      } catch (error) {
        console.warn(`No live price available for ${symbol}:`, error);
      }
      
      return 0;
    } catch (error) {
      console.error(`Error getting historical price for ${symbol}:`, error);
      return 0;
    }
  }

  private static isRecentEnough(cachedDate: Date, targetDate: Date): boolean {
    const daysDiff = Math.abs(cachedDate.getTime() - targetDate.getTime()) / (24 * 60 * 60 * 1000);
    return daysDiff <= 7; // Use cached price if within 7 days
  }

  static async getAvailablePriceHistory(symbol: string, days: number = 30): Promise<IPortfolioPriceHistory[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await PortfolioPriceHistory.find({
        symbol: symbol.toUpperCase(),
        date: { $gte: startDate }
      }).sort({ date: 1 });
    } catch (error) {
      console.error(`Error getting price history for ${symbol}:`, error);
      return [];
    }
  }

  static async cleanOldPrices(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await PortfolioPriceHistory.deleteMany({
        date: { $lt: cutoffDate }
      });
      
      console.log(`Cleaned ${result.deletedCount} old price records`);
    } catch (error) {
      console.error('Error cleaning old prices:', error);
    }
  }
}
