import React, { memo } from 'react';
import { Newspaper, ExternalLink, Clock, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useNewsPolling } from '../../hooks/usePolling';

interface MarketNewsWidgetProps {
  symbols?: string[]; // If provided, show symbol-specific news
  limit?: number;
  className?: string;
}

const MarketNewsWidget: React.FC<MarketNewsWidgetProps> = ({
  symbols = [],
  limit = 3, // Changed from 10 to 3 for most important news only
  className = ''
}) => {
  // Use polling hook for news data (10 minutes interval)
  const { 
    data: newsData, 
    isLoading: loading, 
    error, 
    lastUpdated: lastUpdate, 
    refresh: refetch 
  } = useNewsPolling(symbols, true);

  // Debug logging
  console.log('🗞️ News polling data:', { newsData, symbols, enabled: true });

  const news = newsData?.data?.articles || newsData?.articles || [];
  const newsSource = newsData?.data?.source || newsData?.source || 'Unknown';
  const rateLimitInfo = newsData?.data?.rateLimitInfo || newsData?.rateLimitInfo;

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
              onClick={refetch}
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
            <div className="text-xs text-gray-500 mb-4">{error.message}</div>
            <button
              onClick={refetch}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <Newspaper className="w-12 h-12 mx-auto" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Market News
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No news articles available at the moment
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Check back later for the latest market updates and news.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.slice(0, limit).map((article: any, index: number) => (
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

export default memo(MarketNewsWidget);
