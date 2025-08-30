import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Bar,
} from 'recharts';
import { 
  TrendingUp, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2
} from 'lucide-react';
import { apiService } from '../../services/api';

interface NetWorthData {
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  investments: number;
  cash: number;
}

interface NetWorthTrendProps {
  currency?: string;
  height?: number;
}

const timePeriods = [
  { label: '1M', value: '1M', days: 30 },
  { label: '3M', value: '3M', days: 90 },
  { label: '6M', value: '6M', days: 180 },
  { label: '1Y', value: '1Y', days: 365 },
  { label: 'All', value: 'ALL', days: 0 },
];

const NetWorthTrend: React.FC<NetWorthTrendProps> = ({
  currency = 'USD',
  height = 320,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('6M');
  const [viewMode, setViewMode] = useState<'trend' | 'breakdown'>('trend');
  const [data, setData] = useState<NetWorthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert period labels to API format
  const getPeriodValue = (period: string) => {
    switch (period) {
      case '1M': return '1m';
      case '3M': return '3m';
      case '6M': return '6m';
      case '1Y': return '1y';
      case 'ALL': return 'all';
      default: return '6m';
    }
  };

  // Fetch net worth trend data
  useEffect(() => {
    const fetchNetWorthData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getNetWorthTrend(
          getPeriodValue(selectedPeriod),
          'weekly'
        );
        
        if (response.success && response.data?.trend) {
          setData(response.data.trend);
        } else {
          setError('Failed to load net worth data');
        }
      } catch (err) {
        console.error('Error fetching net worth data:', err);
        setError('Failed to load net worth data');
      } finally {
        setLoading(false);
      }
    };

    fetchNetWorthData();
  }, [selectedPeriod]);

  // Filter data based on selected period
  const filteredData = useMemo(() => {
    if (selectedPeriod === 'ALL' || data.length === 0) return data;
    
    const selectedPeriodData = timePeriods.find(p => p.value === selectedPeriod);
    const daysBack = selectedPeriodData?.days || 180;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    return data.filter((item: NetWorthData) => new Date(item.date) >= cutoffDate);
  }, [data, selectedPeriod]);

  // Calculate trend metrics
  const trendMetrics = useMemo(() => {
    if (filteredData.length < 2) {
      return {
        change: 0,
        changePercent: 0,
        trend: 'neutral' as const,
        current: filteredData[filteredData.length - 1]?.netWorth || 0,
        previous: 0,
        highestPoint: 0,
        lowestPoint: 0,
        volatility: 0,
      };
    }

    const current = filteredData[filteredData.length - 1].netWorth;
    const previous = filteredData[0].netWorth;
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;
    
    const values = filteredData.map((d: NetWorthData) => d.netWorth);
    const highestPoint = Math.max(...values);
    const lowestPoint = Math.min(...values);
    
    // Calculate volatility (standard deviation)
    const mean = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
    const variance = values.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    return {
      change,
      changePercent,
      trend: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
      current,
      previous,
      highestPoint,
      lowestPoint,
      volatility,
    };
  }, [filteredData]);

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: selectedPeriod === '1Y' || selectedPeriod === 'ALL' ? 'numeric' : undefined
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {formatDate(label)}
          </p>
          {viewMode === 'trend' ? (
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatValue(data.netWorth)}
            </p>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Net Worth:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatValue(data.netWorth)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-600">Assets:</span>
                <span className="font-medium text-emerald-600">
                  {formatValue(data.assets)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-600">Investments:</span>
                <span className="font-medium text-purple-600">
                  {formatValue(data.investments)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-600">Cash:</span>
                <span className="font-medium text-blue-600">
                  {formatValue(data.cash)}
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const getTrendIcon = () => {
    switch (trendMetrics.trend) {
      case 'up':
        return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
      case 'down':
        return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trendMetrics.trend) {
      case 'up':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Net Worth Trend
          </h3>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {trendMetrics.changePercent >= 0 ? '+' : ''}
              {trendMetrics.changePercent.toFixed(1)}% ({formatValue(trendMetrics.change)})
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              vs {selectedPeriod === 'ALL' ? 'start' : selectedPeriod.toLowerCase() + ' ago'}
            </span>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('trend')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'trend'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <TrendingUp className="w-3 h-3 mr-1 inline" />
              Trend
            </button>
            <button
              onClick={() => setViewMode('breakdown')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'breakdown'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <BarChart3 className="w-3 h-3 mr-1 inline" />
              Breakdown
            </button>
          </div>
        </div>
      </div>

      {/* Time Period Selector */}
      <div className="flex gap-1 mb-4">
        {timePeriods.map((period) => (
          <button
            key={period.value}
            onClick={() => setSelectedPeriod(period.value)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              selectedPeriod === period.value
                ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-8 h-8 mb-3 animate-spin" />
          <p className="text-lg font-medium">Loading Net Worth Data...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-80 text-gray-500 dark:text-gray-400">
          <TrendingUp className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-lg font-medium">Unable to Load Data</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      ) : filteredData.length > 0 ? (
        <div className="relative">
          <ResponsiveContainer width="100%" height={height}>
            {viewMode === 'trend' ? (
              <AreaChart data={filteredData} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatDate}
                />
                
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatValue(value).replace(/,/g, '')}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fill="url(#netWorthGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#7c3aed" }}
                />
              </AreaChart>
            ) : (
              <ComposedChart data={filteredData} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatDate}
                />
                
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatValue(value).replace(/,/g, '')}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Bar dataKey="assets" stackId="a" fill="#10b981" />
                <Bar dataKey="investments" stackId="a" fill="#7c3aed" />
                <Bar dataKey="cash" stackId="a" fill="#3b82f6" />
                
                <Line 
                  type="monotone" 
                  dataKey="netWorth" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-80 text-gray-500 dark:text-gray-400">
          <TrendingUp className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-lg font-medium">No Data Available</p>
          <p className="text-sm">Start tracking your finances to see trends</p>
        </div>
      )}

      {/* Summary Stats */}
      {!loading && !error && filteredData.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatValue(trendMetrics.current)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Peak</p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {formatValue(trendMetrics.highestPoint)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Low</p>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">
              {formatValue(trendMetrics.lowestPoint)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Volatility</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatValue(trendMetrics.volatility)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetWorthTrend;
