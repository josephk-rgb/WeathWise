import React, { useState, useEffect } from 'react';
import { Database, Play, Trash2, Settings, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import Button from '../UI/Button';
import Card from '../UI/Card';
import MockDataService from '../../services/mockDataService';
import { MockDataConfig, MockDataSummary } from '../../types';

interface AdminMockDataProps {
  isAdmin: boolean;
}

const AdminMockData: React.FC<AdminMockDataProps> = ({ isAdmin }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [config, setConfig] = useState<MockDataConfig>({
    accounts: 3,
    transactionsPerMonth: 50,
    monthsOfHistory: 12,
    includeInvestments: true,
    includeBudgets: true,
    includeGoals: true,
    includeDebts: true,
  });
  const [summary, setSummary] = useState<MockDataSummary | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Load default config and current summary on mount
  useEffect(() => {
    if (isAdmin) {
      loadDefaultConfig();
      loadDataSummary();
    }
  }, [isAdmin]);

  const loadDefaultConfig = async () => {
    try {
      const defaultConfig = await MockDataService.getDefaultConfig();
      setConfig(prev => ({ ...prev, ...defaultConfig }));
    } catch (error) {
      console.error('Failed to load default config:', error);
    }
  };

  const loadDataSummary = async () => {
    try {
      const currentSummary = await MockDataService.getDataSummary();
      setSummary(currentSummary);
    } catch (error) {
      console.error('Failed to load data summary:', error);
      setSummary(null);
    }
  };

  const handleGenerateMockData = async () => {
    setIsGenerating(true);
    setMessage(null);
    
    try {
      const result = await MockDataService.generateMockData(config);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setSummary(result.summary);
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to generate mock data' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to generate mock data' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearMockData = async () => {
    setIsClearing(true);
    setMessage(null);
    
    try {
      const result = await MockDataService.clearMockData();
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setSummary({
          accounts: 0,
          transactions: 0,
          investments: 0,
          budgets: 0,
          goals: 0,
          debts: 0,
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to clear mock data' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to clear mock data' });
    } finally {
      setIsClearing(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-center mb-4">
        <Database className="w-5 h-5 text-violet-500 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Admin Mock Data Generator
        </h2>
      </div>
      
      {/* Status Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 mr-2" />
          ) : (
            <AlertCircle className="w-4 h-4 mr-2" />
          )}
          {message.text}
        </div>
      )}

      {/* Current Data Summary */}
      {summary && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Current Data</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Accounts:</span>
              <span className="ml-2 font-medium">{summary.accounts}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Transactions:</span>
              <span className="ml-2 font-medium">{summary.transactions}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Investments:</span>
              <span className="ml-2 font-medium">{summary.investments}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Budgets:</span>
              <span className="ml-2 font-medium">{summary.budgets}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Goals:</span>
              <span className="ml-2 font-medium">{summary.goals}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Debts:</span>
              <span className="ml-2 font-medium">{summary.debts}</span>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Configuration</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="accounts-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Accounts
              </label>
              <input
                id="accounts-input"
                type="number"
                min="1"
                max="10"
                value={config.accounts || 3}
                onChange={(e) => setConfig(prev => ({ ...prev, accounts: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            
            <div>
              <label htmlFor="transactions-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transactions/Month
              </label>
              <input
                id="transactions-input"
                type="number"
                min="10"
                max="200"
                value={config.transactionsPerMonth || 50}
                onChange={(e) => setConfig(prev => ({ ...prev, transactionsPerMonth: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            
            <div>
              <label htmlFor="months-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Months of History
              </label>
              <input
                id="months-input"
                type="number"
                min="1"
                max="24"
                value={config.monthsOfHistory || 12}
                onChange={(e) => setConfig(prev => ({ ...prev, monthsOfHistory: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeInvestments || false}
                onChange={(e) => setConfig(prev => ({ ...prev, includeInvestments: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include Investments</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeBudgets || false}
                onChange={(e) => setConfig(prev => ({ ...prev, includeBudgets: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include Budgets</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeGoals || false}
                onChange={(e) => setConfig(prev => ({ ...prev, includeGoals: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include Goals</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeDebts || false}
                onChange={(e) => setConfig(prev => ({ ...prev, includeDebts: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include Debts</span>
            </label>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Mock Data Generation</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generate realistic financial data for testing and development
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center"
            >
              <Settings className="w-4 h-4 mr-1" />
              Config
            </Button>
            
            <Button
              onClick={handleGenerateMockData}
              disabled={isGenerating || isClearing}
              className="flex items-center bg-violet-500 hover:bg-violet-600"
            >
              {isGenerating ? (
                <Loader className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Data'}
            </Button>
          </div>
        </div>

        {summary && (summary.accounts > 0 || summary.transactions > 0) && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Clear Mock Data</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Remove all generated mock data from your account
              </p>
            </div>
            
            <Button
              variant="outline"
              onClick={handleClearMockData}
              disabled={isGenerating || isClearing}
              className="flex items-center text-red-600 border-red-300 hover:bg-red-50"
            >
              {isClearing ? (
                <Loader className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              {isClearing ? 'Clearing...' : 'Clear Data'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AdminMockData;
