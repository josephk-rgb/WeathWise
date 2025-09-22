import yahooFinance from 'yahoo-finance2';
import axios from 'axios';
import { logger } from '../utils/logger';

export interface MarketData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  lastUpdated: Date;
}

export interface QuoteSummary {
  symbol: string;
  price: MarketData;
  summary?: any;
  statistics?: any;
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevance?: number;
}

export class MarketDataService {
  private newsApiKey = process.env['NEWS_API_KEY'];
  // private alphaVantageKey = process.env['ALPHA_VANTAGE_API_KEY']; // Will be used when implementing additional market data features

  /**
   * Get real-time quote for a symbol
   */
  async getQuote(symbol: string): Promise<MarketData | null> {
    try {
      const quote = await yahooFinance.quote(symbol) as any;
      
      return {
        symbol: quote.symbol,
        name: quote.longName || quote.shortName || symbol,
        currentPrice: quote.regularMarketPrice || 0,
        change: (quote.regularMarketPrice || 0) - (quote.regularMarketPreviousClose || 0),
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap || undefined,
        peRatio: quote.trailingPE || undefined,
        dividendYield: quote.dividendYield || undefined,
        high: quote.regularMarketDayHigh || 0,
        low: quote.regularMarketDayLow || 0,
        open: quote.regularMarketOpen || 0,
        previousClose: quote.regularMarketPreviousClose || 0,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get multiple quotes at once
   */
  async getQuotes(symbols: string[]): Promise<Record<string, MarketData>> {
    try {
      const quotes = await yahooFinance.quote(symbols) as any;
      const result: Record<string, MarketData> = {};

      if (Array.isArray(quotes)) {
        quotes.forEach((quote: any) => {
          if (quote) {
            result[quote.symbol] = {
              symbol: quote.symbol,
              name: quote.longName || quote.shortName || quote.symbol,
              currentPrice: quote.regularMarketPrice || 0,
              change: (quote.regularMarketPrice || 0) - (quote.regularMarketPreviousClose || 0),
              changePercent: quote.regularMarketChangePercent || 0,
              volume: quote.regularMarketVolume || 0,
              marketCap: quote.marketCap || undefined,
              peRatio: quote.trailingPE || undefined,
              dividendYield: quote.dividendYield || undefined,
              high: quote.regularMarketDayHigh || 0,
              low: quote.regularMarketDayLow || 0,
              open: quote.regularMarketOpen || 0,
              previousClose: quote.regularMarketPreviousClose || 0,
              lastUpdated: new Date()
            };
          }
        });
      } else {
        // Single quote result
        result[quotes.symbol] = {
          symbol: quotes.symbol,
          name: quotes.longName || quotes.shortName || quotes.symbol,
          currentPrice: quotes.regularMarketPrice || 0,
          change: (quotes.regularMarketPrice || 0) - (quotes.regularMarketPreviousClose || 0),
          changePercent: quotes.regularMarketChangePercent || 0,
          volume: quotes.regularMarketVolume || 0,
          marketCap: quotes.marketCap || undefined,
          peRatio: quotes.trailingPE || undefined,
          dividendYield: quotes.dividendYield || undefined,
          high: quotes.regularMarketDayHigh || 0,
          low: quotes.regularMarketDayLow || 0,
          open: quotes.regularMarketOpen || 0,
          previousClose: quotes.regularMarketPreviousClose || 0,
          lastUpdated: new Date()
        };
      }

      return result;
    } catch (error) {
      logger.error('Error fetching multiple quotes:', error);
      return {};
    }
  }

  /**
   * Search for symbols
   */
  async searchSymbols(query: string, limit: number = 10): Promise<any[]> {
    try {
      const results = await yahooFinance.search(query, { quotesCount: limit });
      return results.quotes || [];
    } catch (error) {
      logger.error('Error searching symbols:', error);
      return [];
    }
  }

  /**
   * Get historical data
   */
  async getHistoricalData(symbol: string, period: string = '1mo'): Promise<any[]> {
    try {
      // Calculate date range based on period
      const now = new Date();
      let period1: Date;
      
      switch (period) {
        case '1d':
          period1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
          break;
        case '5d':
          period1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
          break;
        case '1mo':
          period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3mo':
          period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '6mo':
          period1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case '2y':
          period1 = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
          break;
        case '5y':
          period1 = new Date(now.getTime() - 1825 * 24 * 60 * 60 * 1000);
          break;
        default:
          period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const historical = await yahooFinance.historical(symbol, {
        period1,
        period2: now,
        interval: period === '5y' ? '1wk' : '1d' // Weekly for 5y, daily for shorter periods
      });
      
      return historical.map(day => ({
        date: day.date,
        open: day.open,
        high: day.high,
        low: day.low,
        close: day.close,
        volume: day.volume,
        adjClose: day.adjClose
      }));
    } catch (error) {
      logger.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get historical data for multiple symbols
   */
  async getMultipleHistoricalData(symbols: string[], period: string = '1y'): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};
    
    // Process symbols in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const symbolBatch = symbols.slice(i, i + batchSize);
      
      await Promise.all(symbolBatch.map(async (symbol) => {
        try {
          const historicalData = await this.getHistoricalData(symbol, period);
          result[symbol] = historicalData;
        } catch (error) {
          logger.error(`Error fetching historical data for ${symbol}:`, error);
          result[symbol] = [];
        }
      }));
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return result;
  }

  /**
   * Get market summary (major indices)
   */
  async getMarketSummary(): Promise<Record<string, MarketData>> {
    const majorIndices = ['^GSPC', '^DJI', '^IXIC', '^RUT']; // S&P 500, Dow Jones, NASDAQ, Russell 2000
    
    try {
      return await this.getQuotes(majorIndices);
    } catch (error) {
      logger.error('Error fetching market summary:', error);
      return {};
    }
  }

  /**
   * Get market news
   */
  async getMarketNews(query?: string, limit: number = 20): Promise<NewsArticle[]> {
    try {
      if (!this.newsApiKey) {
        logger.warn('News API key not configured, returning mock data');
        return this.getMockNews();
      }

      const searchQuery = query || 'stock market finance';
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: searchQuery,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: limit,
          apiKey: this.newsApiKey
        }
      });

      if (response.data.status === 'ok') {
        return response.data.articles.map((article: any, index: number) => ({
          id: `news_${index}`,
          title: article.title,
          description: article.description,
          url: article.url,
          publishedAt: article.publishedAt,
          source: article.source.name,
          sentiment: this.analyzeSentiment(article.title + ' ' + article.description),
          relevance: this.calculateRelevance(article.title + ' ' + article.description, searchQuery)
        }));
      }

      return [];
    } catch (error) {
      logger.error('Error fetching market news:', error);
      return this.getMockNews();
    }
  }

  /**
   * Get news for specific symbol
   */
  async getSymbolNews(symbol: string, limit: number = 10): Promise<NewsArticle[]> {
    try {
      const companyName = await this.getCompanyName(symbol);
      const searchQuery = `${symbol} ${companyName}`;
      return await this.getMarketNews(searchQuery, limit);
    } catch (error) {
      logger.error(`Error fetching news for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get company name for symbol
   */
  private async getCompanyName(symbol: string): Promise<string> {
    try {
      const quote = await this.getQuote(symbol);
      return quote?.name || symbol;
    } catch (error) {
      return symbol;
    }
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['up', 'gain', 'rise', 'positive', 'growth', 'profit', 'success', 'bullish'];
    const negativeWords = ['down', 'loss', 'fall', 'negative', 'decline', 'drop', 'bearish', 'crash'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(text: string, query: string): number {
    const queryWords = query.toLowerCase().split(' ');
    const textWords = text.toLowerCase().split(' ');
    const matches = queryWords.filter(word => textWords.includes(word)).length;
    return Math.min(matches / queryWords.length, 1);
  }

  /**
   * Mock news data for when API is not available
   */
  private getMockNews(): NewsArticle[] {
    return [
      {
        id: 'mock_1',
        title: 'Market Rally Continues as Tech Stocks Lead Gains',
        description: 'Technology stocks led a broad market rally today, with major indices posting significant gains.',
        url: 'https://example.com/news1',
        publishedAt: new Date().toISOString(),
        source: 'Financial Times',
        sentiment: 'positive',
        relevance: 0.9
      },
      {
        id: 'mock_2',
        title: 'Federal Reserve Signals Potential Rate Changes',
        description: 'The Federal Reserve indicated possible adjustments to interest rates in response to economic indicators.',
        url: 'https://example.com/news2',
        publishedAt: new Date().toISOString(),
        source: 'Wall Street Journal',
        sentiment: 'neutral',
        relevance: 0.8
      },
      {
        id: 'mock_3',
        title: 'Earnings Season Shows Mixed Results for Major Companies',
        description: 'Corporate earnings reports reveal varying performance across different sectors.',
        url: 'https://example.com/news3',
        publishedAt: new Date().toISOString(),
        source: 'Bloomberg',
        sentiment: 'neutral',
        relevance: 0.7
      }
    ];
  }

  /**
   * Update investment prices
   */
  async updateInvestmentPrices(investments: any[]): Promise<any[]> {
    try {
      const symbols = investments.map(inv => inv.securityInfo.symbol);
      const quotes = await this.getQuotes(symbols);
      
      return investments.map(investment => {
        const quote = quotes[investment.securityInfo.symbol];
        if (quote) {
          const newMarketValue = investment.position.shares * quote.currentPrice;
          const newGainLoss = newMarketValue - investment.position.totalCost;
          const newGainLossPercent = investment.position.totalCost > 0 ? 
            (newGainLoss / investment.position.totalCost) * 100 : 0;
          
          return {
            ...investment.toObject(),
            position: {
              ...investment.position,
              currentPrice: quote.currentPrice,
              marketValue: newMarketValue,
              gainLoss: newGainLoss,
              gainLossPercent: newGainLossPercent,
              dayChange: quote.change * investment.position.shares,
              dayChangePercent: quote.changePercent
            }
          };
        }
        return investment;
      });
    } catch (error) {
      logger.error('Error updating investment prices:', error);
      return investments;
    }
  }

  /**
   * Calculate real portfolio historical performance using actual market data
   */
  async calculatePortfolioHistoricalPerformance(investments: any[], period: string = '1y'): Promise<any[]> {
    try {
      if (investments.length === 0) {
        return [];
      }

      // Filter only active investments (same as real-time calculation)
      const activeInvestments = investments.filter(inv => inv.isActive !== false);
      
      if (activeInvestments.length === 0) {
        return [];
      }

      // Get all unique symbols from active investments
      const symbols = [...new Set(activeInvestments.map(inv => inv.securityInfo.symbol))];
      
      logger.info(`Calculating historical performance for ${symbols.length} symbols:`, symbols);
      
      // Fetch historical data for all symbols
      const historicalData = await this.getMultipleHistoricalData(symbols, period);
      
      // Get all unique dates from the historical data
      const allDates = new Set<string>();
      Object.values(historicalData).forEach(data => {
        data.forEach(day => {
          const dateStr = day.date instanceof Date ? day.date.toISOString().split('T')[0] : day.date;
          allDates.add(dateStr);
        });
      });
      
      // Sort dates
      const sortedDates = Array.from(allDates).sort();
      
      logger.info(`Found ${sortedDates.length} unique dates for historical calculation`);
      
      // Calculate portfolio value for each date
      const portfolioHistory = sortedDates.map(date => {
        let totalValue = 0;
        
        activeInvestments.forEach(investment => {
          const symbol = investment.securityInfo.symbol;
          const symbolData = historicalData[symbol];
          
          if (symbolData && symbolData.length > 0) {
            // Find the closest date (or exact match) for this symbol
            let priceData = symbolData.find(day => {
              const dayDateStr = day.date instanceof Date ? day.date.toISOString().split('T')[0] : day.date;
              return dayDateStr === date;
            });
            
            // If no exact match, find the most recent price before this date
            if (!priceData) {
              priceData = symbolData
                .filter(day => {
                  const dayDateStr = day.date instanceof Date ? day.date.toISOString().split('T')[0] : day.date;
                  return dayDateStr <= date;
                })
                .sort((a, b) => {
                  const dateA = a.date instanceof Date ? a.date : new Date(a.date);
                  const dateB = b.date instanceof Date ? b.date : new Date(b.date);
                  return dateB.getTime() - dateA.getTime();
                })[0];
            }
            
            // If still no data, use the purchase price as fallback
            if (!priceData) {
              priceData = { close: investment.acquisition.purchasePrice };
            }
            
            const positionValue = investment.position.shares * priceData.close;
            totalValue += positionValue;
          } else {
            // Fallback to purchase price if no historical data
            const positionValue = investment.position.shares * investment.acquisition.purchasePrice;
            totalValue += positionValue;
          }
        });
        
        return {
          date,
          value: Math.round(totalValue * 100) / 100
        };
      });
      
      logger.info(`Generated ${portfolioHistory.length} historical data points`);
      if (portfolioHistory.length > 0) {
        logger.info(`Portfolio value range: ${portfolioHistory[0].value} to ${portfolioHistory[portfolioHistory.length - 1].value}`);
        
        // Debug: Calculate current portfolio value using the same method for comparison
        const currentDate = new Date().toISOString().split('T')[0];
        const currentValueFromHistory = portfolioHistory.find(h => h.date === currentDate)?.value || 0;
        
        // Calculate current value using real-time method for comparison
        let currentValueRealTime = 0;
        activeInvestments.forEach(investment => {
          currentValueRealTime += investment.position.shares * investment.position.currentPrice;
        });
        
        logger.info(`Current portfolio value comparison:`);
        logger.info(`  From historical calculation: ${currentValueFromHistory}`);
        logger.info(`  From real-time calculation: ${currentValueRealTime}`);
        logger.info(`  Difference: ${Math.abs(currentValueFromHistory - currentValueRealTime)}`);
      }
      
      return portfolioHistory;
    } catch (error) {
      logger.error('Error calculating portfolio historical performance:', error);
      return [];
    }
  }
}
