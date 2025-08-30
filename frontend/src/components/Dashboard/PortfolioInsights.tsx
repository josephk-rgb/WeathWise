import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, BarChart3 } from 'lucide-react';
import { Investment } from '../../types';

interface PortfolioInsightsProps {
  investments: Investment[];
  currency: string;
}

const PortfolioInsights: React.FC<PortfolioInsightsProps> = ({
  investments,
  currency,
}) => {
  const calculateInsights = () => {
    if (investments.length === 0) return [];

    const totalValue = investments.reduce((sum, inv) => sum + (inv.shares * inv.currentPrice), 0);
    const totalCost = investments.reduce((sum, inv) => sum + (inv.shares * inv.purchasePrice), 0);
    const totalReturn = totalValue - totalCost;
    const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

    // Asset allocation
    const allocation = investments.reduce((acc, inv) => {
      const value = inv.shares * inv.currentPrice;
      acc[inv.type] = (acc[inv.type] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    const insights = [];

    // Performance insights
    if (totalReturnPercent > 10) {
      insights.push({
        type: 'positive',
        icon: TrendingUp,
        title: 'Strong Performance',
        description: `Your portfolio is performing well with a ${totalReturnPercent.toFixed(1)}% return. Consider rebalancing to lock in gains.`,
        action: 'Review allocation',
      });
    } else if (totalReturnPercent < -5) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Portfolio Decline',
        description: `Your portfolio is down ${Math.abs(totalReturnPercent).toFixed(1)}%. Consider dollar-cost averaging or reviewing your strategy.`,
        action: 'Consider buying more',
      });
    }

    // Diversification insights
    const assetTypes = Object.keys(allocation);
    if (assetTypes.length < 3) {
      insights.push({
        type: 'info',
        icon: Lightbulb,
        title: 'Low Diversification',
        description: 'Your portfolio has limited asset types. Consider adding different investment categories for better risk management.',
        action: 'Explore new assets',
      });
    }

    // Concentration risk
    const largestHolding = investments.reduce((max, inv) => {
      const value = inv.shares * inv.currentPrice;
      return value > max.value ? { symbol: inv.symbol, value } : max;
    }, { symbol: '', value: 0 });

    if (largestHolding.value / totalValue > 0.3) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'High Concentration',
        description: `${largestHolding.symbol} represents over 30% of your portfolio. Consider reducing concentration risk.`,
        action: 'Rebalance portfolio',
      });
    }

    // Best and worst performers
    const performers = investments.map(inv => {
      const returnPercent = ((inv.currentPrice - inv.purchasePrice) / inv.purchasePrice) * 100;
      return { symbol: inv.symbol, returnPercent };
    }).sort((a, b) => b.returnPercent - a.returnPercent);

    if (performers.length > 0) {
      const best = performers[0];
      const worst = performers[performers.length - 1];

      if (best.returnPercent > 20) {
        insights.push({
          type: 'positive',
          icon: Target,
          title: 'Top Performer',
          description: `${best.symbol} is your best performer at ${best.returnPercent.toFixed(1)}%. Consider if it's time to take profits.`,
          action: 'Review position',
        });
      }

      if (worst.returnPercent < -10) {
        insights.push({
          type: 'warning',
          icon: TrendingDown,
          title: 'Underperforming Asset',
          description: `${worst.symbol} is down ${Math.abs(worst.returnPercent).toFixed(1)}%. Review if this aligns with your investment thesis.`,
          action: 'Analyze position',
        });
      }
    }

    // Market timing insight
    if (investments.length > 5) {
      insights.push({
        type: 'info',
        icon: BarChart3,
        title: 'Portfolio Health',
        description: `You have ${investments.length} investments. Consider regular rebalancing to maintain your target allocation.`,
        action: 'Schedule review',
      });
    }

    return insights.slice(0, 4); // Limit to 4 insights
  };

  const insights = calculateInsights();

  const getInsightColor = (type: string) => {
    const colors = {
      positive: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
      warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
      info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
    };
    return colors[type as keyof typeof colors] || colors.info;
  };

  const getIconColor = (type: string) => {
    const colors = {
      positive: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      info: 'text-blue-600 dark:text-blue-400',
    };
    return colors[type as keyof typeof colors] || colors.info;
  };

  if (insights.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Lightbulb className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
          Portfolio Insights
        </h3>
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Add more investments to get personalized insights and recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
        <Lightbulb className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
        Portfolio Insights
      </h3>
      
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon;
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg bg-white dark:bg-gray-700 ${getIconColor(insight.type)}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {insight.description}
                  </p>
                  <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                    {insight.action} →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PortfolioInsights;
