import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Clock, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { apiService } from '../../services/enhancedApi';
import { NewsArticle, NewsResponse } from '../../types';

interface MarketNewsWidgetProps {
  symbols?: string[]; // If provided, show symbol-specific news
  limit?: number;
  refreshInterval?: number; // in milliseconds
  className?: string;
}

const MarketNewsWidget: React.FC<MarketNewsWidgetProps> = ({
  symbols = [],
  limit = 10,
  refreshInterval = 300000, // 5 minutes
  className = ''
}) => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsSource, setNewsSource] = useState<string>('');
  const [rateLimitInfo, setRateLimitInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadNews();
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      if (!loading) {
        loadNews(true); // Silent refresh
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [symbols, limit, refreshInterval]);

  const loadNews = async (silent = false) => {
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
        newsData = await apiService.getMarketNews('financial markets technology', limit);
      }

      setNews(newsData.articles || []);
      setNewsSource(newsData.source || 'Unknown');
      setRateLimitInfo(newsData.rateLimitInfo);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('Error loading market news:', error);
      setError(error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    loadNews();
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'border-l-green-500';
      case 'negative':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const formatTimeAgo = (publishedAt: string) => {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffInMinutes = Math.floor((now.getTime() - published.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Newspaper className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {symbols.length > 0 ? `News for ${symbols.join(', ')}` : 'Market News'}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* News Source */}
            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {newsSource}
            </span>
            
            {/* Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Refresh news"
            >
              <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Rate Limit Info */}
        {rateLimitInfo && (
          <div className="mt-2 text-xs text-gray-500">
            {rateLimitInfo.provider} • {rateLimitInfo.remaining} requests remaining
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && news.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <div className="text-red-500 mb-2">Failed to load news</div>
            <div className="text-xs text-gray-500 mb-4">{error}</div>
            <button
              onClick={handleManualRefresh}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-6">
            <Newspaper className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <div className="text-gray-500">No news available</div>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((article, index) => (
              <div
                key={article.id || index}
                className={`border-l-4 pl-4 pb-4 ${getSentimentColor(article.sentiment)} ${
                  index < news.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {getSentimentIcon(article.sentiment)}
                      <span className="text-xs text-gray-500">
                        {article.source}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(article.publishedAt)}
                      </span>
                    </div>
                    
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1 leading-snug">
                      {truncateText(article.title, 100)}
                    </h4>
                    
                    {article.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {truncateText(article.description, 150)}
                      </p>
                    )}
                  </div>
                  
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Read full article"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {lastUpdate && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Updated {formatTimeAgo(lastUpdate.toISOString())}</span>
            </div>
            
            {news.length > 0 && (
              <span>{news.length} articles</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketNewsWidget;
