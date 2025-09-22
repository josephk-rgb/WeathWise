import React, { useState, useEffect, memo } from 'react';
import { Shield, BarChart3, RefreshCw } from 'lucide-react';
import { apiService } from '../../services/api';
import { AdvancedPortfolioAnalytics } from '../../types';

interface AdvancedAnalyticsProps {
  className?: string;
}

const AdvancedAnalyticsComponent: React.FC<AdvancedAnalyticsProps> = ({ className = '' }) => {
  const [analytics, setAnalytics] = useState<AdvancedPortfolioAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiService.getAdvancedPortfolioAnalytics();
      setAnalytics(data);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('Error loading advanced analytics:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatRiskLevel = (level: string) => {
    const colors = {
      low: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      high: 'text-red-600 bg-red-100'
    };
    return colors[level as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Unable to Load Analytics
          </h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Check if we have any meaningful portfolio data
  const hasPortfolioData = analytics?.portfolioMetrics || (analytics?.individualAssets && analytics.individualAssets.length > 0);

  if (!hasPortfolioData) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Advanced Portfolio Analytics
            </h3>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="w-12 h-12 mx-auto" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Portfolio Analytics Available
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              You need investments to see advanced analytics
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Add some investments to see risk metrics, correlation analysis, and performance insights.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Safely map data into minimal structure used by compact UI
  const portfolioMetrics = analytics?.portfolioMetrics || {
    beta: 0,
    volatility: 0,
    sharpeRatio: 0,
    valueAtRisk: 0,
    correlation: 0
  };

  const riskLevel = (() => {
    const level = analytics?.riskAnalysis?.overall;
    return level && ['low', 'medium', 'high'].includes(level) ? level : 'low';
  })();

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Portfolio Analytics
            </h3>
          </div>
          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Beta</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{portfolioMetrics.beta?.toFixed(2) || 'N/A'}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Volatility</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{portfolioMetrics.volatility?.toFixed(1) || 'N/A'}%</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Sharpe</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{portfolioMetrics.sharpeRatio?.toFixed(2) || 'N/A'}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Overall Risk</span>
              <Shield className="h-4 w-4 text-gray-500" />
            </div>
            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${formatRiskLevel(riskLevel)}`}>
              {riskLevel.toUpperCase()}
            </div>
          </div>
        </div>

        {lastUpdate && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Data powered by Yahoo Finance</span>
              <span>Updated {lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(AdvancedAnalyticsComponent);
