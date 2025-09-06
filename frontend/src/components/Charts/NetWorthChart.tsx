import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

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
      {/* Simplified Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Net Worth Trend
        </h3>
        {data.length === 0 && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Track your financial progress over time
          </p>
        )}
      </div>

      {/* Chart Container with Embedded Controls */}
      <div className="relative">
        {data.length > 0 ? (
          <>
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
                  tickFormatter={(value) => value === 0 ? '' : formatCurrency(value)}
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
            
            {/* Time Period Selector - Positioned at bottom-center */}
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 shadow-sm">
                {timePeriods.map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setSelectedPeriod(period.value)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
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
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16" style={{ height: height }}>
            <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Net Worth Yet
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              Add your transactions and investments to start tracking your net worth over time. 
              Your financial journey begins here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetWorthChart;