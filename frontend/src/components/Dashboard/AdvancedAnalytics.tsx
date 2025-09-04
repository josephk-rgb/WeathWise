import React, { useState, useEffect, memo } from 'react';
import { TrendingUp, Target, Shield, PieChart, BarChart3, AlertTriangle, RefreshCw } from 'lucide-react';
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
      console.log('🔍 Raw analytics data received:', data);
      console.log('🔍 Data type:', typeof data);
      console.log('🔍 Data keys:', data ? Object.keys(data) : 'null/undefined');
      console.log('🔍 portfolioMetrics exists?', data?.portfolioMetrics);
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

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <Shield className="h-4 w-4" />;
      case 'medium': return <Target className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
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

  // Add debugging and defensive programming
  console.log('🔍 Analytics in render:', analytics);
  
  // Safely destructure with defaults
  const { 
    portfolioMetrics = { 
      beta: 0, 
      volatility: 0, 
      sharpeRatio: 0, 
      valueAtRisk: 0, 
      correlation: 0 
    }, 
    individualAssets = [], 
    composition = [], 
    riskAnalysis = { 
      overall: 'low' as const, 
      diversification: 0, 
      concentration: 0 
    } 
  } = analytics || {};

  console.log('🔍 portfolioMetrics after destructuring:', portfolioMetrics);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Advanced Portfolio Analytics
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
        <p className="text-sm text-gray-500 mt-1">
          Real-time risk metrics powered by Yahoo Finance
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Portfolio Risk Metrics */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Risk Metrics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Beta</span>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {portfolioMetrics.beta?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                vs S&P 500
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Volatility</span>
                <BarChart3 className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {portfolioMetrics.volatility?.toFixed(1) || 'N/A'}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                30-day rolling
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Sharpe Ratio</span>
                <Target className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {portfolioMetrics.sharpeRatio?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Risk-adjusted return
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Value at Risk</span>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {portfolioMetrics.valueAtRisk?.toFixed(1) || 'N/A'}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                95% confidence
              </div>
            </div>
          </div>
        </div>

        {/* Risk Analysis Summary */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Risk Analysis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {getRiskIcon(riskAnalysis.overall)}
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Overall Risk
                </span>
              </div>
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${formatRiskLevel(riskAnalysis.overall)}`}>
                {riskAnalysis.overall.toUpperCase()}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <PieChart className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Diversification
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(riskAnalysis.diversification)}%
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Concentration
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(riskAnalysis.concentration)}%
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Composition */}
        {composition && composition.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Asset Allocation
            </h4>
            <div className="space-y-3">
              {composition.map((asset, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" style={{
                      backgroundColor: `hsl(${index * 137.5 % 360}, 70%, 50%)`
                    }}></div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {asset.type}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      ${asset.value.toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {asset.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Asset Risk */}
        {individualAssets && individualAssets.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Individual Asset Risk
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Weight
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Beta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Volatility
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Sharpe Ratio
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {individualAssets.slice(0, 5).map((asset, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {asset.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {(asset.weight * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {asset.analytics.beta?.toFixed(2) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {asset.analytics.volatility?.toFixed(1) || 'N/A'}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {asset.analytics.sharpeRatio?.toFixed(2) || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        {lastUpdate && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                Data powered by Yahoo Finance
              </span>
              <span>
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(AdvancedAnalyticsComponent);
