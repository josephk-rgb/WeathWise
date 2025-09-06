import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiService } from '../services/api';
import { NewsResponse } from '../types';

interface UseNewsOptions {
  symbols?: string[];
  limit?: number;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseNewsResult {
  data: NewsResponse | undefined;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refetch: () => void;
}

export const useNews = ({
  symbols = [],
  limit = 10,
  refreshInterval = 300000, // 5 minutes
  enabled = true
}: UseNewsOptions = {}): UseNewsResult => {
  const [data, setData] = useState<NewsResponse | undefined>();
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize symbols array to prevent unnecessary re-renders
  const stableSymbols = useMemo(() => symbols.sort().join(','), [symbols]);

  const fetchNews = useCallback(async (silent = false) => {
    if (!enabled || !mountedRef.current) return;
    
    if (!silent) setLoading(true);
    setError(null);

    try {
      let newsData: NewsResponse;
      
      if (symbols.length > 0) {
        // Get news for specific symbols
        const symbolNews = await Promise.all(
          symbols.slice(0, 3).map(symbol => // Limit to first 3 symbols to avoid rate limits
            apiService.getSymbolNews(symbol, Math.ceil(limit / symbols.length))
          )
        );
        
        // Combine and deduplicate news from multiple symbols
        const allArticles = symbolNews.flatMap(response => response.articles || []);
        const uniqueArticles = allArticles.filter((article, index, self) =>
          index === self.findIndex(a => a.url === article.url)
        );
        
        newsData = {
          articles: uniqueArticles.slice(0, limit),
          source: symbolNews[0]?.source || 'Mixed Sources',
          rateLimitInfo: symbolNews[0]?.rateLimitInfo || null
        };
      } else {
        // Get general market news
        newsData = await apiService.getFinancialNews(limit);
      }

      if (!mountedRef.current) return;

      setData(newsData);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('Error loading market news:', error);
      if (mountedRef.current) {
        setError(error.message);
      }
    } finally {
      if (!silent && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [stableSymbols, limit, enabled]); // Use stable symbols string instead of array

  // Manual refetch function
  const refetch = useCallback(() => {
    fetchNews();
  }, [fetchNews]);

  useEffect(() => {
    if (!enabled) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Load initial data
    fetchNews();
    
    // Set up auto-refresh interval
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (!loading && mountedRef.current) {
          fetchNews(true); // Silent refresh
        }
      }, refreshInterval);
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchNews, refreshInterval, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdate,
    refetch
  };
};

export default useNews;
