import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Edit2, Trash2, Filter, Search, SortAsc, SortDesc } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { formatCurrency } from '../utils/currency';
import { Investment } from '../types';
import PortfolioGrowthChart from '../components/Charts/PortfolioGrowthChart';
import PortfolioMetrics from '../components/Dashboard/PortfolioMetrics';
import PortfolioInsights from '../components/Dashboard/PortfolioInsights';
import HoldingCard from '../components/Dashboard/HoldingCard';
import { generatePortfolioHistory } from '../utils/portfolioData';

const PortfolioPage: React.FC = () => {
  const { user, investments, setInvestments, currency } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'gainLoss' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    shares: '',
    purchasePrice: '',
    currentPrice: '',
    type: 'stock' as Investment['type'],
    purchaseDate: new Date().toISOString().split('T')[0],
  });

  const investmentTypes = [
    { value: 'stock', label: 'Stock' },
    { value: 'crypto', label: 'Cryptocurrency' },
    { value: 'etf', label: 'ETF' },
    { value: 'bond', label: 'Bond' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: '401k', label: '401(k) / Retirement' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    if (user) {
      loadInvestments();
    }
  }, [user]);

  useEffect(() => {
    // Generate portfolio history for the chart
    const history = generatePortfolioHistory(investments);
    setPortfolioHistory(history);
  }, [investments]);

  const loadInvestments = async () => {
    if (!user) return;
    try {
      const data = await apiService.getInvestments(user.id);
      console.log('Loaded investments from API:', data);
      
      // Ensure we always get an array for investments
      if (!Array.isArray(data)) {
        console.warn('Investments API returned non-array data:', data);
        setInvestments([]);
        return;
      }
      
      console.log('Successfully loaded', data.length, 'investments');
      setInvestments(data);
    } catch (error) {
      console.error('Error loading investments:', error);
      // Set empty array instead of sample data
      setInvestments([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const investmentData: Investment = {
      id: editingInvestment?.id || Date.now().toString(),
      userId: user.id,
      symbol: formData.symbol,
      name: formData.name,
      shares: Number(formData.shares),
      purchasePrice: Number(formData.purchasePrice),
      currentPrice: Number(formData.currentPrice),
      type: formData.type,
      purchaseDate: new Date(formData.purchaseDate),
      currency,
    };

    if (editingInvestment) {
      setInvestments(safeInvestments.map(inv => inv.id === editingInvestment.id ? investmentData : inv));
    } else {
      setInvestments([...safeInvestments, investmentData]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      shares: '',
      purchasePrice: '',
      currentPrice: '',
      type: 'stock',
      purchaseDate: new Date().toISOString().split('T')[0],
    });
    setShowAddForm(false);
    setEditingInvestment(null);
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setFormData({
      symbol: investment.symbol,
      name: investment.name,
      shares: investment.shares.toString(),
      purchasePrice: investment.purchasePrice.toString(),
      currentPrice: investment.currentPrice.toString(),
      type: investment.type,
      purchaseDate: new Date(investment.purchaseDate).toISOString().split('T')[0],
    });
    setShowAddForm(true);
  };

  const handleDelete = (investmentId: string) => {
    setInvestments(safeInvestments.filter(inv => inv.id !== investmentId));
  };

  // Ensure investments is always an array
  const safeInvestments = Array.isArray(investments) ? investments : [];

  // Filter and sort investments
  const filteredAndSortedInvestments = safeInvestments
    .filter(inv => {
      const matchesSearch = inv.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || inv.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'value':
          aValue = a.shares * a.currentPrice;
          bValue = b.shares * b.currentPrice;
          break;
        case 'gainLoss':
          aValue = (a.currentPrice - a.purchasePrice) / a.purchasePrice;
          bValue = (b.currentPrice - b.purchasePrice) / b.purchasePrice;
          break;
        case 'name':
          aValue = a.symbol.charCodeAt(0);
          bValue = b.symbol.charCodeAt(0);
          break;
        default:
          aValue = a.shares * a.currentPrice;
          bValue = b.shares * b.currentPrice;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  const getAssetAllocation = () => {
    const allocation = safeInvestments.reduce((acc, inv) => {
      const value = inv.shares * inv.currentPrice;
      acc[inv.type] = (acc[inv.type] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(allocation).reduce((sum, value) => sum + value, 0);
    
    return Object.entries(allocation).map(([type, value]) => ({
      name: type.replace('_', ' ').toUpperCase(),
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }));
  };

  const assetAllocation = getAssetAllocation();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
            Investment Portfolio
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your investment holdings with advanced analytics
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Button variant="secondary" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Investment
          </Button>
        </div>
      </div>

      {/* Portfolio Growth Chart */}
      <div className="mb-8">
        <PortfolioGrowthChart 
          data={portfolioHistory} 
          currency={currency}
          height={400}
        />
      </div>

      {/* Enhanced Metrics */}
      <div className="mb-8">
        <PortfolioMetrics investments={investments} currency={currency} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Holdings Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-0">
                Holdings ({filteredAndSortedInvestments.length})
              </h3>
              
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search investments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  {investmentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                {/* Sort */}
                <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent border-r border-gray-300 dark:border-gray-600"
                  >
                    <option value="value">Value</option>
                    <option value="gainLoss">Gain/Loss</option>
                    <option value="name">Name</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {filteredAndSortedInvestments.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {investments.length === 0 ? 'No investments tracked' : 'No investments match your filters'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {investments.length === 0 
                    ? 'Start by adding your first investment'
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
                {investments.length === 0 && (
                  <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Investment
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAndSortedInvestments.map((investment) => (
                  <HoldingCard
                    key={investment.id}
                    investment={investment}
                    currency={currency}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Asset Allocation */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Asset Allocation</h3>
            {assetAllocation.length === 0 ? (
              <div className="text-center py-8">
                <PieChart className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No investments to display
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {assetAllocation.map((allocation, index) => {
                  const colors = [
                    'bg-violet-500', 'bg-blue-500', 'bg-green-500', 
                    'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500'
                  ];
                  const color = colors[index % colors.length];
                  
                  return (
                    <div key={allocation.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${color}`} />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {allocation.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {allocation.percentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(allocation.value, currency)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Portfolio Insights - Full Width Row */}
      <div className="mt-8">
        <PortfolioInsights investments={investments} currency={currency} />
      </div>

      {/* Add/Edit Investment Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingInvestment ? 'Edit Investment' : 'Add New Investment'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Symbol/Ticker
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  className="input-field"
                  placeholder="e.g., AAPL, BTC"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Apple Inc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Investment Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Investment['type'] })}
                  className="input-field"
                  required
                >
                  {investmentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shares/Units
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={formData.shares}
                  onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Purchase Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.currentPrice}
                  onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="lg:col-span-4 flex space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingInvestment ? 'Update Investment' : 'Add Investment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;