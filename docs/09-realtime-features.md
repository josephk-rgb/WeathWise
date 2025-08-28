# Part 9: Real-time Features & WebSocket Implementation

## 9.1 WebSocket Architecture

### WebSocket Server Implementation

```typescript
// backend/src/websocket/websocketServer.ts
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { AuthService } from '../services/authService';
import { RoomManager } from './roomManager';
import { EventHandler } from './eventHandler';
import { RateLimiter } from './rateLimiter';
import { Logger } from '../utils/logger';

export class WebSocketServer {
  private io: Server;
  private roomManager: RoomManager;
  private eventHandler: EventHandler;
  private rateLimiter: RateLimiter;
  private authService: AuthService;
  private logger: Logger;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.roomManager = new RoomManager();
    this.eventHandler = new EventHandler();
    this.rateLimiter = new RateLimiter();
    this.authService = new AuthService();
    this.logger = new Logger('WebSocketServer');

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        if (!token) {
          throw new Error('Authentication token required');
        }

        const user = await this.authService.verifyToken(token);
        socket.data.user = user;
        socket.data.userId = user.id;
        
        this.logger.info(`User ${user.id} connected via WebSocket`);
        next();
      } catch (error) {
        this.logger.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use((socket, next) => {
      const isAllowed = this.rateLimiter.checkLimit(socket.data.userId, 'connection');
      if (!isAllowed) {
        this.logger.warn(`Rate limit exceeded for user ${socket.data.userId}`);
        next(new Error('Rate limit exceeded'));
        return;
      }
      next();
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      
      // Join user to their personal room
      socket.join(`user:${userId}`);
      
      // Handle room subscriptions
      socket.on('subscribe', async (data) => {
        await this.handleSubscribe(socket, data);
      });

      socket.on('unsubscribe', async (data) => {
        await this.handleUnsubscribe(socket, data);
      });

      // Handle real-time chat
      socket.on('chat_message', async (data) => {
        await this.handleChatMessage(socket, data);
      });

      // Handle portfolio updates
      socket.on('portfolio_update', async (data) => {
        await this.handlePortfolioUpdate(socket, data);
      });

      // Handle market alerts
      socket.on('create_alert', async (data) => {
        await this.handleCreateAlert(socket, data);
      });

      socket.on('delete_alert', async (data) => {
        await this.handleDeleteAlert(socket, data);
      });

      // Handle heartbeat
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.logger.info(`User ${userId} disconnected: ${reason}`);
        this.roomManager.removeUserFromAllRooms(userId);
      });

      // Send connection acknowledgment
      socket.emit('connected', {
        message: 'Connected to WealthWise real-time service',
        timestamp: Date.now(),
        features: ['portfolio_updates', 'price_alerts', 'chat', 'market_data'],
      });
    });
  }

  private async handleSubscribe(socket: any, data: any): Promise<void> {
    const { type, channel } = data;
    const userId = socket.data.userId;

    if (!this.rateLimiter.checkLimit(userId, 'subscribe')) {
      socket.emit('error', { message: 'Subscription rate limit exceeded' });
      return;
    }

    try {
      switch (type) {
        case 'price_feed':
          await this.subscribeToPrice(socket, channel);
          break;
        case 'portfolio':
          await this.subscribeToPortfolio(socket, channel);
          break;
        case 'market_news':
          await this.subscribeToMarketNews(socket, channel);
          break;
        case 'chat':
          await this.subscribeToChat(socket, channel);
          break;
        default:
          socket.emit('error', { message: `Unknown subscription type: ${type}` });
      }
    } catch (error) {
      this.logger.error(`Subscription error for user ${userId}:`, error);
      socket.emit('error', { message: 'Subscription failed' });
    }
  }

  private async subscribeToPrice(socket: any, symbol: string): Promise<void> {
    const roomName = `price:${symbol}`;
    socket.join(roomName);
    this.roomManager.addUserToRoom(socket.data.userId, roomName);
    
    socket.emit('subscribed', {
      type: 'price_feed',
      channel: symbol,
      message: `Subscribed to price updates for ${symbol}`,
    });

    // Send current price if available
    const currentPrice = await this.eventHandler.getCurrentPrice(symbol);
    if (currentPrice) {
      socket.emit('price_update', currentPrice);
    }
  }

  private async subscribeToPortfolio(socket: any, portfolioId: string): Promise<void> {
    // Verify user has access to this portfolio
    const hasAccess = await this.eventHandler.verifyPortfolioAccess(
      socket.data.userId,
      portfolioId
    );

    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied to portfolio' });
      return;
    }

    const roomName = `portfolio:${portfolioId}`;
    socket.join(roomName);
    this.roomManager.addUserToRoom(socket.data.userId, roomName);
    
    socket.emit('subscribed', {
      type: 'portfolio',
      channel: portfolioId,
      message: `Subscribed to portfolio updates`,
    });
  }

  private async subscribeToMarketNews(socket: any, category: string): Promise<void> {
    const roomName = `news:${category}`;
    socket.join(roomName);
    this.roomManager.addUserToRoom(socket.data.userId, roomName);
    
    socket.emit('subscribed', {
      type: 'market_news',
      channel: category,
      message: `Subscribed to ${category} market news`,
    });
  }

  private async subscribeToChat(socket: any, sessionId: string): Promise<void> {
    // Verify user has access to this chat session
    const hasAccess = await this.eventHandler.verifyChatAccess(
      socket.data.userId,
      sessionId
    );

    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied to chat session' });
      return;
    }

    const roomName = `chat:${sessionId}`;
    socket.join(roomName);
    this.roomManager.addUserToRoom(socket.data.userId, roomName);
    
    socket.emit('subscribed', {
      type: 'chat',
      channel: sessionId,
      message: `Joined chat session`,
    });
  }

  private async handleChatMessage(socket: any, data: any): Promise<void> {
    const userId = socket.data.userId;
    
    if (!this.rateLimiter.checkLimit(userId, 'chat_message')) {
      socket.emit('error', { message: 'Message rate limit exceeded' });
      return;
    }

    try {
      const message = await this.eventHandler.processChatMessage(userId, data);
      
      // Broadcast to chat room
      this.io.to(`chat:${data.sessionId}`).emit('chat_message', message);
      
      // If this is a question to the AI, process it
      if (data.type === 'user_message') {
        this.eventHandler.processAIResponse(userId, data.sessionId, data.message);
      }
    } catch (error) {
      this.logger.error(`Chat message error for user ${userId}:`, error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handlePortfolioUpdate(socket: any, data: any): Promise<void> {
    const userId = socket.data.userId;
    
    try {
      const updatedPortfolio = await this.eventHandler.updatePortfolio(userId, data);
      
      // Broadcast to user's portfolio room
      this.io.to(`portfolio:${data.portfolioId}`).emit('portfolio_updated', updatedPortfolio);
      
      // Update price subscriptions if needed
      if (data.newSymbols) {
        data.newSymbols.forEach((symbol: string) => {
          socket.join(`price:${symbol}`);
        });
      }
    } catch (error) {
      this.logger.error(`Portfolio update error for user ${userId}:`, error);
      socket.emit('error', { message: 'Portfolio update failed' });
    }
  }

  // Public methods for broadcasting updates
  public broadcastPriceUpdate(symbol: string, priceData: any): void {
    this.io.to(`price:${symbol}`).emit('price_update', {
      symbol,
      ...priceData,
      timestamp: Date.now(),
    });
  }

  public broadcastMarketNews(category: string, newsItem: any): void {
    this.io.to(`news:${category}`).emit('market_news', newsItem);
  }

  public sendUserNotification(userId: string, notification: any): void {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  public broadcastMarketAlert(alert: any): void {
    // Broadcast to all connected users
    this.io.emit('market_alert', alert);
  }

  public getConnectedUsers(): number {
    return this.io.sockets.sockets.size;
  }

  public getUserRooms(userId: string): string[] {
    return this.roomManager.getUserRooms(userId);
  }

  public getRoomUsers(roomName: string): string[] {
    return this.roomManager.getRoomUsers(roomName);
  }
}
```

### Event Handler Implementation

```typescript
// backend/src/websocket/eventHandler.ts
import { DatabaseService } from '../services/databaseService';
import { MarketDataService } from '../services/marketDataService';
import { AIService } from '../services/aiService';
import { NotificationService } from '../services/notificationService';
import { Logger } from '../utils/logger';

export class EventHandler {
  private db: DatabaseService;
  private marketData: MarketDataService;
  private aiService: AIService;
  private notificationService: NotificationService;
  private logger: Logger;

  constructor() {
    this.db = new DatabaseService();
    this.marketData = new MarketDataService();
    this.aiService = new AIService();
    this.notificationService = new NotificationService();
    this.logger = new Logger('EventHandler');
  }

  async getCurrentPrice(symbol: string): Promise<any> {
    try {
      return await this.marketData.getCurrentPrice(symbol);
    } catch (error) {
      this.logger.error(`Failed to get current price for ${symbol}:`, error);
      return null;
    }
  }

  async verifyPortfolioAccess(userId: string, portfolioId: string): Promise<boolean> {
    try {
      const portfolio = await this.db.collection('portfolios').findOne({
        _id: portfolioId,
        userId: userId,
      });
      return !!portfolio;
    } catch (error) {
      this.logger.error(`Portfolio access verification failed:`, error);
      return false;
    }
  }

  async verifyChatAccess(userId: string, sessionId: string): Promise<boolean> {
    try {
      const session = await this.db.collection('chat_sessions').findOne({
        _id: sessionId,
        userId: userId,
      });
      return !!session;
    } catch (error) {
      this.logger.error(`Chat access verification failed:`, error);
      return false;
    }
  }

  async processChatMessage(userId: string, data: any): Promise<any> {
    const message = {
      id: this.generateId(),
      sessionId: data.sessionId,
      userId: userId,
      type: data.type,
      content: data.message,
      timestamp: new Date(),
      metadata: data.metadata || {},
    };

    // Save to database
    await this.db.collection('chat_messages').insertOne(message);

    // Update session last activity
    await this.db.collection('chat_sessions').updateOne(
      { _id: data.sessionId },
      { 
        $set: { lastActivity: new Date() },
        $inc: { messageCount: 1 }
      }
    );

    return message;
  }

  async processAIResponse(userId: string, sessionId: string, userMessage: string): Promise<void> {
    try {
      // Get chat history for context
      const history = await this.db.collection('chat_messages')
        .find({ sessionId })
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();

      // Get user's portfolio for context
      const portfolio = await this.db.collection('portfolios').findOne({ userId });

      // Generate AI response
      const aiResponse = await this.aiService.generateResponse({
        message: userMessage,
        history: history.reverse(),
        portfolio,
        userId,
      });

      // Save AI response
      const aiMessage = {
        id: this.generateId(),
        sessionId,
        userId: 'ai',
        type: 'ai_response',
        content: aiResponse.message,
        timestamp: new Date(),
        metadata: {
          confidence: aiResponse.confidence,
          sources: aiResponse.sources,
          suggestions: aiResponse.suggestions,
        },
      };

      await this.db.collection('chat_messages').insertOne(aiMessage);

      // Broadcast AI response via WebSocket
      // This will be handled by the WebSocket server
      return aiMessage;
    } catch (error) {
      this.logger.error(`AI response processing failed:`, error);
      throw error;
    }
  }

  async updatePortfolio(userId: string, data: any): Promise<any> {
    try {
      const { portfolioId, changes } = data;

      // Update portfolio in database
      const result = await this.db.collection('portfolios').updateOne(
        { _id: portfolioId, userId },
        { 
          $set: { 
            ...changes,
            lastUpdated: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        throw new Error('Portfolio not found or access denied');
      }

      // Get updated portfolio
      const updatedPortfolio = await this.db.collection('portfolios').findOne({
        _id: portfolioId
      });

      // Calculate new metrics
      const metrics = await this.calculatePortfolioMetrics(updatedPortfolio);

      // Check for alerts
      await this.checkPortfolioAlerts(userId, updatedPortfolio, metrics);

      return {
        portfolio: updatedPortfolio,
        metrics,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error(`Portfolio update failed:`, error);
      throw error;
    }
  }

  private async calculatePortfolioMetrics(portfolio: any): Promise<any> {
    // Implementation for portfolio metrics calculation
    const totalValue = portfolio.investments.reduce((sum: number, inv: any) => {
      return sum + (inv.shares * inv.currentPrice);
    }, 0);

    const totalCost = portfolio.investments.reduce((sum: number, inv: any) => {
      return sum + (inv.shares * inv.purchasePrice);
    }, 0);

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      calculatedAt: new Date(),
    };
  }

  private async checkPortfolioAlerts(userId: string, portfolio: any, metrics: any): Promise<void> {
    // Get user's alerts
    const alerts = await this.db.collection('alerts').find({
      userId,
      isActive: true,
    }).toArray();

    for (const alert of alerts) {
      const shouldTrigger = this.evaluateAlert(alert, portfolio, metrics);
      
      if (shouldTrigger) {
        await this.triggerAlert(alert, portfolio, metrics);
      }
    }
  }

  private evaluateAlert(alert: any, portfolio: any, metrics: any): boolean {
    switch (alert.type) {
      case 'portfolio_value':
        return this.checkThreshold(metrics.totalValue, alert.threshold, alert.condition);
      case 'portfolio_gain_loss':
        return this.checkThreshold(metrics.totalGainLossPercent, alert.threshold, alert.condition);
      case 'stock_price':
        const stock = portfolio.investments.find((inv: any) => inv.symbol === alert.symbol);
        return stock ? this.checkThreshold(stock.currentPrice, alert.threshold, alert.condition) : false;
      default:
        return false;
    }
  }

  private checkThreshold(value: number, threshold: number, condition: string): boolean {
    switch (condition) {
      case 'above': return value > threshold;
      case 'below': return value < threshold;
      case 'equals': return Math.abs(value - threshold) < 0.01;
      default: return false;
    }
  }

  private async triggerAlert(alert: any, portfolio: any, metrics: any): Promise<void> {
    // Create notification
    const notification = {
      id: this.generateId(),
      userId: alert.userId,
      type: 'alert',
      title: alert.title,
      message: alert.message,
      data: {
        alertId: alert._id,
        currentValue: this.getCurrentValueForAlert(alert, portfolio, metrics),
        threshold: alert.threshold,
      },
      timestamp: new Date(),
      read: false,
    };

    // Save notification
    await this.db.collection('notifications').insertOne(notification);

    // Send via notification service
    await this.notificationService.sendNotification(alert.userId, notification);

    // Update alert last triggered time
    await this.db.collection('alerts').updateOne(
      { _id: alert._id },
      { $set: { lastTriggered: new Date() } }
    );
  }

  private getCurrentValueForAlert(alert: any, portfolio: any, metrics: any): number {
    switch (alert.type) {
      case 'portfolio_value':
        return metrics.totalValue;
      case 'portfolio_gain_loss':
        return metrics.totalGainLossPercent;
      case 'stock_price':
        const stock = portfolio.investments.find((inv: any) => inv.symbol === alert.symbol);
        return stock?.currentPrice || 0;
      default:
        return 0;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
```

## 9.2 Real-time Portfolio Tracking

### Portfolio Sync Service

```typescript
// frontend/src/services/portfolioSyncService.ts
import { WebSocketService } from './websocketService';
import { useStore } from '../store/useStore';
import { Portfolio, Investment } from '../types';

export class PortfolioSyncService {
  private ws: WebSocketService;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: Date | null = null;
  private pendingChanges: Map<string, any> = new Map();
  private isOnline: boolean = navigator.onLine;

  constructor(wsService: WebSocketService) {
    this.ws = wsService;
    this.setupEventListeners();
    this.startSyncInterval();
  }

  private setupEventListeners(): void {
    // Listen for WebSocket portfolio updates
    this.ws.on('portfolio_updated', (data) => {
      this.handlePortfolioUpdate(data);
    });

    // Listen for price updates
    this.ws.on('price_update', (data) => {
      this.handlePriceUpdate(data);
    });

    // Listen for online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Listen for store changes
    useStore.subscribe(
      (state) => state.portfolio,
      (portfolio) => {
        if (portfolio && this.isOnline) {
          this.queuePortfolioSync(portfolio);
        }
      }
    );
  }

  private handlePortfolioUpdate(data: any): void {
    const { setPortfolio, setInvestments } = useStore.getState();
    
    // Update store with server data
    setPortfolio(data.portfolio);
    setInvestments(data.portfolio.investments);
    
    this.lastSyncTime = new Date();
    
    // Show notification if significant change
    if (data.metrics && Math.abs(data.metrics.totalGainLossPercent) > 5) {
      this.showPortfolioAlert(data.metrics);
    }
  }

  private handlePriceUpdate(data: any): void {
    const { updateInvestmentPrices, setMarketData } = useStore.getState();
    
    // Update market data
    setMarketData(data.symbol, {
      symbol: data.symbol,
      currentPrice: data.price,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume || 0,
      lastUpdated: new Date(data.timestamp)
    });

    // Update investment prices
    updateInvestmentPrices({ [data.symbol]: data.price });
  }

  private queuePortfolioSync(portfolio: Portfolio): void {
    // Debounce portfolio sync to avoid too many updates
    clearTimeout(this.syncDebounceTimer);
    this.syncDebounceTimer = setTimeout(() => {
      this.syncPortfolio(portfolio);
    }, 1000); // Wait 1 second before syncing
  }

  private syncDebounceTimer: NodeJS.Timeout | null = null;

  private async syncPortfolio(portfolio: Portfolio): Promise<void> {
    if (!this.isOnline) {
      this.queueOfflineChange('portfolio_update', portfolio);
      return;
    }

    try {
      this.ws.emit('portfolio_update', {
        portfolioId: portfolio.id,
        changes: {
          investments: portfolio.investments,
          lastModified: new Date(),
        },
      });
    } catch (error) {
      console.error('Portfolio sync failed:', error);
      this.queueOfflineChange('portfolio_update', portfolio);
    }
  }

  private queueOfflineChange(type: string, data: any): void {
    const changeId = `${type}_${Date.now()}`;
    this.pendingChanges.set(changeId, {
      type,
      data,
      timestamp: new Date(),
    });
  }

  private async syncPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;

    const changes = Array.from(this.pendingChanges.entries());
    this.pendingChanges.clear();

    for (const [id, change] of changes) {
      try {
        switch (change.type) {
          case 'portfolio_update':
            await this.syncPortfolio(change.data);
            break;
          // Add other change types as needed
        }
      } catch (error) {
        console.error(`Failed to sync change ${id}:`, error);
        // Re-queue failed changes
        this.pendingChanges.set(id, change);
      }
    }
  }

  private startSyncInterval(): void {
    // Sync every 5 minutes to ensure data consistency
    this.syncInterval = setInterval(() => {
      this.performPeriodicSync();
    }, 5 * 60 * 1000);
  }

  private async performPeriodicSync(): Promise<void> {
    if (!this.isOnline) return;

    const { portfolio, user } = useStore.getState();
    
    if (!portfolio || !user) return;

    try {
      // Request latest portfolio data from server
      this.ws.emit('sync_request', {
        portfolioId: portfolio.id,
        lastSyncTime: this.lastSyncTime,
      });
    } catch (error) {
      console.error('Periodic sync failed:', error);
    }
  }

  private showPortfolioAlert(metrics: any): void {
    const { addNotification } = useStore.getState();
    
    const isPositive = metrics.totalGainLossPercent > 0;
    const message = `Your portfolio is ${isPositive ? 'up' : 'down'} ${Math.abs(metrics.totalGainLossPercent).toFixed(2)}%`;
    
    addNotification({
      id: Date.now().toString(),
      type: isPositive ? 'success' : 'warning',
      title: 'Portfolio Update',
      message,
      timestamp: new Date(),
      autoClose: true,
    });
  }

  public subscribeToPortfolio(portfolioId: string): void {
    this.ws.emit('subscribe', {
      type: 'portfolio',
      channel: portfolioId,
    });
  }

  public subscribeToSymbols(symbols: string[]): void {
    symbols.forEach(symbol => {
      this.ws.emit('subscribe', {
        type: 'price_feed',
        channel: symbol,
      });
    });
  }

  public forceSync(): Promise<void> {
    return this.performPeriodicSync();
  }

  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    window.removeEventListener('online', this.syncPendingChanges);
    window.removeEventListener('offline', () => {});
  }
}
```

## 9.3 Market Alerts & Notifications

### Alert Management System

```typescript
// frontend/src/services/alertService.ts
import { ApiService } from './apiService';
import { WebSocketService } from './websocketService';
import { useStore } from '../store/useStore';

export interface Alert {
  id: string;
  userId: string;
  type: 'price' | 'portfolio_value' | 'portfolio_change' | 'news' | 'economic';
  title: string;
  description: string;
  conditions: AlertCondition[];
  isActive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  field: string; // 'price', 'change_percent', 'volume', etc.
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  symbol?: string;
}

export interface AlertTrigger {
  alertId: string;
  triggeredAt: Date;
  currentValue: number;
  threshold: number;
  message: string;
  data: any;
}

export class AlertService {
  private api: ApiService;
  private ws: WebSocketService;

  constructor() {
    this.api = new ApiService();
    this.ws = new WebSocketService();
    this.setupWebSocketListeners();
  }

  private setupWebSocketListeners(): void {
    this.ws.on('alert_triggered', (data: AlertTrigger) => {
      this.handleAlertTriggered(data);
    });

    this.ws.on('market_alert', (data: any) => {
      this.handleMarketAlert(data);
    });
  }

  private handleAlertTriggered(trigger: AlertTrigger): void {
    const { addNotification } = useStore.getState();
    
    addNotification({
      id: `alert_${trigger.alertId}_${Date.now()}`,
      type: 'warning',
      title: 'Alert Triggered',
      message: trigger.message,
      timestamp: new Date(trigger.triggeredAt),
      autoClose: false,
      data: trigger.data,
      action: {
        label: 'View Details',
        onClick: () => this.viewAlertDetails(trigger.alertId),
      },
    });

    // Play notification sound if enabled
    this.playNotificationSound();
  }

  private handleMarketAlert(alert: any): void {
    const { addNotification } = useStore.getState();
    
    addNotification({
      id: `market_alert_${Date.now()}`,
      type: alert.severity === 'high' ? 'error' : 'info',
      title: 'Market Alert',
      message: alert.message,
      timestamp: new Date(),
      autoClose: alert.severity !== 'high',
      data: alert,
    });
  }

  async createAlert(alert: Omit<Alert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Alert> {
    try {
      const response = await this.api.post('/alerts', alert);
      return response.data;
    } catch (error) {
      console.error('Failed to create alert:', error);
      throw error;
    }
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert> {
    try {
      const response = await this.api.put(`/alerts/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update alert:', error);
      throw error;
    }
  }

  async deleteAlert(id: string): Promise<void> {
    try {
      await this.api.delete(`/alerts/${id}`);
    } catch (error) {
      console.error('Failed to delete alert:', error);
      throw error;
    }
  }

  async getAlerts(): Promise<Alert[]> {
    try {
      const response = await this.api.get('/alerts');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      return [];
    }
  }

  async toggleAlert(id: string, isActive: boolean): Promise<Alert> {
    return this.updateAlert(id, { isActive });
  }

  // Predefined alert templates
  createPriceAlert(symbol: string, targetPrice: number, operator: 'above' | 'below'): Omit<Alert, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
    return {
      type: 'price',
      title: `Price Alert: ${symbol}`,
      description: `Alert when ${symbol} price goes ${operator} $${targetPrice}`,
      conditions: [{
        field: 'price',
        operator: operator === 'above' ? 'gte' : 'lte',
        value: targetPrice,
        symbol,
      }],
      isActive: true,
    };
  }

  createPortfolioValueAlert(targetValue: number, operator: 'above' | 'below'): Omit<Alert, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
    return {
      type: 'portfolio_value',
      title: `Portfolio Value Alert`,
      description: `Alert when portfolio value goes ${operator} $${targetValue.toLocaleString()}`,
      conditions: [{
        field: 'portfolio_value',
        operator: operator === 'above' ? 'gte' : 'lte',
        value: targetValue,
      }],
      isActive: true,
    };
  }

  createPercentChangeAlert(symbol: string, changePercent: number, operator: 'above' | 'below'): Omit<Alert, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
    return {
      type: 'price',
      title: `${symbol} Change Alert`,
      description: `Alert when ${symbol} changes ${operator} ${changePercent}%`,
      conditions: [{
        field: 'change_percent',
        operator: operator === 'above' ? 'gte' : 'lte',
        value: changePercent,
        symbol,
      }],
      isActive: true,
    };
  }

  private viewAlertDetails(alertId: string): void {
    // Navigate to alert details page
    window.location.href = `/alerts/${alertId}`;
  }

  private playNotificationSound(): void {
    // Play notification sound if browser supports it and user has enabled sounds
    if ('Audio' in window) {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Ignore audio play errors (user interaction required)
        });
      } catch (error) {
        // Ignore audio errors
      }
    }
  }

  // Browser notification API integration
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  showBrowserNotification(title: string, options: NotificationOptions = {}): void {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icons/app-icon-192.png',
        badge: '/icons/app-icon-72.png',
        ...options,
      });
    }
  }

  // Service Worker push notifications (for when app is closed)
  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY,
      });

      // Send subscription to server
      await this.api.post('/notifications/subscribe', {
        subscription: subscription.toJSON(),
      });

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }
}
```

### Real-time Notification Component

```tsx
// frontend/src/components/Notifications/NotificationCenter.tsx
import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { AlertService } from '../../services/alertService';
import Button from '../UI/Button';
import Card from '../UI/Card';
import { formatDate } from '../../utils/date';

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const { notifications, removeNotification } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [alertService] = useState(() => new AlertService());

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Mark notifications as read when opened
    if (isOpen && unreadCount > 0) {
      // In a real app, you'd call an API to mark as read
      setTimeout(() => {
        notifications.forEach(notification => {
          if (!notification.read) {
            // Update notification as read
          }
        });
      }, 1000);
    }
  }, [isOpen, unreadCount]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (notification.action) {
      notification.action.onClick();
    }
    removeNotification(notification.id);
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-96 max-h-96 overflow-y-auto z-50">
            <Card className="border shadow-lg">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Notifications
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              {formatDate(notification.timestamp, 'relative')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {notification.message}
                          </p>
                          {notification.action && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                notification.action.onClick();
                                removeNotification(notification.id);
                              }}
                            >
                              {notification.action.label}
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {notifications.length > 0 && (
                <div className="p-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      notifications.forEach(n => removeNotification(n.id));
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
```

## Next Steps

Part 10 will cover Testing & Quality Assurance:
- Unit testing strategies with Jest and React Testing Library
- Integration testing for WebSocket connections
- End-to-end testing with Playwright
- Performance testing and load testing
- Security testing and vulnerability assessment
- CI/CD pipeline setup with automated testing
