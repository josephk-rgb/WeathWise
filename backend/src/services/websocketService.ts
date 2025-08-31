import { WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { MarketDataService } from './marketDataService';

interface WebSocketClient {
  ws: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
  lastPing: Date;
}

export class WebSocketService {
  private clients: Map<WebSocket, WebSocketClient> = new Map();
  private marketDataService: MarketDataService;
  private marketDataInterval?: NodeJS.Timeout;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly MARKET_UPDATE_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.marketDataService = new MarketDataService();
    this.startHeartbeat();
    this.startMarketDataBroadcast();
  }

  /**
   * Register a new WebSocket client
   */
  addClient(ws: WebSocket, userId?: string): void {
    const client: WebSocketClient = {
      ws,
      userId,
      subscriptions: new Set(),
      lastPing: new Date()
    };

    this.clients.set(ws, client);
    logger.info(`WebSocket client added. Total clients: ${this.clients.size}`, { userId });

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connection_established',
      timestamp: new Date().toISOString(),
      userId
    });
  }

  /**
   * Remove a WebSocket client
   */
  removeClient(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (client) {
      logger.info(`WebSocket client removed`, { userId: client.userId });
      this.clients.delete(ws);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(ws: WebSocket, message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(ws);

      if (!client) {
        this.sendError(ws, 'Client not registered');
        return;
      }

      logger.info('WebSocket message received', { type: data.type, userId: client.userId });

      switch (data.type) {
        case 'subscribe_market_data':
          await this.handleMarketDataSubscription(client, data);
          break;
        
        case 'unsubscribe_market_data':
          await this.handleMarketDataUnsubscription(client, data);
          break;
        
        case 'portfolio_update':
          await this.handlePortfolioUpdate(client, data);
          break;
        
        case 'ping':
          this.handlePing(client);
          break;
        
        default:
          this.sendError(ws, `Unknown message type: ${data.type}`);
      }
    } catch (error) {
      logger.error('WebSocket message parsing error:', error);
      this.sendError(ws, 'Invalid message format');
    }
  }

  /**
   * Handle market data subscription
   */
  private async handleMarketDataSubscription(client: WebSocketClient, data: any): Promise<void> {
    const { symbols = [] } = data;
    
    if (!Array.isArray(symbols)) {
      this.sendError(client.ws, 'Symbols must be an array');
      return;
    }

    // Add symbols to client subscriptions
    symbols.forEach((symbol: string) => {
      if (typeof symbol === 'string' && symbol.trim()) {
        client.subscriptions.add(symbol.toUpperCase());
      }
    });

    // Send current market data for subscribed symbols
    try {
      const marketData = await this.getMarketDataForSymbols(Array.from(client.subscriptions));
      
      this.sendToClient(client.ws, {
        type: 'market_data_subscribed',
        symbols: Array.from(client.subscriptions),
        data: marketData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching initial market data:', error);
      this.sendError(client.ws, 'Failed to fetch initial market data');
    }
  }

  /**
   * Handle market data unsubscription
   */
  private async handleMarketDataUnsubscription(client: WebSocketClient, data: any): Promise<void> {
    const { symbols = [] } = data;
    
    if (!Array.isArray(symbols)) {
      this.sendError(client.ws, 'Symbols must be an array');
      return;
    }

    // Remove symbols from client subscriptions
    symbols.forEach((symbol: string) => {
      if (typeof symbol === 'string') {
        client.subscriptions.delete(symbol.toUpperCase());
      }
    });

    this.sendToClient(client.ws, {
      type: 'market_data_unsubscribed',
      symbols,
      remaining_subscriptions: Array.from(client.subscriptions),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle portfolio update
   */
  private async handlePortfolioUpdate(client: WebSocketClient, data: any): Promise<void> {
    if (!client.userId) {
      this.sendError(client.ws, 'Authentication required for portfolio updates');
      return;
    }

    // Broadcast portfolio update to all clients of the same user
    const portfolioUpdate = {
      type: 'portfolio_updated',
      userId: client.userId,
      data: data.portfolio,
      timestamp: new Date().toISOString()
    };

    // Send to all clients of this user
    this.clients.forEach((otherClient, otherWs) => {
      if (otherClient.userId === client.userId) {
        this.sendToClient(otherWs, portfolioUpdate);
      }
    });
  }

  /**
   * Handle ping for keepalive
   */
  private handlePing(client: WebSocketClient): void {
    client.lastPing = new Date();
    this.sendToClient(client.ws, {
      type: 'pong',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get market data for multiple symbols
   */
  private async getMarketDataForSymbols(symbols: string[]): Promise<any[]> {
    const marketData = [];
    
    for (const symbol of symbols) {
      try {
        const quote = await this.marketDataService.getQuote(symbol);
        if (quote) {
          marketData.push(quote);
        }
      } catch (error) {
        logger.error(`Error fetching market data for ${symbol}:`, error);
      }
    }
    
    return marketData;
  }

  /**
   * Start periodic market data broadcast
   */
  private startMarketDataBroadcast(): void {
    this.marketDataInterval = setInterval(async () => {
      // Get all unique symbols that clients are subscribed to
      const allSymbols = new Set<string>();
      this.clients.forEach(client => {
        client.subscriptions.forEach(symbol => allSymbols.add(symbol));
      });

      if (allSymbols.size === 0) return;

      try {
        const marketData = await this.getMarketDataForSymbols(Array.from(allSymbols));
        
        // Create a map for quick lookup
        const dataMap = new Map(marketData.map(quote => [quote.symbol, quote]));

        // Send relevant data to each client
        this.clients.forEach(client => {
          if (client.subscriptions.size > 0) {
            const clientData = Array.from(client.subscriptions)
              .map(symbol => dataMap.get(symbol))
              .filter(Boolean);

            if (clientData.length > 0) {
              this.sendToClient(client.ws, {
                type: 'market_data_update',
                data: clientData,
                timestamp: new Date().toISOString()
              });
            }
          }
        });
      } catch (error) {
        logger.error('Error broadcasting market data:', error);
      }
    }, this.MARKET_UPDATE_INTERVAL);
  }

  /**
   * Start heartbeat to check client connections
   */
  private startHeartbeat(): void {
    setInterval(() => {
      const now = new Date();
      const staleClients: WebSocket[] = [];

      this.clients.forEach((client, ws) => {
        const timeSinceLastPing = now.getTime() - client.lastPing.getTime();
        
        if (timeSinceLastPing > this.HEARTBEAT_INTERVAL * 2) {
          // Client hasn't responded to ping in too long
          staleClients.push(ws);
        } else if (timeSinceLastPing > this.HEARTBEAT_INTERVAL) {
          // Send ping
          this.sendToClient(ws, { type: 'ping', timestamp: now.toISOString() });
        }
      });

      // Remove stale clients
      staleClients.forEach(ws => {
        logger.info('Removing stale WebSocket client');
        ws.terminate();
        this.removeClient(ws);
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Error sending WebSocket message:', error);
      }
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, message: string): void {
    this.sendToClient(ws, {
      type: 'error',
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast message to all clients
   */
  broadcastToAll(message: any): void {
    this.clients.forEach((client, ws) => {
      this.sendToClient(ws, message);
    });
  }

  /**
   * Broadcast message to specific user
   */
  broadcastToUser(userId: string, message: any): void {
    this.clients.forEach((client, ws) => {
      if (client.userId === userId) {
        this.sendToClient(ws, message);
      }
    });
  }

  /**
   * Get connection statistics
   */
  getStats(): any {
    const stats = {
      totalClients: this.clients.size,
      authenticatedClients: 0,
      totalSubscriptions: 0,
      uniqueSymbols: new Set<string>()
    };

    this.clients.forEach(client => {
      if (client.userId) {
        stats.authenticatedClients++;
      }
      stats.totalSubscriptions += client.subscriptions.size;
      client.subscriptions.forEach(symbol => stats.uniqueSymbols.add(symbol));
    });

    return {
      ...stats,
      uniqueSymbols: stats.uniqueSymbols.size
    };
  }

  /**
   * Cleanup on shutdown
   */
  cleanup(): void {
    if (this.marketDataInterval) {
      clearInterval(this.marketDataInterval);
    }

    this.clients.forEach((client, ws) => {
      ws.close();
    });
    this.clients.clear();
  }
}
