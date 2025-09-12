import mongoose from 'mongoose';
import Investment from '../models/Investment';
import { MarketDataService } from './marketDataService';
import { NetWorthTracker } from './netWorthTracker';
import { PortfolioPriceCache } from './portfolioPriceCache';

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
}

export interface EnrichedStockData {
  symbol: string;
  name: string;
  currentPrice: number;
  sector?: string;
  marketCap?: number;
  currency?: string;
  change?: number;
  changePercent?: number;
}

export class EnhancedPortfolioService {
  private static marketDataService = new MarketDataService();

  static async searchStocks(query: string, limit: number = 10): Promise<StockSearchResult[]> {
    try {
      // Use existing MarketDataService.searchSymbols()
      const results = await this.marketDataService.searchSymbols(query, limit);
      
      return results.map(result => ({
        symbol: result.symbol,
        name: result.name || result.symbol,
        exchange: result.exchange,
        type: result.type || 'stock'
      }));
    } catch (error) {
      console.error('Error searching stocks:', error);
      return [];
    }
  }

  static async validateAndEnrichStock(symbol: string): Promise<EnrichedStockData | null> {
    try {
      const quote = await this.marketDataService.getQuote(symbol);
      
      if (!quote) {
        return null;
      }

      return {
        symbol: quote.symbol,
        name: quote.name || quote.symbol,
        currentPrice: quote.currentPrice,
        sector: undefined, // Not available in current MarketData interface
        marketCap: quote.marketCap,
        currency: 'USD', // Default to USD since not available in MarketData
        change: quote.change,
        changePercent: quote.changePercent
      };
    } catch (error) {
      console.error(`Error validating stock ${symbol}:`, error);
      return null;
    }
  }

  static async updateAllPortfolioPrices(): Promise<void> {
    try {
      const allInvestments = await Investment.find({ isActive: true });
      
      if (allInvestments.length === 0) {
        console.log('No investments found to update');
        return;
      }

      // Get unique symbols
      const symbols = [...new Set(allInvestments.map(inv => inv.securityInfo.symbol))].filter(Boolean);
      
      console.log(`Updating prices for ${symbols.length} symbols...`);

      // Update prices in batches
      const batchSize = 10;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const symbolBatch = symbols.slice(i, i + batchSize);
        
        await Promise.all(symbolBatch.map(async (symbol) => {
          try {
            const quote = await this.marketDataService.getQuote(symbol);
            
            if (quote && quote.currentPrice) {
              // Update all investments with this symbol
              const investmentsToUpdate = allInvestments.filter(
                inv => inv.securityInfo.symbol === symbol
              );

              for (const investment of investmentsToUpdate) {
                const previousMarketValue = investment.position.marketValue;
                
                investment.position.currentPrice = quote.currentPrice;
                investment.position.marketValue = investment.position.shares * quote.currentPrice;
                investment.position.gainLoss = investment.position.marketValue - investment.position.totalCost;
                
                // Calculate daily change
                if (quote.change) {
                  investment.position.dayChange = investment.position.shares * quote.change;
                  investment.position.dayChangePercent = quote.changePercent || 0;
                }

                await investment.save();

                // Track significant changes
                const changeAmount = investment.position.marketValue - previousMarketValue;
                if (Math.abs(changeAmount) > 1000) {
                  console.log(`Significant change in ${symbol}: $${changeAmount.toFixed(2)}`);
                }
              }

              // Cache the price
              await PortfolioPriceCache.updateDailyPrices();
            }
          } catch (error) {
            console.warn(`Failed to update ${symbol}:`, error);
          }
        }));

        // Small delay between batches
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Trigger net worth snapshots for users with significant portfolio changes
      const userIds = [...new Set(allInvestments.map(inv => inv.userId))];
      for (const userId of userIds) {
        await NetWorthTracker.onSignificantEvent(
          userId as mongoose.Types.ObjectId,
          'investment_update',
          'Portfolio prices updated'
        );
      }

      console.log('Portfolio price update completed');
    } catch (error) {
      console.error('Error updating portfolio prices:', error);
    }
  }

  static async getPortfolioPerformance(userId: mongoose.Types.ObjectId): Promise<any> {
    try {
      const investments = await Investment.find({ userId, isActive: true });
      
      if (investments.length === 0) {
        return {
          totalValue: 0,
          totalCost: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          dayChange: 0,
          dayChangePercent: 0,
          positions: []
        };
      }

      const totalValue = investments.reduce((sum, inv) => sum + inv.position.marketValue, 0);
      const totalCost = investments.reduce((sum, inv) => sum + inv.position.totalCost, 0);
      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
      
      const dayChange = investments.reduce((sum, inv) => sum + (inv.position.dayChange || 0), 0);
      const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

      const positions = investments.map(inv => ({
        symbol: inv.securityInfo.symbol,
        name: inv.securityInfo.name,
        shares: inv.position.shares,
        currentPrice: inv.position.currentPrice,
        marketValue: inv.position.marketValue,
        totalCost: inv.position.totalCost,
        gainLoss: inv.position.gainLoss,
        gainLossPercent: inv.position.totalCost > 0 ? (inv.position.gainLoss / inv.position.totalCost) * 100 : 0,
        dayChange: inv.position.dayChange || 0,
        dayChangePercent: inv.position.dayChangePercent || 0,
        weight: totalValue > 0 ? (inv.position.marketValue / totalValue) * 100 : 0
      }));

      return {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        dayChange,
        dayChangePercent,
        positions: positions.sort((a, b) => b.marketValue - a.marketValue)
      };
    } catch (error) {
      console.error('Error getting portfolio performance:', error);
      return null;
    }
  }

  static async getTopMovers(userId: mongoose.Types.ObjectId): Promise<any> {
    try {
      const investments = await Investment.find({ userId, isActive: true });
      
      const positions = investments
        .filter(inv => inv.position.dayChangePercent !== undefined)
        .map(inv => ({
          symbol: inv.securityInfo.symbol,
          name: inv.securityInfo.name,
          currentPrice: inv.position.currentPrice,
          dayChange: inv.position.dayChange || 0,
          dayChangePercent: inv.position.dayChangePercent || 0,
          marketValue: inv.position.marketValue
        }));

      const gainers = positions
        .filter(pos => pos.dayChangePercent > 0)
        .sort((a, b) => b.dayChangePercent - a.dayChangePercent)
        .slice(0, 5);

      const losers = positions
        .filter(pos => pos.dayChangePercent < 0)
        .sort((a, b) => a.dayChangePercent - b.dayChangePercent)
        .slice(0, 5);

      return {
        gainers,
        losers,
        totalPositions: positions.length
      };
    } catch (error) {
      console.error('Error getting top movers:', error);
      return { gainers: [], losers: [], totalPositions: 0 };
    }
  }
}
