# Part 8: Financial Data Integration

## 8.1 Market Data APIs Integration

### Data Provider Configuration

```typescript
// src/services/dataProviders/types.ts
export interface MarketDataProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requests: number;
    window: number; // in milliseconds
  };
  supports: {
    realTime: boolean;
    historical: boolean;
    fundamentals: boolean;
    news: boolean;
    forex: boolean;
    crypto: boolean;
  };
}

export interface PriceData {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  timestamp: Date;
  source: string;
}

export interface HistoricalData {
  symbol: string;
  data: Array<{
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjustedClose?: number;
  }>;
  interval: '1m' | '5m' | '15m' | '1h' | '1d' | '1w' | '1M';
  source: string;
}

export interface FundamentalData {
  symbol: string;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  eps: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  avgVolume: number;
  sharesOutstanding: number;
  revenue: number;
  netIncome: number;
  lastUpdated: Date;
  source: string;
}
```

### Alpha Vantage Integration

```typescript
// src/services/dataProviders/alphaVantageProvider.ts
import axios, { AxiosInstance } from 'axios';
import { RateLimiter } from 'limiter';
import { MarketDataProvider, PriceData, HistoricalData, FundamentalData } from './types';

export class AlphaVantageProvider implements MarketDataProvider {
  name = 'Alpha Vantage';
  baseUrl = 'https://www.alphavantage.co/query';
  apiKey: string;
  rateLimit = { requests: 5, window: 60000 }; // 5 requests per minute
  supports = {
    realTime: true,
    historical: true,
    fundamentals: true,
    news: true,
    forex: true,
    crypto: true,
  };

  private client: AxiosInstance;
  private limiter: RateLimiter;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
    
    this.limiter = new RateLimiter({
      tokensPerInterval: this.rateLimit.requests,
      interval: this.rateLimit.window,
    });
  }

  async getCurrentPrice(symbol: string): Promise<PriceData> {
    await this.limiter.removeTokens(1);

    try {
      const response = await this.client.get('', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol,
          apikey: this.apiKey,
        },
      });

      const quote = response.data['Global Quote'];
      if (!quote) {
        throw new Error(`No data found for symbol: ${symbol}`);
      }

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        previousClose: parseFloat(quote['08. previous close']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        open: parseFloat(quote['02. open']),
        timestamp: new Date(quote['07. latest trading day']),
        source: this.name,
      };
    } catch (error) {
      console.error(`Alpha Vantage API error for ${symbol}:`, error);
      throw new Error(`Failed to fetch price data for ${symbol}`);
    }
  }

  async getHistoricalData(
    symbol: string,
    interval: '1d' | '1w' | '1M' = '1d',
    outputSize: 'compact' | 'full' = 'compact'
  ): Promise<HistoricalData> {
    await this.limiter.removeTokens(1);

    const functionMap = {
      '1d': 'TIME_SERIES_DAILY_ADJUSTED',
      '1w': 'TIME_SERIES_WEEKLY_ADJUSTED',
      '1M': 'TIME_SERIES_MONTHLY_ADJUSTED',
    };

    try {
      const response = await this.client.get('', {
        params: {
          function: functionMap[interval],
          symbol,
          outputsize: outputSize,
          apikey: this.apiKey,
        },
      });

      const timeSeriesKey = Object.keys(response.data).find(key =>
        key.includes('Time Series')
      );

      if (!timeSeriesKey || !response.data[timeSeriesKey]) {
        throw new Error(`No historical data found for symbol: ${symbol}`);
      }

      const timeSeries = response.data[timeSeriesKey];
      const data = Object.entries(timeSeries)
        .map(([date, values]: [string, any]) => ({
          date: new Date(date),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          adjustedClose: parseFloat(values['5. adjusted close']),
          volume: parseInt(values['6. volume']),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      return {
        symbol,
        data,
        interval,
        source: this.name,
      };
    } catch (error) {
      console.error(`Alpha Vantage historical data error for ${symbol}:`, error);
      throw new Error(`Failed to fetch historical data for ${symbol}`);
    }
  }

  async getFundamentals(symbol: string): Promise<FundamentalData> {
    await this.limiter.removeTokens(1);

    try {
      const response = await this.client.get('', {
        params: {
          function: 'OVERVIEW',
          symbol,
          apikey: this.apiKey,
        },
      });

      const overview = response.data;
      if (!overview.Symbol) {
        throw new Error(`No fundamental data found for symbol: ${symbol}`);
      }

      return {
        symbol: overview.Symbol,
        marketCap: parseInt(overview.MarketCapitalization) || 0,
        peRatio: parseFloat(overview.PERatio) || 0,
        pbRatio: parseFloat(overview.PriceToBookRatio) || 0,
        dividendYield: parseFloat(overview.DividendYield) || 0,
        eps: parseFloat(overview.EPS) || 0,
        beta: parseFloat(overview.Beta) || 0,
        fiftyTwoWeekHigh: parseFloat(overview['52WeekHigh']) || 0,
        fiftyTwoWeekLow: parseFloat(overview['52WeekLow']) || 0,
        avgVolume: parseInt(overview.Volume) || 0,
        sharesOutstanding: parseInt(overview.SharesOutstanding) || 0,
        revenue: parseInt(overview.RevenueTTM) || 0,
        netIncome: parseInt(overview.GrossProfitTTM) || 0,
        lastUpdated: new Date(),
        source: this.name,
      };
    } catch (error) {
      console.error(`Alpha Vantage fundamentals error for ${symbol}:`, error);
      throw new Error(`Failed to fetch fundamental data for ${symbol}`);
    }
  }

  async getForexRate(fromCurrency: string, toCurrency: string): Promise<number> {
    await this.limiter.removeTokens(1);

    try {
      const response = await this.client.get('', {
        params: {
          function: 'CURRENCY_EXCHANGE_RATE',
          from_currency: fromCurrency,
          to_currency: toCurrency,
          apikey: this.apiKey,
        },
      });

      const exchangeRate = response.data['Realtime Currency Exchange Rate'];
      if (!exchangeRate) {
        throw new Error(`No exchange rate found for ${fromCurrency}/${toCurrency}`);
      }

      return parseFloat(exchangeRate['5. Exchange Rate']);
    } catch (error) {
      console.error(`Alpha Vantage forex error:`, error);
      throw new Error(`Failed to fetch exchange rate for ${fromCurrency}/${toCurrency}`);
    }
  }
}
```

### Yahoo Finance Integration (Unofficial API)

```typescript
// src/services/dataProviders/yahooFinanceProvider.ts
import axios, { AxiosInstance } from 'axios';
import { RateLimiter } from 'limiter';
import { MarketDataProvider, PriceData, HistoricalData } from './types';

export class YahooFinanceProvider implements MarketDataProvider {
  name = 'Yahoo Finance';
  baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
  rateLimit = { requests: 100, window: 60000 }; // 100 requests per minute
  supports = {
    realTime: true,
    historical: true,
    fundamentals: false,
    news: false,
    forex: true,
    crypto: true,
  };

  private client: AxiosInstance;
  private limiter: RateLimiter;

  constructor() {
    this.client = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    this.limiter = new RateLimiter({
      tokensPerInterval: this.rateLimit.requests,
      interval: this.rateLimit.window,
    });
  }

  async getCurrentPrice(symbol: string): Promise<PriceData> {
    await this.limiter.removeTokens(1);

    try {
      const response = await this.client.get(`${this.baseUrl}/${symbol}`, {
        params: {
          interval: '1d',
          range: '1d',
          includePrePost: true,
        },
      });

      const result = response.data.chart.result[0];
      if (!result) {
        throw new Error(`No data found for symbol: ${symbol}`);
      }

      const meta = result.meta;
      const quote = result.indicators.quote[0];
      const timestamp = result.timestamp[result.timestamp.length - 1];

      return {
        symbol: meta.symbol,
        price: meta.regularMarketPrice,
        previousClose: meta.previousClose,
        change: meta.regularMarketPrice - meta.previousClose,
        changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        volume: meta.regularMarketVolume,
        high: meta.regularMarketDayHigh,
        low: meta.regularMarketDayLow,
        open: quote.open[quote.open.length - 1],
        timestamp: new Date(timestamp * 1000),
        source: this.name,
      };
    } catch (error) {
      console.error(`Yahoo Finance API error for ${symbol}:`, error);
      throw new Error(`Failed to fetch price data for ${symbol}`);
    }
  }

  async getHistoricalData(
    symbol: string,
    period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max' = '1y',
    interval: '1m' | '5m' | '15m' | '1h' | '1d' | '1w' | '1M' = '1d'
  ): Promise<HistoricalData> {
    await this.limiter.removeTokens(1);

    try {
      const response = await this.client.get(`${this.baseUrl}/${symbol}`, {
        params: {
          period1: this.getPeriodTimestamp(period),
          period2: Math.floor(Date.now() / 1000),
          interval,
        },
      });

      const result = response.data.chart.result[0];
      if (!result) {
        throw new Error(`No historical data found for symbol: ${symbol}`);
      }

      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      const adjClose = result.indicators.adjclose?.[0]?.adjclose;

      const data = timestamps.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000),
        open: quote.open[index],
        high: quote.high[index],
        low: quote.low[index],
        close: quote.close[index],
        volume: quote.volume[index],
        adjustedClose: adjClose?.[index],
      })).filter(item => item.close !== null);

      return {
        symbol,
        data,
        interval,
        source: this.name,
      };
    } catch (error) {
      console.error(`Yahoo Finance historical data error for ${symbol}:`, error);
      throw new Error(`Failed to fetch historical data for ${symbol}`);
    }
  }

  private getPeriodTimestamp(period: string): number {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    switch (period) {
      case '1d': return Math.floor((now - day) / 1000);
      case '5d': return Math.floor((now - 5 * day) / 1000);
      case '1mo': return Math.floor((now - 30 * day) / 1000);
      case '3mo': return Math.floor((now - 90 * day) / 1000);
      case '6mo': return Math.floor((now - 180 * day) / 1000);
      case '1y': return Math.floor((now - 365 * day) / 1000);
      case '2y': return Math.floor((now - 2 * 365 * day) / 1000);
      case '5y': return Math.floor((now - 5 * 365 * day) / 1000);
      case '10y': return Math.floor((now - 10 * 365 * day) / 1000);
      case 'ytd': {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        return Math.floor(startOfYear.getTime() / 1000);
      }
      default: return Math.floor((now - 365 * day) / 1000);
    }
  }
}
```

## 8.2 Data Aggregation Service

### Multi-Provider Data Manager

```typescript
// src/services/marketDataService.ts
import { AlphaVantageProvider } from './dataProviders/alphaVantageProvider';
import { YahooFinanceProvider } from './dataProviders/yahooFinanceProvider';
import { PriceData, HistoricalData, FundamentalData, MarketDataProvider } from './dataProviders/types';
import { CacheService } from './cacheService';
import { DatabaseService } from './databaseService';

export class MarketDataService {
  private providers: Map<string, MarketDataProvider> = new Map();
  private cache: CacheService;
  private db: DatabaseService;
  private primaryProvider: string = 'yahoo';
  private fallbackProvider: string = 'alphavantage';

  constructor() {
    this.cache = new CacheService();
    this.db = new DatabaseService();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Yahoo Finance (free, high rate limit)
    const yahooProvider = new YahooFinanceProvider();
    this.providers.set('yahoo', yahooProvider);

    // Initialize Alpha Vantage (requires API key, lower rate limit but more reliable)
    if (process.env.VITE_ALPHA_VANTAGE_API_KEY) {
      const alphaVantageProvider = new AlphaVantageProvider(
        process.env.VITE_ALPHA_VANTAGE_API_KEY
      );
      this.providers.set('alphavantage', alphaVantageProvider);
    }
  }

  async getCurrentPrice(symbol: string, useCache: boolean = true): Promise<PriceData> {
    const cacheKey = `price:${symbol}`;
    
    // Check cache first
    if (useCache) {
      const cachedData = await this.cache.get<PriceData>(cacheKey);
      if (cachedData && this.isCacheValid(cachedData.timestamp, 60000)) { // 1 minute cache
        return cachedData;
      }
    }

    // Try primary provider
    try {
      const primaryProvider = this.providers.get(this.primaryProvider);
      if (primaryProvider) {
        const data = await primaryProvider.getCurrentPrice(symbol);
        await this.cache.set(cacheKey, data, 60000); // Cache for 1 minute
        await this.savePriceToDatabase(data);
        return data;
      }
    } catch (error) {
      console.warn(`Primary provider (${this.primaryProvider}) failed for ${symbol}:`, error);
    }

    // Try fallback provider
    try {
      const fallbackProvider = this.providers.get(this.fallbackProvider);
      if (fallbackProvider) {
        const data = await fallbackProvider.getCurrentPrice(symbol);
        await this.cache.set(cacheKey, data, 60000);
        await this.savePriceToDatabase(data);
        return data;
      }
    } catch (error) {
      console.error(`Fallback provider (${this.fallbackProvider}) failed for ${symbol}:`, error);
    }

    // Try to get last known price from database
    const lastKnownPrice = await this.getLastKnownPrice(symbol);
    if (lastKnownPrice) {
      console.warn(`Using last known price for ${symbol}`);
      return lastKnownPrice;
    }

    throw new Error(`Failed to fetch current price for ${symbol} from all providers`);
  }

  async getBatchPrices(symbols: string[], useCache: boolean = true): Promise<Record<string, PriceData>> {
    const results: Record<string, PriceData> = {};
    const failedSymbols: string[] = [];

    // Process symbols in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(async (symbol) => {
        try {
          const data = await this.getCurrentPrice(symbol, useCache);
          results[symbol] = data;
        } catch (error) {
          console.error(`Failed to fetch price for ${symbol}:`, error);
          failedSymbols.push(symbol);
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (failedSymbols.length > 0) {
      console.warn(`Failed to fetch prices for symbols: ${failedSymbols.join(', ')}`);
    }

    return results;
  }

  async getHistoricalData(
    symbol: string,
    period: string = '1y',
    interval: string = '1d',
    useCache: boolean = true
  ): Promise<HistoricalData> {
    const cacheKey = `historical:${symbol}:${period}:${interval}`;
    
    // Check cache first (longer cache time for historical data)
    if (useCache) {
      const cachedData = await this.cache.get<HistoricalData>(cacheKey);
      if (cachedData && this.isCacheValid(cachedData.data[cachedData.data.length - 1]?.date, 3600000)) { // 1 hour cache
        return cachedData;
      }
    }

    // Try primary provider
    try {
      const primaryProvider = this.providers.get(this.primaryProvider);
      if (primaryProvider?.supports.historical) {
        const data = await (primaryProvider as any).getHistoricalData(symbol, period, interval);
        await this.cache.set(cacheKey, data, 3600000); // Cache for 1 hour
        await this.saveHistoricalDataToDatabase(data);
        return data;
      }
    } catch (error) {
      console.warn(`Primary provider (${this.primaryProvider}) failed for historical data of ${symbol}:`, error);
    }

    // Try fallback provider
    try {
      const fallbackProvider = this.providers.get(this.fallbackProvider);
      if (fallbackProvider?.supports.historical) {
        const data = await (fallbackProvider as any).getHistoricalData(symbol, interval);
        await this.cache.set(cacheKey, data, 3600000);
        await this.saveHistoricalDataToDatabase(data);
        return data;
      }
    } catch (error) {
      console.error(`Fallback provider (${this.fallbackProvider}) failed for historical data of ${symbol}:`, error);
    }

    throw new Error(`Failed to fetch historical data for ${symbol} from all providers`);
  }

  async getFundamentals(symbol: string, useCache: boolean = true): Promise<FundamentalData> {
    const cacheKey = `fundamentals:${symbol}`;
    
    // Check cache first (longer cache time for fundamental data)
    if (useCache) {
      const cachedData = await this.cache.get<FundamentalData>(cacheKey);
      if (cachedData && this.isCacheValid(cachedData.lastUpdated, 86400000)) { // 24 hour cache
        return cachedData;
      }
    }

    // Try providers that support fundamentals
    for (const [name, provider] of this.providers) {
      if (provider.supports.fundamentals) {
        try {
          const data = await (provider as any).getFundamentals(symbol);
          await this.cache.set(cacheKey, data, 86400000); // Cache for 24 hours
          await this.saveFundamentalsToDatabase(data);
          return data;
        } catch (error) {
          console.warn(`Provider ${name} failed for fundamentals of ${symbol}:`, error);
        }
      }
    }

    throw new Error(`Failed to fetch fundamental data for ${symbol} from all providers`);
  }

  private isCacheValid(timestamp: Date, maxAge: number): boolean {
    return Date.now() - timestamp.getTime() < maxAge;
  }

  private async savePriceToDatabase(data: PriceData): Promise<void> {
    try {
      await this.db.collection('market_prices').insertOne({
        ...data,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to save price data to database:', error);
    }
  }

  private async saveHistoricalDataToDatabase(data: HistoricalData): Promise<void> {
    try {
      const documents = data.data.map(point => ({
        symbol: data.symbol,
        ...point,
        interval: data.interval,
        source: data.source,
        createdAt: new Date(),
      }));

      await this.db.collection('historical_prices').insertMany(documents);
    } catch (error) {
      console.error('Failed to save historical data to database:', error);
    }
  }

  private async saveFundamentalsToDatabase(data: FundamentalData): Promise<void> {
    try {
      await this.db.collection('fundamentals').replaceOne(
        { symbol: data.symbol },
        { ...data, createdAt: new Date() },
        { upsert: true }
      );
    } catch (error) {
      console.error('Failed to save fundamental data to database:', error);
    }
  }

  private async getLastKnownPrice(symbol: string): Promise<PriceData | null> {
    try {
      const lastPrice = await this.db.collection('market_prices')
        .findOne(
          { symbol },
          { sort: { timestamp: -1 } }
        );

      return lastPrice || null;
    } catch (error) {
      console.error('Failed to get last known price from database:', error);
      return null;
    }
  }

  // Method to get market status
  async getMarketStatus(): Promise<{
    isOpen: boolean;
    nextOpen: Date | null;
    nextClose: Date | null;
    timezone: string;
  }> {
    const now = new Date();
    const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const day = nyTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = nyTime.getHours();
    const minute = nyTime.getMinutes();
    const currentTime = hour * 60 + minute;

    // Market hours: 9:30 AM - 4:00 PM ET, Monday-Friday
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM

    const isWeekday = day >= 1 && day <= 5;
    const isDuringMarketHours = currentTime >= marketOpen && currentTime < marketClose;
    const isOpen = isWeekday && isDuringMarketHours;

    // Calculate next open/close times
    let nextOpen: Date | null = null;
    let nextClose: Date | null = null;

    if (isOpen) {
      // Market is open, calculate next close (today at 4 PM)
      nextClose = new Date(nyTime);
      nextClose.setHours(16, 0, 0, 0);
    } else {
      // Market is closed, calculate next open
      nextOpen = new Date(nyTime);
      
      if (isWeekday && currentTime < marketOpen) {
        // Same day, before market open
        nextOpen.setHours(9, 30, 0, 0);
      } else if (day === 5) {
        // Friday after close, next open is Monday
        nextOpen.setDate(nyTime.getDate() + 3);
        nextOpen.setHours(9, 30, 0, 0);
      } else if (day === 6) {
        // Saturday, next open is Monday
        nextOpen.setDate(nyTime.getDate() + 2);
        nextOpen.setHours(9, 30, 0, 0);
      } else if (day === 0) {
        // Sunday, next open is Monday
        nextOpen.setDate(nyTime.getDate() + 1);
        nextOpen.setHours(9, 30, 0, 0);
      } else {
        // Weekday after close, next open is tomorrow
        nextOpen.setDate(nyTime.getDate() + 1);
        nextOpen.setHours(9, 30, 0, 0);
      }
    }

    return {
      isOpen,
      nextOpen,
      nextClose,
      timezone: 'America/New_York',
    };
  }
}
```

## 8.3 Real-time Price Feeds

### WebSocket Price Feed Integration

```typescript
// src/services/realTimePriceService.ts
import { WebSocketService } from './websocketService';
import { MarketDataService } from './marketDataService';
import { useStore } from '../store/useStore';

export class RealTimePriceService {
  private wsService: WebSocketService | null = null;
  private marketDataService: MarketDataService;
  private subscribedSymbols = new Set<string>();
  private priceUpdateCallbacks = new Map<string, ((price: PriceData) => void)[]>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.marketDataService = new MarketDataService();
    this.initializeWebSocket();
  }

  private initializeWebSocket(): void {
    const wsUrl = process.env.VITE_PRICE_FEED_WS_URL;
    if (!wsUrl) {
      console.warn('WebSocket URL not configured, falling back to polling');
      this.startPolling();
      return;
    }

    this.wsService = new WebSocketService(wsUrl);
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    if (!this.wsService) return;

    this.wsService.onMessage((data) => {
      if (data.type === 'price_update') {
        this.handlePriceUpdate(data.payload);
      }
    });

    this.wsService.onConnect(() => {
      console.log('Real-time price feed connected');
      this.reconnectAttempts = 0;
      this.resubscribeToSymbols();
    });

    this.wsService.onDisconnect(() => {
      console.log('Real-time price feed disconnected');
      this.handleReconnection();
    });

    this.wsService.onError((error) => {
      console.error('Real-time price feed error:', error);
    });
  }

  private handlePriceUpdate(payload: any): void {
    const priceData: PriceData = {
      symbol: payload.symbol,
      price: payload.price,
      previousClose: payload.previousClose,
      change: payload.change,
      changePercent: payload.changePercent,
      volume: payload.volume,
      high: payload.high,
      low: payload.low,
      open: payload.open,
      timestamp: new Date(payload.timestamp),
      source: 'websocket',
    };

    // Update global store
    const { updateInvestmentPrices, setMarketData } = useStore.getState();
    setMarketData(payload.symbol, priceData);
    updateInvestmentPrices({ [payload.symbol]: payload.price });

    // Trigger callbacks
    const callbacks = this.priceUpdateCallbacks.get(payload.symbol) || [];
    callbacks.forEach(callback => callback(priceData));
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.initializeWebSocket();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached, falling back to polling');
      this.startPolling();
    }
  }

  private resubscribeToSymbols(): void {
    this.subscribedSymbols.forEach(symbol => {
      this.subscribeToSymbol(symbol);
    });
  }

  public subscribeToSymbol(symbol: string): void {
    this.subscribedSymbols.add(symbol);
    
    if (this.wsService?.isConnected()) {
      this.wsService.send({
        type: 'subscribe',
        payload: { symbol }
      });
    }
  }

  public unsubscribeFromSymbol(symbol: string): void {
    this.subscribedSymbols.delete(symbol);
    
    if (this.wsService?.isConnected()) {
      this.wsService.send({
        type: 'unsubscribe',
        payload: { symbol }
      });
    }
  }

  public onPriceUpdate(symbol: string, callback: (price: PriceData) => void): () => void {
    const callbacks = this.priceUpdateCallbacks.get(symbol) || [];
    callbacks.push(callback);
    this.priceUpdateCallbacks.set(symbol, callbacks);

    // Return unsubscribe function
    return () => {
      const currentCallbacks = this.priceUpdateCallbacks.get(symbol) || [];
      const index = currentCallbacks.indexOf(callback);
      if (index > -1) {
        currentCallbacks.splice(index, 1);
        this.priceUpdateCallbacks.set(symbol, currentCallbacks);
      }
    };
  }

  // Fallback polling method when WebSocket is not available
  private pollingInterval: NodeJS.Timeout | null = null;

  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      if (this.subscribedSymbols.size === 0) return;

      try {
        const symbols = Array.from(this.subscribedSymbols);
        const priceData = await this.marketDataService.getBatchPrices(symbols, false);
        
        Object.values(priceData).forEach(price => {
          this.handlePriceUpdate(price);
        });
      } catch (error) {
        console.error('Polling price update failed:', error);
      }
    }, 30000); // Poll every 30 seconds
  }

  public destroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    if (this.wsService) {
      this.wsService.disconnect();
    }
    
    this.subscribedSymbols.clear();
    this.priceUpdateCallbacks.clear();
  }
}

// React hook for real-time prices
export const useRealTimePrice = (symbol: string) => {
  const [price, setPrice] = React.useState<PriceData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const priceService = React.useRef<RealTimePriceService | null>(null);

  React.useEffect(() => {
    if (!priceService.current) {
      priceService.current = new RealTimePriceService();
    }

    const service = priceService.current;
    service.subscribeToSymbol(symbol);

    const unsubscribe = service.onPriceUpdate(symbol, (priceData) => {
      setPrice(priceData);
      setError(null);
    });

    // Get initial price
    const marketDataService = new MarketDataService();
    marketDataService.getCurrentPrice(symbol)
      .then(setPrice)
      .catch(err => setError(err.message));

    return () => {
      unsubscribe();
      service.unsubscribeFromSymbol(symbol);
    };
  }, [symbol]);

  React.useEffect(() => {
    return () => {
      if (priceService.current) {
        priceService.current.destroy();
      }
    };
  }, []);

  return { price, error };
};
```

## 8.4 Economic Indicators & News Integration

### Economic Data Service

```typescript
// src/services/economicDataService.ts
import axios from 'axios';
import { CacheService } from './cacheService';

export interface EconomicIndicator {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  releaseDate: Date;
  nextReleaseDate: Date;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  importance: 'low' | 'medium' | 'high';
  unit: string;
  source: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  publishedAt: Date;
  source: string;
  symbols: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  category: 'earnings' | 'markets' | 'economy' | 'politics' | 'corporate' | 'crypto';
  importance: 'low' | 'medium' | 'high';
}

export class EconomicDataService {
  private cache: CacheService;
  private fredApiKey: string;
  private newsApiKey: string;

  constructor() {
    this.cache = new CacheService();
    this.fredApiKey = process.env.VITE_FRED_API_KEY || '';
    this.newsApiKey = process.env.VITE_NEWS_API_KEY || '';
  }

  async getEconomicIndicators(): Promise<EconomicIndicator[]> {
    const cacheKey = 'economic_indicators';
    const cachedData = await this.cache.get<EconomicIndicator[]>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    const indicators: EconomicIndicator[] = [];

    // Key economic indicators to track
    const indicatorConfigs = [
      { id: 'GDP', seriesId: 'GDP', name: 'Gross Domestic Product', importance: 'high' as const },
      { id: 'UNEMPLOYMENT', seriesId: 'UNRATE', name: 'Unemployment Rate', importance: 'high' as const },
      { id: 'INFLATION', seriesId: 'CPIAUCSL', name: 'Consumer Price Index', importance: 'high' as const },
      { id: 'FED_RATE', seriesId: 'FEDFUNDS', name: 'Federal Funds Rate', importance: 'high' as const },
      { id: 'RETAIL_SALES', seriesId: 'RSAFS', name: 'Retail Sales', importance: 'medium' as const },
      { id: 'INDUSTRIAL_PRODUCTION', seriesId: 'INDPRO', name: 'Industrial Production', importance: 'medium' as const },
    ];

    for (const config of indicatorConfigs) {
      try {
        const data = await this.fetchFredData(config.seriesId);
        if (data.length >= 2) {
          const current = data[data.length - 1];
          const previous = data[data.length - 2];
          
          indicators.push({
            id: config.id,
            name: config.name,
            value: current.value,
            previousValue: previous.value,
            change: current.value - previous.value,
            changePercent: ((current.value - previous.value) / previous.value) * 100,
            releaseDate: new Date(current.date),
            nextReleaseDate: this.calculateNextReleaseDate(config.id),
            frequency: this.getIndicatorFrequency(config.id),
            importance: config.importance,
            unit: this.getIndicatorUnit(config.id),
            source: 'FRED',
          });
        }
      } catch (error) {
        console.error(`Failed to fetch ${config.name}:`, error);
      }
    }

    await this.cache.set(cacheKey, indicators, 3600000); // Cache for 1 hour
    return indicators;
  }

  private async fetchFredData(seriesId: string): Promise<Array<{ date: string; value: number }>> {
    if (!this.fredApiKey) {
      throw new Error('FRED API key not configured');
    }

    const response = await axios.get('https://api.stlouisfed.org/fred/series/observations', {
      params: {
        series_id: seriesId,
        api_key: this.fredApiKey,
        file_type: 'json',
        limit: 10,
        sort_order: 'desc',
      },
    });

    return response.data.observations
      .filter((obs: any) => obs.value !== '.')
      .map((obs: any) => ({
        date: obs.date,
        value: parseFloat(obs.value),
      }))
      .reverse();
  }

  private calculateNextReleaseDate(indicatorId: string): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    switch (indicatorId) {
      case 'GDP':
        // GDP is released quarterly
        const nextQuarter = new Date(now.getFullYear(), Math.ceil((now.getMonth() + 1) / 3) * 3, 1);
        return nextQuarter;
      case 'UNEMPLOYMENT':
        // First Friday of the month
        const firstFriday = new Date(nextMonth);
        firstFriday.setDate(1 + (5 - firstFriday.getDay() + 7) % 7);
        return firstFriday;
      default:
        return nextMonth;
    }
  }

  private getIndicatorFrequency(indicatorId: string): 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' {
    switch (indicatorId) {
      case 'GDP': return 'quarterly';
      case 'FED_RATE': return 'monthly';
      default: return 'monthly';
    }
  }

  private getIndicatorUnit(indicatorId: string): string {
    switch (indicatorId) {
      case 'GDP': return 'Billions of Dollars';
      case 'UNEMPLOYMENT': return 'Percent';
      case 'INFLATION': return 'Index 1982-1984=100';
      case 'FED_RATE': return 'Percent';
      case 'RETAIL_SALES': return 'Millions of Dollars';
      case 'INDUSTRIAL_PRODUCTION': return 'Index 2017=100';
      default: return '';
    }
  }

  async getFinancialNews(limit: number = 20, symbols?: string[]): Promise<NewsItem[]> {
    const cacheKey = `financial_news_${symbols?.join(',') || 'general'}_${limit}`;
    const cachedData = await this.cache.get<NewsItem[]>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      const query = symbols?.length 
        ? symbols.join(' OR ') 
        : 'finance OR stock market OR economy OR investing';

      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          sources: 'financial-post,the-wall-street-journal,bloomberg,reuters,cnbc,marketwatch',
          sortBy: 'publishedAt',
          pageSize: limit,
          apiKey: this.newsApiKey,
        },
      });

      const newsItems: NewsItem[] = await Promise.all(
        response.data.articles.map(async (article: any) => {
          const sentiment = await this.analyzeSentiment(article.title + ' ' + article.description);
          
          return {
            id: this.generateNewsId(article.url),
            title: article.title,
            summary: article.description || '',
            content: article.content || '',
            url: article.url,
            publishedAt: new Date(article.publishedAt),
            source: article.source.name,
            symbols: this.extractSymbols(article.title + ' ' + article.description),
            sentiment: sentiment.label,
            sentimentScore: sentiment.score,
            category: this.categorizeNews(article.title + ' ' + article.description),
            importance: this.calculateNewsImportance(article, sentiment),
          };
        })
      );

      await this.cache.set(cacheKey, newsItems, 900000); // Cache for 15 minutes
      return newsItems;
    } catch (error) {
      console.error('Failed to fetch financial news:', error);
      return [];
    }
  }

  private async analyzeSentiment(text: string): Promise<{ label: 'positive' | 'negative' | 'neutral'; score: number }> {
    // Simple keyword-based sentiment analysis
    // In production, you'd use a proper NLP service like AWS Comprehend or Azure Text Analytics
    
    const positiveWords = ['gain', 'rise', 'up', 'bullish', 'growth', 'profit', 'beat', 'exceed', 'strong', 'boost'];
    const negativeWords = ['loss', 'fall', 'down', 'bearish', 'decline', 'drop', 'miss', 'weak', 'crash', 'plunge'];
    
    const words = text.toLowerCase().split(/\W+/);
    let positiveScore = 0;
    let negativeScore = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    });
    
    const totalScore = positiveScore + negativeScore;
    if (totalScore === 0) {
      return { label: 'neutral', score: 0 };
    }
    
    const score = (positiveScore - negativeScore) / totalScore;
    
    if (score > 0.1) return { label: 'positive', score };
    if (score < -0.1) return { label: 'negative', score };
    return { label: 'neutral', score };
  }

  private extractSymbols(text: string): string[] {
    // Extract stock symbols from text (simple regex for demonstration)
    const symbolRegex = /\b[A-Z]{1,5}\b/g;
    const matches = text.match(symbolRegex) || [];
    
    // Filter common words that aren't symbols
    const commonWords = ['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'NEW', 'NOW', 'GET'];
    return matches.filter(symbol => 
      symbol.length >= 2 && 
      symbol.length <= 5 && 
      !commonWords.includes(symbol)
    );
  }

  private categorizeNews(text: string): NewsItem['category'] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('earnings') || lowerText.includes('quarterly')) return 'earnings';
    if (lowerText.includes('crypto') || lowerText.includes('bitcoin')) return 'crypto';
    if (lowerText.includes('fed') || lowerText.includes('economy')) return 'economy';
    if (lowerText.includes('political') || lowerText.includes('election')) return 'politics';
    if (lowerText.includes('merger') || lowerText.includes('acquisition')) return 'corporate';
    
    return 'markets';
  }

  private calculateNewsImportance(
    article: any, 
    sentiment: { label: string; score: number }
  ): NewsItem['importance'] {
    let score = 0;
    
    // Source importance
    const highImportanceSources = ['reuters', 'bloomberg', 'wall street journal'];
    if (highImportanceSources.some(source => article.source.name.toLowerCase().includes(source))) {
      score += 2;
    }
    
    // Sentiment strength
    if (Math.abs(sentiment.score) > 0.5) score += 1;
    
    // Keywords importance
    const importantKeywords = ['fed', 'interest rate', 'inflation', 'gdp', 'unemployment'];
    const text = (article.title + ' ' + article.description).toLowerCase();
    if (importantKeywords.some(keyword => text.includes(keyword))) {
      score += 1;
    }
    
    if (score >= 3) return 'high';
    if (score >= 1) return 'medium';
    return 'low';
  }

  private generateNewsId(url: string): string {
    return Buffer.from(url).toString('base64').substring(0, 10);
  }
}
```

## Next Steps

Part 9 will cover Real-time Features:
- WebSocket implementation for live updates
- Real-time portfolio tracking
- Market alerts and notifications
- Live chat system integration
- Push notification services
- Event-driven architecture for real-time data flow
