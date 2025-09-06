import { Router } from 'express';
import { MarketDataService } from '../services/marketDataService';
import { EnhancedNewsService } from '../services/enhancedNewsService';
import { MarketAnalyticsService } from '../services/marketAnalyticsService';

const router = Router();
const marketService = new MarketDataService();
const newsService = new EnhancedNewsService();
const analyticsService = new MarketAnalyticsService();

// Test route for Yahoo Finance - no auth required
router.get('/yahoo-finance/:symbol', async (req, res): Promise<void> => {
  try {
    const { symbol } = req.params;
    const quote = await marketService.getQuote(symbol);
    
    if (!quote) {
      res.status(404).json({ 
        success: false,
        error: 'Symbol not found',
        symbol: symbol 
      });
      return;
    }

    res.json({
      success: true,
      data: quote,
      source: 'Yahoo Finance (yahoo-finance2)',
      timestamp: new Date().toISOString(),
      testMode: true
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Yahoo Finance API error',
      details: error.message,
      symbol: req.params.symbol
    });
  }
});

// Test route for multiple symbols
router.get('/yahoo-finance-batch', async (req, res): Promise<void> => {
  try {
    const { symbols } = req.query;
    
    if (!symbols || typeof symbols !== 'string') {
      res.status(400).json({ error: 'Symbols parameter required (comma-separated)' });
      return;
    }

    const symbolArray = symbols.split(',').map(s => s.trim());
    const quotes = await marketService.getQuotes(symbolArray);
    
    res.json({
      success: true,
      data: quotes,
      source: 'Yahoo Finance (yahoo-finance2)',
      timestamp: new Date().toISOString(),
      symbolCount: symbolArray.length,
      testMode: true
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Yahoo Finance batch API error',
      details: error.message 
    });
  }
});

// Test route for news APIs
router.get('/news-test', async (req, res): Promise<void> => {
  try {
    const { query, limit = 5 } = req.query;
    
    const result = await newsService.getNews(
      query as string || 'financial markets', 
      Number(limit)
    );
    
    res.json({
      success: true,
      data: {
        articles: result.articles,
        source: result.source,
        articleCount: result.articles.length,
        rateLimitInfo: {
          provider: result.rateLimitInfo.name,
          remaining: result.rateLimitInfo.rateLimitRemaining,
          isAvailable: result.rateLimitInfo.isAvailable
        }
      },
      timestamp: new Date().toISOString(),
      testMode: true
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'News API error',
      details: error.message 
    });
  }
});

// Test route for news provider status
router.get('/news-providers', async (req, res): Promise<void> => {
  try {
    const status = newsService.getProviderStatus();
    
    res.json({
      success: true,
      data: {
        providers: status,
        summary: {
          totalProviders: Object.keys(status).length,
          availableProviders: Object.values(status).filter(p => p.isAvailable).length,
          providersWithKeys: Object.values(status).filter(p => p.hasApiKey).length,
          configuredKeys: {
            newsapi: !!process.env['NEWS_API_KEY'],
            alphavantage: !!process.env['ALPHA_VANTAGE_API_KEY'],
            polygon: !!process.env['POLYGON_API_KEY'],
            fmp: !!process.env['FINANCIAL_MODELING_PREP_API_KEY']
          }
        }
      },
      timestamp: new Date().toISOString(),
      testMode: true
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Provider status error',
      details: error.message 
    });
  }
});

// Test route for portfolio analytics calculation
router.get('/analytics-test', async (req, res): Promise<void> => {
  try {
    // Create mock investment data for testing
    const mockInvestments = [
      {
        symbol: 'AAPL',
        quantity: 10,
        purchasePrice: 150,
        currentPrice: 0, // Will be fetched
        purchaseDate: new Date('2024-01-01')
      },
      {
        symbol: 'GOOGL',
        quantity: 5,
        purchasePrice: 2800,
        currentPrice: 0, // Will be fetched
        purchaseDate: new Date('2024-02-01')
      },
      {
        symbol: 'MSFT',
        quantity: 15,
        purchasePrice: 400,
        currentPrice: 0, // Will be fetched
        purchaseDate: new Date('2024-03-01')
      }
    ];

    // Fetch current prices
    const symbols = mockInvestments.map(inv => inv.symbol);
    const quotes = await marketService.getQuotes(symbols);

    // Update current prices
    mockInvestments.forEach(investment => {
      const quote = quotes[investment.symbol];
      if (quote) {
        investment.currentPrice = quote.currentPrice;
      }
    });

    // Calculate analytics using available methods
    const portfolioHoldings = mockInvestments.map(inv => ({
      symbol: inv.symbol,
      weight: (inv.currentPrice * inv.quantity) / mockInvestments.reduce((sum, i) => sum + (i.currentPrice * i.quantity), 0)
    }));

    const analytics = await analyticsService.calculatePortfolioMetrics(portfolioHoldings);

    res.json({
      success: true,
      data: {
        mockInvestments,
        analytics,
        portfolioValue: mockInvestments.reduce((sum, inv) => sum + (inv.currentPrice * inv.quantity), 0),
        totalGainLoss: mockInvestments.reduce((sum, inv) => sum + ((inv.currentPrice - inv.purchasePrice) * inv.quantity), 0)
      },
      source: 'Yahoo Finance + WeathWise Analytics',
      timestamp: new Date().toISOString(),
      testMode: true
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Analytics test error',
      details: error.message 
    });
  }
});

// Test route for individual symbol analytics
router.get('/symbol-analytics/:symbol', async (req, res): Promise<void> => {
  try {
    const { symbol } = req.params;
    
    // Get basic quote
    const quote = await marketService.getQuote(symbol);
    if (!quote) {
      res.status(404).json({ 
        success: false,
        error: 'Symbol not found',
        symbol: symbol 
      });
      return;
    }

    // Calculate individual analytics
    const mockInvestment = {
      symbol: symbol,
      quantity: 100,
      purchasePrice: quote.currentPrice * 0.9, // Simulate 10% gain
      currentPrice: quote.currentPrice,
      purchaseDate: new Date('2024-01-01')
    };

    const analytics = await analyticsService.calculateRiskMetrics(symbol);

    res.json({
      success: true,
      data: {
        quote,
        analytics,
        mockInvestment
      },
      source: 'Yahoo Finance + WeathWise Analytics',
      timestamp: new Date().toISOString(),
      testMode: true
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Symbol analytics error',
      details: error.message,
      symbol: req.params.symbol
    });
  }
});

export default router;
