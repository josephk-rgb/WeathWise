import { useEffect, useRef, useState, useCallback } from 'react';
import { pollingManager, PollingConfig, PollingData, POLLING_INTERVALS } from '../services/pollingManager';

export interface UsePollingOptions {
  enabled?: boolean;
  interval?: number;
  immediate?: boolean;
  dependencies?: any[];
}

export interface UsePollingReturn<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  refresh: () => void;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Custom hook for polling data from an API endpoint
 */
export function usePolling<T = any>(
  endpoint: string,
  options: UsePollingOptions = {}
): UsePollingReturn<T> {
  const {
    enabled = true,
    interval = POLLING_INTERVALS.portfolio,
    immediate = true,
    dependencies = []
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(immediate);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const pollingKeyRef = useRef<string>();
  const isMountedRef = useRef(true);

  // Generate a unique key for this polling instance
  const pollingKey = `${endpoint}-${JSON.stringify(dependencies)}`;

  // Update polling key when dependencies change
  if (pollingKeyRef.current !== pollingKey) {
    pollingKeyRef.current = pollingKey;
  }

  // Handle data updates from polling manager
  const handleData = useCallback((key: string, pollingData: PollingData) => {
    if (key === pollingKeyRef.current && isMountedRef.current) {
      if (pollingData.error) {
        setError(pollingData.error);
        setIsLoading(false);
      } else {
        setData(pollingData.data);
        setError(null);
        setIsLoading(false);
        setLastUpdated(new Date(pollingData.timestamp));
      }
    }
  }, []);

  // Handle errors from polling manager
  const handleError = useCallback((key: string, pollingData: PollingData) => {
    if (key === pollingKeyRef.current && isMountedRef.current) {
      setError(pollingData.error || new Error('Polling failed'));
      setIsLoading(false);
    }
  }, []);

  // Manual refresh function
  const refresh = useCallback(() => {
    if (pollingKeyRef.current) {
      setIsLoading(true);
      setError(null);
      
      // Get any cached data immediately
      const cachedData = pollingManager.getLastData(pollingKeyRef.current);
      if (cachedData && !cachedData.error) {
        setData(cachedData.data);
        setLastUpdated(new Date(cachedData.timestamp));
        setIsLoading(false);
      }

      // Force a new poll
      const config: PollingConfig = {
        endpoint,
        interval,
        enabled: true
      };
      pollingManager.startPolling(pollingKeyRef.current, config);
    }
  }, [endpoint, interval]);

  // Start polling function
  const startPolling = useCallback(() => {
    if (pollingKeyRef.current) {
      const config: PollingConfig = {
        endpoint,
        interval,
        enabled: true
      };
      pollingManager.startPolling(pollingKeyRef.current, config);
    }
  }, [endpoint, interval]);

  // Stop polling function
  const stopPolling = useCallback(() => {
    if (pollingKeyRef.current) {
      pollingManager.stopPolling(pollingKeyRef.current);
    }
  }, []);

  // Set up polling when hook mounts or dependencies change
  useEffect(() => {
    isMountedRef.current = true;

    // Generate unique polling key based on endpoint and dependencies
    const dependencyHash = dependencies ? JSON.stringify(dependencies) : '';
    const newPollingKey = `${endpoint}|${dependencyHash}`;
    pollingKeyRef.current = newPollingKey;

    // Set up event listeners
    pollingManager.on('data', handleData);
    pollingManager.on('error', handleError);

    // Check for cached data first
    const cachedData = pollingManager.getLastData(newPollingKey);
    if (cachedData && !cachedData.error) {
      setData(cachedData.data);
      setLastUpdated(new Date(cachedData.timestamp));
      setIsLoading(false);
    }

    // Start polling if enabled
    if (enabled) {
      const config: PollingConfig = {
        endpoint,
        interval,
        enabled: true
      };
      pollingManager.startPolling(newPollingKey, config);
    }

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      pollingManager.off('data', handleData);
      pollingManager.off('error', handleError);
      
      if (enabled && newPollingKey) {
        pollingManager.stopPolling(newPollingKey);
      }
    };
  }, [endpoint, interval, enabled, JSON.stringify(dependencies || []), handleData, handleError]);

  return {
    data,
    error,
    isLoading,
    lastUpdated,
    refresh,
    startPolling,
    stopPolling
  };
}

/**
 * Hook for polling portfolio data
 */
export function usePortfolioPolling(enabled = true) {
  return usePolling('/portfolio/summary', {
    enabled,
    interval: POLLING_INTERVALS.portfolio,
    immediate: true
  });
}

/**
 * Hook for polling market news
 */
export function useNewsPolling(symbols: string[] = [], enabled = true) {
  const endpoint = symbols.length > 0 
    ? `/market/news?symbols=${symbols.join(',')}`
    : '/market/news';
    
  return usePolling(endpoint, {
    enabled,
    interval: POLLING_INTERVALS.news,
    immediate: true,
    dependencies: [symbols]
  });
}

/**
 * Hook for polling market prices
 */
export function useMarketPricesPolling(symbols: string[] = [], enabled = true) {
  const endpoint = symbols.length > 0 
    ? `/market/data?symbols=${symbols.join(',')}`
    : '/market/summary';
    
  return usePolling(endpoint, {
    enabled,
    interval: POLLING_INTERVALS.marketPrices,
    immediate: true,
    dependencies: [symbols]
  });
}

/**
 * Hook for polling analytics data
 */
export function useAnalyticsPolling(timeframe = '1M', enabled = true) {
  return usePolling(`/analytics/portfolio?timeframe=${timeframe}`, {
    enabled,
    interval: POLLING_INTERVALS.analytics,
    immediate: true,
    dependencies: [timeframe]
  });
}

/**
 * Hook for polling user profile
 */
export function useUserProfilePolling(enabled = true) {
  return usePolling('/user/profile', {
    enabled,
    interval: POLLING_INTERVALS.userProfile,
    immediate: false // Don't immediately load on mount for profile
  });
}
