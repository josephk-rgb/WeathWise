import { apiService } from './api';

export interface PollingConfig {
  interval: number;
  endpoint: string;
  enabled?: boolean;
  jitter?: boolean;
  backoffMultiplier?: number;
  maxBackoff?: number;
  retryAttempts?: number;
}

export interface PollingData {
  data: any;
  lastModified?: string;
  error?: Error;
  timestamp: number;
}

// Simple event emitter for browser compatibility
class SimpleEventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.events.get(event) || [];
    listeners.forEach(listener => listener(...args));
  }

  removeAllListeners() {
    this.events.clear();
  }
}

export class PollingManager extends SimpleEventEmitter {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private configs: Map<string, PollingConfig> = new Map();
  private lastData: Map<string, PollingData> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private initialRequests: Map<string, boolean> = new Map(); // Track if initial request has been made
  private isTabVisible: boolean = true;
  private visibilityListener?: () => void;

  constructor() {
    super();
    this.setupVisibilityListener();
  }

  /**
   * Start polling for a specific endpoint
   */
  startPolling(key: string, config: PollingConfig): void {
    // Stop existing polling if running
    this.stopPolling(key);

    // Store config
    this.configs.set(key, {
      enabled: true,
      jitter: true,
      backoffMultiplier: 1.5,
      maxBackoff: 300000, // 5 minutes
      retryAttempts: 3,
      ...config
    });

    // Reset error count and initial request flag
    this.errorCounts.set(key, 0);
    this.initialRequests.set(key, false);

    // Start immediate poll and then schedule recurring
    this.performPoll(key);
    this.scheduleNextPoll(key);
  }

  /**
   * Stop polling for a specific endpoint
   */
  stopPolling(key: string): void {
    const interval = this.intervals.get(key);
    if (interval) {
      clearTimeout(interval);
      this.intervals.delete(key);
    }
    this.configs.delete(key);
    this.errorCounts.delete(key);
    this.initialRequests.delete(key);
  }

  /**
   * Stop all polling
   */
  stopAll(): void {
    this.intervals.forEach(interval => clearTimeout(interval));
    this.intervals.clear();
    this.configs.clear();
    this.errorCounts.clear();
    this.initialRequests.clear();
  }

  /**
   * Get the last cached data for a key
   */
  getLastData(key: string): PollingData | undefined {
    return this.lastData.get(key);
  }

  /**
   * Update polling interval for a specific key
   */
  updateInterval(key: string, newInterval: number): void {
    const config = this.configs.get(key);
    if (config) {
      config.interval = newInterval;
      // Restart polling with new interval
      this.startPolling(key, config);
    }
  }

  /**
   * Pause/resume polling based on tab visibility
   */
  private setupVisibilityListener(): void {
    if (typeof document !== 'undefined') {
      this.visibilityListener = () => {
        const wasVisible = this.isTabVisible;
        this.isTabVisible = !document.hidden;

        // If tab became visible again, resume polling
        if (!wasVisible && this.isTabVisible) {
          this.resumeAllPolling();
        }
      };

      document.addEventListener('visibilitychange', this.visibilityListener);
    }
  }

  /**
   * Resume all polling when tab becomes visible
   */
  private resumeAllPolling(): void {
    this.configs.forEach((config, key) => {
      if (config.enabled) {
        // Perform immediate poll when resuming
        this.performPoll(key);
      }
    });
  }

  /**
   * Perform a single poll for the given key
   */
  private async performPoll(key: string): Promise<void> {
    const config = this.configs.get(key);
    if (!config || !config.enabled) return;

    try {
      // Skip polling if tab is hidden (except for critical data)
      if (!this.isTabVisible && !this.isCriticalEndpoint(config.endpoint)) {
        this.scheduleNextPoll(key);
        return;
      }

      // Check if this is the initial request for this key
      const isInitialRequest = !this.initialRequests.get(key);
      
      // Debug: Check token state before making request
      const currentToken = apiService.getCurrentToken();
      console.log('🔧 [DEBUG] Polling request token state:', {
        endpoint: config.endpoint,
        hasToken: !!currentToken,
        tokenPreview: currentToken ? currentToken.substring(0, 30) + '...' : 'none',
        isInitialRequest
      });

      // Use API service for authenticated requests
      // Force refresh on initial request to ensure we get actual data instead of 304
      const response = await apiService.makeAuthenticatedRequest(
        config.endpoint, 
        600000, // 10 minute cache for polling
        isInitialRequest // Force refresh on first request
      );
      
      // Mark that initial request has been made
      if (isInitialRequest) {
        this.initialRequests.set(key, true);
      }
      
      // Handle 304 Not Modified responses (response will be null or cached data)
      if (response === null) {
        // Data hasn't changed, use existing cached data if available
        const existingData = this.lastData.get(key);
        if (existingData) {
          // Update timestamp but keep existing data
          const pollingData: PollingData = {
            data: existingData.data,
            timestamp: Date.now()
          };
          this.lastData.set(key, pollingData);
          this.errorCounts.set(key, 0);
          this.emit('data', key, pollingData);
        }
        // If no existing data, don't emit anything (no change)
      } else {
        // New data received
        const pollingData: PollingData = {
          data: response,
          timestamp: Date.now()
        };

        this.lastData.set(key, pollingData);
        this.errorCounts.set(key, 0); // Reset error count on success
        this.emit('data', key, pollingData);
      }

    } catch (error) {
      console.error(`Polling error for ${key}:`, error);
      
      const errorCount = (this.errorCounts.get(key) || 0) + 1;
      this.errorCounts.set(key, errorCount);

      const errorData: PollingData = {
        data: null,
        error: error as Error,
        timestamp: Date.now()
      };

      this.emit('error', key, errorData);

      // If we exceed retry attempts, pause this polling
      if (errorCount >= (config.retryAttempts || 3)) {
        console.warn(`Max retries exceeded for ${key}, pausing polling`);
        config.enabled = false;
        return;
      }
    }

    // Schedule next poll
    this.scheduleNextPoll(key);
  }

  /**
   * Schedule the next poll with appropriate interval and jitter
   */
  private scheduleNextPoll(key: string): void {
    const config = this.configs.get(key);
    if (!config || !config.enabled) return;

    let interval = config.interval;
    const errorCount = this.errorCounts.get(key) || 0;

    // Apply exponential backoff for errors
    if (errorCount > 0) {
      const backoffMultiplier = config.backoffMultiplier || 1.5;
      interval = Math.min(
        interval * Math.pow(backoffMultiplier, errorCount),
        config.maxBackoff || 300000
      );
    }

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterAmount = interval * 0.1; // 10% jitter
      interval += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    // Double interval if tab is hidden (for non-critical endpoints)
    if (!this.isTabVisible && !this.isCriticalEndpoint(config.endpoint)) {
      interval *= 2;
    }

    const timeout = setTimeout(() => {
      this.performPoll(key);
    }, interval);

    this.intervals.set(key, timeout);
  }

  /**
   * Determine if an endpoint is critical and should poll even when tab is hidden
   */
  private isCriticalEndpoint(endpoint: string): boolean {
    const criticalPatterns = [
      '/api/portfolio/value', // Portfolio value changes
      '/api/alerts',          // Important alerts
      '/api/notifications'    // Critical notifications
    ];

    return criticalPatterns.some(pattern => endpoint.includes(pattern));
  }

  /**
   * Clean up when manager is destroyed
   */
  destroy(): void {
    this.stopAll();
    if (this.visibilityListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityListener);
    }
    this.removeAllListeners();
  }
}

// Singleton instance
export const pollingManager = new PollingManager();

// Predefined polling intervals for different data types
export const POLLING_INTERVALS = {
  // High priority - user-specific data
  portfolio: 30000,        // 30 seconds
  transactions: 60000,     // 1 minute
  
  // Medium priority - market data  
  marketPrices: 45000,     // 45 seconds + jitter
  analytics: 180000,       // 3 minutes
  
  // Low priority - slowly changing data
  news: 600000,           // 10 minutes
  userProfile: 600000,    // 10 minutes
  
  // Very low priority
  settings: 1800000,      // 30 minutes
} as const;
