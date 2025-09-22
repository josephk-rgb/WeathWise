import { logger } from './logger';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export class PerformanceOptimizer {
  private static metrics: PerformanceMetrics[] = [];
  private static cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  // Performance monitoring wrapper
  static async trackCalculation<T>(
    operation: string,
    fn: () => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    const start = Date.now();
    let success = true;
    let errorMessage: string | undefined;

    try {
      // Add timeout to prevent hanging operations
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation ${operation} timed out`)), timeoutMs);
      });

      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      const duration = Date.now() - start;
      
      // Log performance metrics
      const metric: PerformanceMetrics = {
        operation,
        duration,
        timestamp: new Date(),
        success,
        errorMessage
      };

      this.metrics.push(metric);
      
      // Keep only last 100 metrics
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }

      // Log slow operations
      if (duration > 5000) {
        logger.warn(`Slow ${operation}: ${duration}ms`);
      }

      // Log failed operations
      if (!success) {
        logger.error(`Failed ${operation}: ${errorMessage} (${duration}ms)`);
      }
    }
  }

  // Simple in-memory caching (for testing without Redis)
  static async getCached<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if cache expired
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  static async setCache<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });

    // Clean up expired entries periodically
    if (this.cache.size > 1000) {
      this.cleanExpiredCache();
    }
  }

  static clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Clear cache entries matching pattern
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private static cleanExpiredCache(): void {
    const now = Date.now();
    
    for (const [key, value] of this.cache) {
      if (now > value.timestamp + value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get performance statistics
  static getPerformanceStats(): any {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 100,
        slowOperations: 0
      };
    }

    const totalOperations = this.metrics.length;
    const successfulOps = this.metrics.filter(m => m.success).length;
    const averageDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;
    const slowOperations = this.metrics.filter(m => m.duration > 5000).length;
    const successRate = (successfulOps / totalOperations) * 100;

    // Group by operation type
    const operationStats = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = {
          count: 0,
          totalDuration: 0,
          successCount: 0
        };
      }
      
      acc[metric.operation].count++;
      acc[metric.operation].totalDuration += metric.duration;
      if (metric.success) acc[metric.operation].successCount++;
      
      return acc;
    }, {} as any);

    // Calculate averages for each operation
    for (const op in operationStats) {
      const stats = operationStats[op];
      stats.averageDuration = stats.totalDuration / stats.count;
      stats.successRate = (stats.successCount / stats.count) * 100;
    }

    return {
      totalOperations,
      averageDuration: Math.round(averageDuration),
      successRate: Math.round(successRate * 100) / 100,
      slowOperations,
      cacheSize: this.cache.size,
      operationBreakdown: operationStats,
      recentMetrics: this.metrics.slice(-10)
    };
  }

  // Batch operation utility
  static async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 10,
    delayMs: number = 100
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item))
      );

      // Collect successful results
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.warn('Batch processing error:', result.reason);
        }
      });

      // Add delay between batches to avoid overwhelming APIs
      if (i + batchSize < items.length && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  // Debounce utility for frequent operations
  private static debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  static debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delayMs: number = 1000
  ): T {
    return ((...args: any[]) => {
      // Clear existing timer
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        fn(...args);
        this.debounceTimers.delete(key);
      }, delayMs);

      this.debounceTimers.set(key, timer);
    }) as T;
  }
}
