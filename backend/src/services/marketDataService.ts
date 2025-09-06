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
  async getHistoricalData(symbol: string, _period: string = '1mo'): Promise<any[]> {
    try {
      const historical = await yahooFinance.historical(symbol, {
        period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        period2: new Date(),
        interval: '1d'
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
}
