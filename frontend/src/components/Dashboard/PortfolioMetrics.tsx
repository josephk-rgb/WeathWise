import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Investment } from '../../types';
import { formatCurrency } from '../../utils/currency';

interface PortfolioMetricsProps {
  investments: Investment[];
  currency: string;
}

const PortfolioMetrics: React.FC<PortfolioMetricsProps> = ({
  investments,
  currency,
}) => {
  const calculateMetrics = () => {
    const totalValue = investments.reduce((sum, inv) => sum + (inv.shares * inv.currentPrice), 0);
    const totalCost = investments.reduce((sum, inv) => sum + (inv.shares * inv.purchasePrice), 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    // Enhanced debug logging
    console.log('=== PORTFOLIO METRICS FRONTEND DEBUG ===');
    console.log('Investments count:', investments.length);
    console.log('Total value:', totalValue);
    console.log('Total cost:', totalCost);
    console.log('Total gain/loss:', totalGainLoss);
    console.log('Total gain/loss %:', totalGainLossPercent);
    console.log('Individual investments breakdown:');
    investments.forEach(inv => {
      const currentValue = inv.shares * inv.currentPrice;
      const costBasis = inv.shares * inv.purchasePrice;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
      console.log(`  ${inv.symbol}: ${inv.shares} shares × $${inv.currentPrice} = $${currentValue.toFixed(2)} (Cost: $${costBasis.toFixed(2)}, Gain: $${gainLoss.toFixed(2)} (${gainLossPercent.toFixed(2)}%))`);
    });
    console.log('=== END PORTFOLIO METRICS DEBUG ===');

    // Calculate best and worst performers
    const performers = investments.map(inv => {
      const returnPercent = ((inv.currentPrice - inv.purchasePrice) / inv.purchasePrice) * 100;
      return { symbol: inv.symbol, returnPercent, name: inv.name };
    }).sort((a, b) => b.returnPercent - a.returnPercent);

    const bestPerformer = performers[0];
    const worstPerformer = performers[performers.length - 1];

    // Calculate diversification score
    const allocation = investments.reduce((acc, inv) => {
      const value = inv.shares * inv.currentPrice;
      acc[inv.type] = (acc[inv.type] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    const assetTypes = Object.keys(allocation).length;
    const diversificationScore = Math.min(100, assetTypes * 20 + (investments.length * 5));

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      bestPerformer,
      worstPerformer,
      diversificationScore,
      assetTypes,
      investmentCount: investments.length,
    };
  };

  const metrics = calculateMetrics();
  const isPositive = metrics.totalGainLoss >= 0;

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color = 'blue',
    trend,
    trendValue 
  }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: any;
    color?: string;
    trend?: 'up' | 'down';
    trendValue?: string;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center space-x-1 text-sm font-medium ${
              trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {trend === 'up' ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Total Portfolio Value"
        value={formatCurrency(metrics.totalValue, currency)}
        subtitle={`${metrics.investmentCount} investments`}
        icon={DollarSign}
        color="blue"
        trend={isPositive ? 'up' : 'down'}
        trendValue={`${metrics.totalGainLossPercent >= 0 ? '+' : ''}${metrics.totalGainLossPercent.toFixed(2)}%`}
      />

      <MetricCard
        title="Total Gain/Loss"
        value={`${isPositive ? '+' : ''}${formatCurrency(metrics.totalGainLoss, currency)}`}
        subtitle={`${metrics.totalGainLossPercent >= 0 ? '+' : ''}${metrics.totalGainLossPercent.toFixed(2)}% return`}
        icon={isPositive ? TrendingUp : TrendingDown}
        color={isPositive ? 'green' : 'red'}
      />

      <MetricCard
        title="Best Performer"
        value={metrics.bestPerformer ? metrics.bestPerformer.symbol : 'N/A'}
        subtitle={metrics.bestPerformer ? `${metrics.bestPerformer.returnPercent >= 0 ? '+' : ''}${metrics.bestPerformer.returnPercent.toFixed(1)}%` : 'No investments'}
        icon={Target}
        color="green"
      />

      <MetricCard
        title="Diversification Score"
        value={`${metrics.diversificationScore}/100`}
        subtitle={`${metrics.assetTypes} asset types`}
        icon={PieChart}
        color="purple"
      />
    </div>
  );
};

export default PortfolioMetrics;
