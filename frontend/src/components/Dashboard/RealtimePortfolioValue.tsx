import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Clock, Signal, Wifi, WifiOff, PieChart } from 'lucide-react';
import { usePortfolioPolling } from '../../hooks/usePolling';
import { useAuth } from '../../hooks/useAuth';
import { RealtimePortfolioValue, Investment } from '../../types';
import { formatCurrency } from '../../utils/currency';

interface RealtimePortfolioValueProps {
  investments: Investment[];
  currency: string;
}

const RealtimePortfolioValueComponent: React.FC<RealtimePortfolioValueProps> = ({
  investments,
  currency
}) => {
  // Get authentication state
  const { isAuthenticated, tokenReady } = useAuth();
  
  // Calculate static value function - memoized to avoid infinite loops
  const calculateStaticValue = useCallback(() => {
    let totalValue = 0;
    let totalCost = 0;

    investments.forEach(investment => {
      const value = investment.shares * investment.currentPrice;
      const cost = investment.shares * investment.purchasePrice;
      
      totalValue += value;
      totalCost += cost;
    });

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      investmentCount: investments.length,
      lastUpdated: new Date()
    };
  }, [investments]);

  // Use the polling hook for real-time data - only when authenticated and token is ready
  const { 
    data: portfolioValue, 
    error: pollingError, 
    isLoading, 
    lastUpdated, 
    refresh 
  } = usePortfolioPolling(investments.length > 0 && isAuthenticated && tokenReady);

  const [fallbackValue, setFallbackValue] = useState<RealtimePortfolioValue | null>(null);

  // Calculate fallback value when polling fails or no data available
  useEffect(() => {
    if (investments.length > 0 && (!portfolioValue || pollingError)) {
      const fallback = calculateStaticValue();
      setFallbackValue(fallback);
    }
  }, [investments, portfolioValue, pollingError, calculateStaticValue]);

  // Also calculate fallback when we have investments but no polling data (even without error)
  useEffect(() => {
    if (investments.length > 0 && !portfolioValue && !pollingError && !fallbackValue) {
      const fallback = calculateStaticValue();
      setFallbackValue(fallback);
    }
  }, [investments, portfolioValue, pollingError, fallbackValue, calculateStaticValue]);

  // Extract data from API response format
  const extractedPortfolioValue = portfolioValue?.data || portfolioValue;
  
  // Use polling data or fallback
  const displayValue = extractedPortfolioValue || fallbackValue;
  const hasError = !!pollingError;
  const isRealtime = !!extractedPortfolioValue && !pollingError;

  // Debug logging to track value changes
  console.log('=== REALTIME PORTFOLIO VALUE DEBUG ===');
  console.log('Auth state - isAuthenticated:', isAuthenticated, 'tokenReady:', tokenReady);
  console.log('Polling enabled:', investments.length > 0 && isAuthenticated && tokenReady);
  console.log('Polling data:', extractedPortfolioValue);
  console.log('Polling error:', pollingError);
  console.log('Fallback value:', fallbackValue);
  console.log('Display value:', displayValue);
  console.log('Is realtime:', isRealtime);
  console.log('Has error:', hasError);
  console.log('Investments count:', investments.length);
  console.log('Should calculate fallback:', investments.length > 0 && (!portfolioValue || pollingError));
  if (investments.length > 0) {
    const fallbackCalc = calculateStaticValue();
    console.log('Fallback calculation:', fallbackCalc);
  }
  console.log('=== END REALTIME PORTFOLIO DEBUG ===');

  const handleManualRefresh = () => {
    refresh();
  };

  const getConnectionStatus = () => {
    if (isLoading) return { icon: RefreshCw, color: 'text-blue-500', label: 'Updating...' };
    if (hasError) return { icon: WifiOff, color: 'text-red-500', label: 'Offline' };
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

  // No investments state
  if (investments.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <PieChart className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Portfolio Data
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            You haven't added any investments yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Add some investments to see your real-time portfolio value and performance.
          </p>
        </div>
      </div>
    );
  }

  if (!displayValue || displayValue.totalValue === undefined || displayValue.totalValue === null) {
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

  const isPositive = (displayValue.totalGainLoss ?? 0) >= 0;
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
            <StatusIcon className={`h-4 w-4 ${status.color} ${isLoading ? 'animate-spin' : ''}`} />
            <span className={`text-xs ${status.color}`}>{status.label}</span>
          </div>
          
          {/* Manual Refresh - Only show when not loading */}
          {!isLoading && (
            <button
              onClick={handleManualRefresh}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Refresh portfolio value"
            >
              <RefreshCw className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Main Value */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {formatCurrency(displayValue.totalValue, currency)}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="font-medium">
              {formatCurrency(Math.abs(displayValue.totalGainLoss ?? 0), currency)}
            </span>
            <span className="text-sm">
              ({isPositive ? '+' : ''}{(displayValue.totalGainLossPercent ?? 0).toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(displayValue.totalCost ?? 0, currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Holdings</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {displayValue.investmentCount ?? 0} assets
          </p>
        </div>
      </div>

      {/* Last Update */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>
            {lastUpdated ? formatTimeSince(lastUpdated) : 'Never updated'}
          </span>
        </div>
        
        {hasError && (
          <span className="text-red-500 text-xs">
            {pollingError?.message || 'Connection error'}
          </span>
        )}
      </div>

      {/* Real-time Indicator */}
      {isRealtime && (
        <div className="mt-3 flex items-center space-x-1 text-xs text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Real-time data with smart polling</span>
        </div>
      )}
    </div>
  );
};

export default RealtimePortfolioValueComponent;
