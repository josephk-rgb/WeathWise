import React, { useState } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface PortfolioGrowthChartProps {
  data: any[];
  height?: number;
  currency: string;
}

const timePeriods = [
  { label: '1M', value: '1M', days: 30 },
  { label: '3M', value: '3M', days: 90 },
  { label: '6M', value: '6M', days: 180 },
  { label: '1Y', value: '1Y', days: 365 },
  { label: 'All', value: 'ALL', days: 0 },
];

const PortfolioGrowthChart: React.FC<PortfolioGrowthChartProps> = ({
  data,
  height = 400,
  currency,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');

  // Calculate performance metrics
  const currentValue = data[data.length - 1]?.value || 0;
  const startValue = data[0]?.value || 0;
  const totalReturn = currentValue - startValue;
  const totalReturnPercent = startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0;
  const isPositive = totalReturn >= 0;

  // Filter data based on selected period
  const selectedPeriodConfig = timePeriods.find(p => p.value === selectedPeriod);
  const filteredData = selectedPeriod === 'ALL' 
    ? data 
    : data.slice(-(selectedPeriodConfig?.days || data.length));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Improved date formatting based on selected period
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    switch (selectedPeriod) {
      case '1M':
        // For 1 month, show day and month
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case '3M':
        // For 3 months, show month and day
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case '6M':
        // For 6 months, show month and year
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          year: '2-digit' 
        });
      case '1Y':
        // For 1 year, show month and year
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          year: '2-digit' 
        });
      case 'ALL':
        // For all time, show month and year
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          year: '2-digit' 
        });
      default:
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Portfolio Growth
          </h3>
          {data.length > 0 ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Return:</span>
                <span className={`text-lg font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatCurrency(totalReturn)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Return %:</span>
                <span className={`text-lg font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{totalReturnPercent.toFixed(2)}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Add investments to track your portfolio performance
            </p>
          )}
        </div>
        
        {/* Time Period Selector - Only show when there's data */}
        {data.length > 0 && (
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mt-4 sm:mt-0">
            {timePeriods.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart or No Data State */}
      <div className="relative">
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                {/* Removed CartesianGrid for cleaner look */}
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={11}
                  tickFormatter={formatDate}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => value === 0 ? '' : formatCurrency(value)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={isPositive ? "#10b981" : "#ef4444"}
                  strokeWidth={3}
                  fill="url(#portfolioGradient)"
                  dot={false}
                  activeDot={{ 
                    r: 6, 
                    stroke: isPositive ? "#10b981" : "#ef4444", 
                    strokeWidth: 2,
                    fill: "white",
                    strokeDasharray: "0"
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
            
            {/* Performance Indicator */}
            <div className="absolute top-4 right-4 flex items-center space-x-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
              <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? 'Growing' : 'Declining'}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16" style={{ height: height }}>
            <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Portfolio Data
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              Start tracking your portfolio performance by adding your first investment. 
              Your growth chart will appear here once you have investment data.
            </p>
          </div>
        )}
      </div>

      {/* Current Value Display - Only show when there's data */}
      {data.length > 0 && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-lg">
            <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(currentValue)}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Value</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioGrowthChart;
