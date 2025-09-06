import React, { useEffect, useState } from 'react';
import { Search, Plus, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Pagination from '../components/UI/Pagination';
import TransactionModal from '../components/Forms/TransactionModal';
import { formatCurrency } from '../utils/currency';

const Transactions: React.FC = () => {
  const { user, transactions, setTransactions, currency, isTransactionModalOpen, setTransactionModalOpen } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Totals from API
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netFlow, setNetFlow] = useState(0);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user, currentPage, itemsPerPage, filterType, filterCategory, debouncedSearchTerm]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadTransactions = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const filters = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        ...(filterType !== 'all' && { type: filterType }),
        ...(filterCategory !== 'all' && { category: filterCategory }),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      };
      
      const response = await apiService.getTransactions(user.id, filters);
      // Handle the response format: {success: true, data: [...], pagination: {...}}
      const data = (response as any)?.data || response;
      const pagination = (response as any)?.pagination;
      
      if (!Array.isArray(data)) {
        console.warn('Transactions API returned non-array data:', response);
        setTransactions([]);
        return;
      }
      setTransactions(data);
      if (pagination) {
        setTotalItems(pagination.total);
      }
      
      // Set totals from API response
      if ((response as any)?.totals) {
        const totals = (response as any).totals;
        setTotalIncome(totals.totalIncome || 0);
        setTotalExpenses(totals.totalExpenses || 0);
        setNetFlow(totals.netFlow || 0);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  // Ensure transactions is always an array
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const categories = [...new Set(safeTransactions.map((t: any) => t.transactionInfo?.category || t.category).filter(Boolean))];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (type: 'type' | 'category', value: string) => {
    if (type === 'type') {
      setFilterType(value as 'all' | 'income' | 'expense');
    } else {
      setFilterCategory(value);
    }
    setCurrentPage(1); // Reset to first page when filtering
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
            Transactions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your income and expenses
          </p>
        </div>

        <Button onClick={() => setTransactionModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Income</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                +{formatCurrency(totalIncome, currency)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ArrowUpRight className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                -{formatCurrency(totalExpenses, currency)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ArrowDownRight className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Flow</p>
              <p className={`text-2xl font-bold ${
                netFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow, currency)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option key="all-types" value="all">All Types</option>
            <option key="income" value="income">Income</option>
            <option key="expense" value="expense">Expenses</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option key="all-categories" value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Description</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Category</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Type</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Amount</th>
              </tr>
            </thead>
            <tbody>
              {safeTransactions.map((transaction: any) => (
                <tr key={transaction._id || transaction.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(transaction.transactionInfo?.date || transaction.date).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${
                        (transaction.transactionInfo?.type || transaction.type) === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {(transaction.transactionInfo?.type || transaction.type) === 'income' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {transaction.transactionInfo?.description || transaction.description}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {transaction.transactionInfo?.category || transaction.category}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (transaction.transactionInfo?.type || transaction.type) === 'income' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}>
                      {transaction.transactionInfo?.type || transaction.type}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={`font-medium ${
                      (transaction.transactionInfo?.type || transaction.type) === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(transaction.transactionInfo?.type || transaction.type) === 'income' ? '+' : ''}{formatCurrency(Math.abs(transaction.transactionInfo?.amount || transaction.amount || 0), currency)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {safeTransactions.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <Search className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No transactions found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || filterType !== 'all' || filterCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start by adding your first transaction'
                }
              </p>
            </div>
          )}
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading transactions...</p>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            className="rounded-b-lg border-t-0"
          />
        )}
      </Card>
      
      <TransactionModal 
        isOpen={isTransactionModalOpen} 
        onClose={() => setTransactionModalOpen(false)} 
      />
    </div>
  );
};

export default Transactions;