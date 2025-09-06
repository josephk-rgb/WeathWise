import React from 'react';
import { TrendingUp, TrendingDown, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { Investment } from '../../types';
import { formatCurrency } from '../../utils/currency';

interface HoldingCardProps {
  investment: Investment;
  currency: string;
  onEdit: (investment: Investment) => void;
  onDelete: (id: string) => void;
}

const HoldingCard: React.FC<HoldingCardProps> = ({
  investment,
  currency,
  onEdit,
  onDelete,
}) => {
  const currentValue = (investment.shares || 0) * (investment.currentPrice || 0);
  const costBasis = (investment.shares || 0) * (investment.purchasePrice || 0);
  const gainLoss = currentValue - costBasis;
  const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
  const isPositive = gainLoss >= 0;

  const getTypeColor = (type: string) => {
    const colors = {
      stock: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      crypto: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      etf: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      bond: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      real_estate: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      '401k': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      stock: '📈',
      crypto: '₿',
      etf: '📊',
      bond: '🏛️',
      real_estate: '🏠',
      '401k': '💰',
      other: '📋',
    };
    return icons[type as keyof typeof icons] || icons.other;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            {(investment.symbol || 'N/A').charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {investment.symbol || 'N/A'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {investment.name || 'Unknown'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(investment.type || 'other')}`}>
            {getTypeIcon(investment.type || 'other')} {(investment.type || 'other').replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(currentValue, currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Shares</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {(investment.shares || 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Price</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(investment.currentPrice || 0, currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cost Basis</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(investment.purchasePrice || 0, currency)}
          </p>
        </div>
      </div>

      {/* Gain/Loss Section */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Gain/Loss</p>
            <div className="flex items-center space-x-2">
              <span className={`text-xl font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? '+' : ''}{formatCurrency(gainLoss, currency)}
              </span>
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Return %</p>
            <p className={`text-xl font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositive ? '+' : ''}{gainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(investment)}
            className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => onDelete(investment.id)}
            className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
        
        <button className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <ExternalLink className="w-4 h-4" />
          <span>Details</span>
        </button>
      </div>
    </div>
  );
};

export default HoldingCard;
