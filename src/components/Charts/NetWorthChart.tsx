import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown } from 'lucide-react';

interface NetWorthChartProps {
  data: any[];
  height?: number;
  currency?: string;
}

const timePeriods = [
  { label: '1M', value: '1M', months: 1 },
  { label: '3M', value: '3M', months: 3 },
  { label: '6M', value: '6M', months: 6 },
  { label: '1Y', value: '1Y', months: 12 },
  { label: 'All', value: 'ALL', months: 0 },
];

const NetWorthChart: React.FC<NetWorthChartProps> = ({
  data,
  height = 400,
  currency = 'USD',
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('6M');

  // Calculate performance metrics
  const currentValue = data[data.length - 1]?.value || 0;
  const startValue = data[0]?.value || 0;
  const totalGrowth = currentValue - startValue;
  const growthPercent = startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0;
  const isPositive = totalGrowth >= 0;

  // Filter data based on selected period
  const selectedPeriodData = timePeriods.find(p => p.value === selectedPeriod);
  const filteredData = selectedPeriod === 'ALL' 
    ? data 
    : data.slice(-(selectedPeriodData?.months || data.length));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Enhanced Header with Better Hierarchy */}
      <div className="mb-8">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Net Worth Trend
          </h3>
          
          {/* Time Period Selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {timePeriods.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                  selectedPeriod === period.value
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="flex items-baseline space-x-6">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Current Net Worth</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(currentValue)}
            </p>
          </div>
          
          <div className="flex items-baseline space-x-2">
            <span className={`text-lg font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositive ? '+' : ''}{formatCurrency(totalGrowth)}
            </span>
            <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              ({isPositive ? '+' : ''}{growthPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative px-4">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={filteredData} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.12}/>
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            
            <XAxis 
              dataKey="month" 
              stroke="#9ca3af"
              fontSize={13}
              fontWeight={500}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            
            <YAxis 
              stroke="#9ca3af"
              fontSize={13}
              fontWeight={500}
              tickFormatter={(value) => formatCurrency(value)}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Area
              type="monotone"
              dataKey="value"
              stroke="#7c3aed"
              strokeWidth={3}
              fill="url(#netWorthGradient)"
              dot={false}
              activeDot={{ 
                r: 6, 
                stroke: "#7c3aed", 
                strokeWidth: 3,
                fill: "white"
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Enhanced Performance Indicator */}
        <div className="absolute top-6 right-6">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-semibold shadow-sm ${
            isPositive 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{isPositive ? 'Growing' : 'Declining'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetWorthChart;