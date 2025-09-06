import { Router } from 'express';
import { MarketDataService } from '../services/marketDataService';
import { EnhancedNewsService } from '../services/enhancedNewsService';

const router = Router();
const marketService = new MarketDataService();
const newsService = new EnhancedNewsService();

// Get market data for a symbol
router.get('/data/:symbol', async (req, res): Promise<void> => {
  try {
    const { symbol } = req.params;
    const quote = await marketService.getQuote(symbol);
    
    if (!quote) {
      res.status(404).json({ error: 'Symbol not found' });
      return;
    }

    res.json({
      success: true,
      data: quote
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get market data for multiple symbols
router.get('/data', async (req, res): Promise<void> => {
  try {
    const { symbols } = req.query;
    
    if (!symbols || typeof symbols !== 'string') {
      res.status(400).json({ error: 'Symbols parameter is required' });
      return;
    }

    const symbolArray = symbols.split(',').map(s => s.trim());
    const quotes = await marketService.getQuotes(symbolArray);
    
    res.json({
      success: true,
      data: quotes
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search for symbols
router.get('/search', async (req, res): Promise<void> => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query) {
      res.status(400).json({ error: 'Query parameter is required' });
      return;
    }

    const results = await marketService.searchSymbols(query as string, Number(limit));
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get historical data
router.get('/historical/:symbol', async (req, res): Promise<void> => {
  try {
    const { symbol } = req.params;
    const { period = '1mo' } = req.query;
    
    const historical = await marketService.getHistoricalData(symbol, period as string);
    
    res.json({
      success: true,
      data: historical
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get market summary (major indices)
router.get('/summary', async (_req, res): Promise<void> => {
  try {
    const summary = await marketService.getMarketSummary();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get market news
router.get('/news', async (req, res): Promise<void> => {
  try {
    const { query, symbols, limit = 20 } = req.query;
    
    // Use symbols if provided, otherwise use query
    const searchQuery = symbols ? (symbols as string) : (query as string);
    
    // Set caching headers for polling optimization
    const lastModified = new Date().toUTCString();
    res.set({
      'Last-Modified': lastModified,
      'Cache-Control': 'public, max-age=600', // 10 minutes cache for news
      'ETag': `"news-${searchQuery || 'general'}-${Date.now()}"`
    });

    // Check if client has current version (news changes slowly)
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince) {
      const clientDate = new Date(ifModifiedSince);
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      
      // If data is less than 10 minutes old, return 304
      if (clientDate.getTime() > tenMinutesAgo) {
        res.status(304).end();
        return;
      }
    }
    
    const result = await newsService.getNews(
      searchQuery, 
      Number(limit)
    );
    
    res.json({
      success: true,
      data: {
        articles: result.articles,
        source: result.source,
        rateLimitInfo: {
          provider: result.rateLimitInfo.name,
          remaining: result.rateLimitInfo.rateLimitRemaining,
          isAvailable: result.rateLimitInfo.isAvailable
        },
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get news for specific symbol
router.get('/news/:symbol', async (req, res): Promise<void> => {
  try {
    const { symbol } = req.params;
    const { limit = 10 } = req.query;

    // Set caching headers for polling optimization
    const lastModified = new Date().toUTCString();
    res.set({
      'Last-Modified': lastModified,
      'Cache-Control': 'public, max-age=600', // 10 minutes cache for news
      'ETag': `"news-${symbol}-${Date.now()}"`
    });

    // Check if client has current version
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince) {
      const clientDate = new Date(ifModifiedSince);
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      
      if (clientDate.getTime() > tenMinutesAgo) {
        res.status(304).end();
        return;
      }
    }
    
    const result = await newsService.getNews(`${symbol}`, Number(limit));
    
    res.json({
      success: true,
      data: {
        articles: result.articles,
        source: result.source,
        symbol: symbol,
        rateLimitInfo: {
          provider: result.rateLimitInfo.name,
          remaining: result.rateLimitInfo.rateLimitRemaining,
          isAvailable: result.rateLimitInfo.isAvailable
        },
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get news provider status
router.get('/news/status/providers', async (req, res): Promise<void> => {
  try {
    const status = newsService.getProviderStatus();
    
    res.json({
      success: true,
      data: {
        providers: status,
        summary: {
          totalProviders: Object.keys(status).length,
          availableProviders: Object.values(status).filter(p => p.isAvailable).length,
          providersWithKeys: Object.values(status).filter(p => p.hasApiKey).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

