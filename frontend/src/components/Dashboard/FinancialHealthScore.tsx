import React from 'react';
import { Shield, TrendingUp, DollarSign, PieChart, AlertTriangle } from 'lucide-react';
import Card from '../UI/Card';

interface FinancialHealthScoreProps {
  score: {
    overall: number;
    emergencyFund: number;
    cashFlow: number;
    debtToIncome: number;
    savingsRate: number;
    diversification: number;
  };
}

const FinancialHealthScore: React.FC<FinancialHealthScoreProps> = ({ score }) => {
  const getScoreColor = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (value: number) => {
    if (value >= 80) return 'bg-green-100 dark:bg-green-900/20';
    if (value >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const getScoreLabel = (value: number) => {
    if (value >= 80) return 'Excellent';
    if (value >= 60) return 'Good';
    if (value >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const metrics = [
    {
      name: 'Emergency Fund',
      value: score.emergencyFund,
      icon: Shield,
      description: '3-6 months expenses saved'
    },
    {
      name: 'Cash Flow',
      value: score.cashFlow,
      icon: TrendingUp,
      description: 'Income vs expenses balance'
    },
    {
      name: 'Debt-to-Income',
      value: score.debtToIncome,
      icon: AlertTriangle,
      description: 'Debt payments under 28% of income'
    },
    {
      name: 'Savings Rate',
      value: score.savingsRate,
      icon: DollarSign,
      description: 'Percentage of income saved'
    },
    {
      name: 'Diversification',
      value: score.diversification,
      icon: PieChart,
      description: 'Investment portfolio spread'
    }
  ];

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Financial Health Score
        </h3>
        {score.overall === 0 ? (
          // No data state
          <div className="flex items-center space-x-4">
            <div className="text-4xl font-bold text-gray-400">
              --
            </div>
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                No Data Available
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Add transactions and investments to see your score
              </p>
            </div>
          </div>
        ) : (
          // Normal score display
          <div className="flex items-center space-x-4">
            <div className={`text-4xl font-bold ${getScoreColor(score.overall)}`}>
              {score.overall}
            </div>
            <div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreBackground(score.overall)} ${getScoreColor(score.overall)}`}>
                {getScoreLabel(score.overall)}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Based on 5 key financial metrics
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {score.overall === 0 ? (
          // No data state for metrics
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <PieChart className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-2">No financial data available</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Start by adding some transactions or investments to see your personalized financial health score.
            </p>
          </div>
        ) : (
          // Normal metrics display
          metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getScoreBackground(metric.value)}`}>
                    <Icon className={`w-4 h-4 ${getScoreColor(metric.value)}`} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {metric.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {metric.description}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${getScoreColor(metric.value)}`}>
                    {metric.value}
                  </div>
                  <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        metric.value >= 80 ? 'bg-green-500' :
                        metric.value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {score.overall > 0 && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Personalized Recommendations
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            {score.emergencyFund < 60 && (
              <li>• Build emergency fund to 3-6 months of expenses</li>
            )}
            {score.debtToIncome < 70 && (
              <li>• Reduce debt payments to under 28% of income</li>
            )}
            {score.savingsRate < 60 && (
              <li>• Increase savings rate to at least 20% of income</li>
            )}
            {score.diversification < 60 && (
              <li>• Diversify investments across 4+ asset types</li>
            )}
            {score.cashFlow < 60 && (
              <li>• Improve monthly cash flow by budgeting expenses</li>
            )}
            {score.overall >= 80 && (
              <li>• Consider advanced investment strategies for wealth growth</li>
            )}
          </ul>
        </div>
      )}
    </Card>
  );
};

export default FinancialHealthScore;