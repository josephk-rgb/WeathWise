import { Router } from 'express';
import { MarketDataService } from '../services/marketDataService';

const router = Router();
const marketService = new MarketDataService();

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
    const { query, limit = 20 } = req.query;
    
    const news = await marketService.getMarketNews(
      query as string, 
      Number(limit)
    );
    
    res.json({
      success: true,
      data: news
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
    
    const news = await marketService.getSymbolNews(symbol, Number(limit));
    
    res.json({
      success: true,
      data: news
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

