import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Clock, Signal, Wifi, WifiOff } from 'lucide-react';
import { apiService } from '../../services/api';
import { RealtimePortfolioValue, Investment } from '../../types';
import { formatCurrency } from '../../utils/currency';

interface RealtimePortfolioValueProps {
  investments: Investment[];
  currency: string;
  refreshInterval?: number; // in milliseconds, default 30 seconds
}

const RealtimePortfolioValueComponent: React.FC<RealtimePortfolioValueProps> = ({
  investments,
  currency,
  refreshInterval = 30000
}) => {
  const [portfolioValue, setPortfolioValue] = useState<RealtimePortfolioValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);

  // Auto-refresh portfolio value
  useEffect(() => {
    if (investments.length === 0) return;

    loadRealtimeValue();
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      if (!loading) {
        loadRealtimeValue(true); // Silent refresh
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [investments, refreshInterval]);

  const loadRealtimeValue = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const realtimeData = await apiService.getRealtimePortfolioValue();
      setPortfolioValue(realtimeData);
      setLastUpdate(new Date());
      setIsRealtime(true);
    } catch (error: any) {
      console.error('Error loading realtime portfolio value:', error);
      setError(error.message);
      setIsRealtime(false);
      
      // Fallback to static calculation
      const fallbackValue = calculateStaticValue();
      setPortfolioValue(fallbackValue);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const calculateStaticValue = (): RealtimePortfolioValue => {
    let totalValue = 0;
    let totalCost = 0;

    const marketData = investments.map(investment => {
      const value = investment.shares * investment.currentPrice;
      const cost = investment.shares * investment.purchasePrice;
      
      totalValue += value;
      totalCost += cost;
      
      return {
        ...investment,
        currentPrice: investment.currentPrice,
        value,
        cost,
        gainLoss: value - cost,
        gainLossPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
        marketData: {
          symbol: investment.symbol,
          name: investment.name,
          currentPrice: investment.currentPrice,
          change: 0,
          changePercent: 0,
          volume: 0,
          high: investment.currentPrice,
          low: investment.currentPrice,
          open: investment.currentPrice,
          previousClose: investment.currentPrice,
          lastUpdated: new Date()
        }
      };
    });

    return {
      totalValue,
      totalCost,
      totalGainLoss: totalValue - totalCost,
      totalGainLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      lastUpdated: new Date(),
      marketData
    };
  };

  const handleManualRefresh = () => {
    loadRealtimeValue();
  };

  const getConnectionStatus = () => {
    if (loading) return { icon: RefreshCw, color: 'text-blue-500', label: 'Updating...' };
    if (error) return { icon: WifiOff, color: 'text-red-500', label: 'Offline' };
    if (isRealtime) return { icon: Wifi, color: 'text-green-500', label: 'Live' };
    return { icon: Signal, color: 'text-yellow-500', label: 'Static' };
  };

  const formatTimeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (!portfolioValue) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  const isPositive = portfolioValue.totalGainLoss >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Portfolio Value
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          <div className="flex items-center space-x-1">
            <StatusIcon className={`h-4 w-4 ${status.color} ${loading ? 'animate-spin' : ''}`} />
            <span className={`text-xs ${status.color}`}>{status.label}</span>
          </div>
          
          {/* Manual Refresh */}
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh portfolio value"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Value */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {formatCurrency(portfolioValue.totalValue, currency)}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="font-medium">
              {formatCurrency(Math.abs(portfolioValue.totalGainLoss), currency)}
            </span>
            <span className="text-sm">
              ({isPositive ? '+' : ''}{portfolioValue.totalGainLossPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(portfolioValue.totalCost, currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Holdings</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {portfolioValue.marketData.length} assets
          </p>
        </div>
      </div>

      {/* Last Update */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>
            {lastUpdate ? formatTimeSince(lastUpdate) : 'Never updated'}
          </span>
        </div>
        
        {error && (
          <span className="text-red-500 text-xs">
            {error}
          </span>
        )}
      </div>

      {/* Real-time Indicator */}
      {isRealtime && (
        <div className="mt-3 flex items-center space-x-1 text-xs text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Real-time data from Yahoo Finance</span>
        </div>
      )}
    </div>
  );
};

export default RealtimePortfolioValueComponent;
