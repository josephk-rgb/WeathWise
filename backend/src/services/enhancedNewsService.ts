import axios from 'axios';
import { logger } from '../utils/logger';
import { NewsArticle } from './marketDataService';

interface NewsProvider {
  name: string;
  isAvailable: boolean;
  rateLimitRemaining: number;
  lastReset: Date;
}

export class EnhancedNewsService {
  private newsApiKey = process.env['NEWS_API_KEY'];
  private alphaVantageKey = process.env['ALPHA_VANTAGE_API_KEY'];
  private polygonKey = process.env['POLYGON_API_KEY'];
  private fmpKey = process.env['FINANCIAL_MODELING_PREP_API_KEY'];

  private providers: Record<string, NewsProvider> = {
    newsapi: { name: 'NewsAPI.org', isAvailable: !!this.newsApiKey, rateLimitRemaining: 1000, lastReset: new Date() },
    alphavantage: { name: 'Alpha Vantage', isAvailable: !!this.alphaVantageKey, rateLimitRemaining: 25, lastReset: new Date() },
    polygon: { name: 'Polygon.io', isAvailable: !!this.polygonKey, rateLimitRemaining: 300, lastReset: new Date() },
    fmp: { name: 'Financial Modeling Prep', isAvailable: !!this.fmpKey, rateLimitRemaining: 250, lastReset: new Date() }
  };

  /**
   * Get news from the best available provider
   */
  async getNews(query?: string, limit: number = 20): Promise<{
    articles: NewsArticle[];
    source: string;
    rateLimitInfo: NewsProvider;
  }> {
    // Try providers in order of preference
    const providerOrder = ['newsapi', 'alphavantage', 'fmp', 'polygon'];

    for (const providerKey of providerOrder) {
      const provider = this.providers[providerKey];
      
      if (provider.isAvailable && provider.rateLimitRemaining > 0) {
        try {
          const result = await this.fetchFromProvider(providerKey, query, limit);
          if (result.articles.length > 0) {
            return {
              articles: result.articles,
              source: provider.name,
              rateLimitInfo: provider
            };
          }
        } catch (error) {
          logger.warn(`Provider ${provider.name} failed:`, error);
          continue;
        }
      }
    }

    // Fallback to mock data
    logger.warn('All news providers unavailable, using fallback data');
    return {
      articles: this.getMockNews(),
      source: 'Fallback Data',
      rateLimitInfo: { name: 'Mock', isAvailable: true, rateLimitRemaining: 999, lastReset: new Date() }
    };
  }

  /**
   * Fetch news from specific provider
   */
  private async fetchFromProvider(provider: string, query?: string, limit: number = 20): Promise<{
    articles: NewsArticle[];
  }> {
    switch (provider) {
      case 'newsapi':
        return await this.fetchFromNewsAPI(query, limit);
      case 'alphavantage':
        return await this.fetchFromAlphaVantage(query, limit);
      case 'fmp':
        return await this.fetchFromFMP(query, limit);
      case 'polygon':
        return await this.fetchFromPolygon(query, limit);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * NewsAPI.org implementation
   */
  private async fetchFromNewsAPI(query?: string, limit: number = 20): Promise<{ articles: NewsArticle[] }> {
    // Enhanced search query for most important financial news
    const searchQuery = query || 'stock market OR finance OR economy OR "federal reserve" OR earnings OR "market update"';
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: searchQuery,
        language: 'en',
        sortBy: 'publishedAt', // Get recent articles first
        pageSize: Math.min(limit * 3, 50), // Fetch more to filter for quality
        apiKey: this.newsApiKey
      },
      timeout: 10000
    });

    if (response.data.status === 'ok') {
      // Update rate limit info
      this.providers.newsapi.rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining'] || '1000');
      
      const articles = response.data.articles
        .map((article: any, index: number) => ({
          id: `newsapi_${Date.now()}_${index}`,
          title: article.title,
          description: article.description,
          url: article.url,
          publishedAt: article.publishedAt,
          source: article.source.name,
          sentiment: this.analyzeSentiment(article.title + ' ' + article.description),
          relevance: this.calculateRelevance(article.title + ' ' + article.description, searchQuery)
        }))
        // Sort by relevance first (highest first), then by recency
        .sort((a, b) => {
          const relevanceDiff = b.relevance - a.relevance;
          if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff; // If significant relevance difference
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(); // Then by recency
        })
        .slice(0, limit); // Take only the requested amount

      return { articles };
    }

    throw new Error('NewsAPI request failed');
  }

  /**
   * Alpha Vantage news implementation
   */
  private async fetchFromAlphaVantage(query?: string, limit: number = 20): Promise<{ articles: NewsArticle[] }> {
    const searchQuery = query || 'financial';
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'NEWS_SENTIMENT',
        tickers: searchQuery.includes(' ') ? undefined : searchQuery,
        topics: searchQuery.includes(' ') ? 'financial_markets' : undefined,
        limit: limit,
        apikey: this.alphaVantageKey
      },
      timeout: 10000
    });

    if (response.data && response.data.feed) {
      // Update rate limit (Alpha Vantage doesn't provide headers, so we track manually)
      this.providers.alphavantage.rateLimitRemaining = Math.max(0, this.providers.alphavantage.rateLimitRemaining - 1);

      const articles = response.data.feed.map((article: any, index: number) => ({
        id: `alphavantage_${Date.now()}_${index}`,
        title: article.title,
        description: article.summary,
        url: article.url,
        publishedAt: article.time_published,
        source: article.source,
        sentiment: article.overall_sentiment_label?.toLowerCase() as 'positive' | 'negative' | 'neutral' || 'neutral',
        relevance: parseFloat(article.relevance_score || '0.5')
      }));

      return { articles };
    }

    throw new Error('Alpha Vantage request failed');
  }

  /**
   * Financial Modeling Prep implementation
   */
  private async fetchFromFMP(query?: string, limit: number = 20): Promise<{ articles: NewsArticle[] }> {
    const response = await axios.get('https://financialmodelingprep.com/api/v3/stock_news', {
      params: {
        limit: limit,
        apikey: this.fmpKey
      },
      timeout: 10000
    });

    if (response.data && Array.isArray(response.data)) {
      // Update rate limit
      this.providers.fmp.rateLimitRemaining = Math.max(0, this.providers.fmp.rateLimitRemaining - 1);

      const articles = response.data.map((article: any, index: number) => ({
        id: `fmp_${Date.now()}_${index}`,
        title: article.title,
        description: article.text?.substring(0, 200) + '...',
        url: article.url,
        publishedAt: article.publishedDate,
        source: article.site,
        sentiment: this.analyzeSentiment(article.title + ' ' + article.text),
        relevance: query ? this.calculateRelevance(article.title + ' ' + article.text, query) : 0.5
      }));

      return { articles };
    }

    throw new Error('FMP request failed');
  }

  /**
   * Polygon.io implementation
   */
  private async fetchFromPolygon(query?: string, limit: number = 20): Promise<{ articles: NewsArticle[] }> {
    const response = await axios.get('https://api.polygon.io/v2/reference/news', {
      params: {
        limit: limit,
        apikey: this.polygonKey
      },
      timeout: 10000
    });

    if (response.data && response.data.results) {
      // Update rate limit
      this.providers.polygon.rateLimitRemaining = Math.max(0, this.providers.polygon.rateLimitRemaining - 1);

      const articles = response.data.results.map((article: any, index: number) => ({
        id: `polygon_${Date.now()}_${index}`,
        title: article.title,
        description: article.description,
        url: article.article_url,
        publishedAt: article.published_utc,
        source: article.publisher.name,
        sentiment: this.analyzeSentiment(article.title + ' ' + article.description),
        relevance: query ? this.calculateRelevance(article.title + ' ' + article.description, query) : 0.5
      }));

      return { articles };
    }

    throw new Error('Polygon request failed');
  }

  /**
   * Get provider status for monitoring
   */
  getProviderStatus(): Record<string, NewsProvider & { hasApiKey: boolean }> {
    return {
      newsapi: { ...this.providers.newsapi, hasApiKey: !!this.newsApiKey },
      alphavantage: { ...this.providers.alphavantage, hasApiKey: !!this.alphaVantageKey },
      fmp: { ...this.providers.fmp, hasApiKey: !!this.fmpKey },
      polygon: { ...this.providers.polygon, hasApiKey: !!this.polygonKey }
    };
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['gain', 'up', 'rise', 'bull', 'growth', 'profit', 'increase', 'strong', 'beat', 'surge'];
    const negativeWords = ['loss', 'down', 'fall', 'bear', 'decline', 'crash', 'drop', 'weak', 'miss', 'plunge'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate relevance score for financial news importance
   */
  private calculateRelevance(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // High-importance financial keywords
    const highImportanceKeywords = [
      'federal reserve', 'fed', 'interest rate', 'inflation', 'gdp',
      'earnings', 'market crash', 'bull market', 'bear market',
      'recession', 'economy', 'unemployment', 'jobs report',
      'warren buffett', 'tesla', 'apple', 'nvidia', 'microsoft',
      'sp500', 's&p 500', 'dow jones', 'nasdaq', 'cryptocurrency',
      'bitcoin', 'merger', 'acquisition', 'ipo', 'dividend'
    ];
    
    // Medium-importance keywords
    const mediumImportanceKeywords = [
      'stock', 'finance', 'investment', 'trading', 'market',
      'portfolio', 'analyst', 'price target', 'upgrade', 'downgrade'
    ];
    
    let score = 0;
    
    // Check for high-importance keywords (weight: 3)
    highImportanceKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        score += 3;
      }
    });
    
    // Check for medium-importance keywords (weight: 1)
    mediumImportanceKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        score += 1;
      }
    });
    
    // Check for query word matches (weight: 2)
    const queryWords = lowerQuery.split(' ').filter(word => word.length > 2);
    queryWords.forEach(word => {
      if (lowerText.includes(word)) {
        score += 2;
      }
    });
    
    // Boost score for financial sources
    const prestigeSources = ['reuters', 'bloomberg', 'wall street journal', 'financial times', 'cnbc'];
    if (prestigeSources.some(source => lowerText.includes(source))) {
      score *= 1.2;
    }
    
    // Normalize score to 0-1 range, with emphasis on higher scores
    return Math.min(score / 10, 1);
  }

  /**
   * Mock news for fallback
   */
  private getMockNews(): NewsArticle[] {
    return [
      {
        id: 'mock_1',
        title: 'Market Update: Stocks Show Mixed Performance',
        description: 'Major indices display varied movements as investors digest economic data and corporate earnings.',
        url: '#',
        publishedAt: new Date().toISOString(),
        source: 'WeathWise Financial',
        sentiment: 'neutral',
        relevance: 0.8
      },
      {
        id: 'mock_2',
        title: 'Tech Sector Leads Growth in Pre-Market Trading',
        description: 'Technology companies show strong momentum ahead of market open, with AI and cloud computing stocks gaining.',
        url: '#',
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: 'WeathWise Financial',
        sentiment: 'positive',
        relevance: 0.7
      },
      {
        id: 'mock_3',
        title: 'Federal Reserve Policy Decision Expected This Week',
        description: 'Investors await central bank announcement on interest rates and monetary policy direction.',
        url: '#',
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: 'WeathWise Financial',
        sentiment: 'neutral',
        relevance: 0.9
      }
    ];
  }
}
