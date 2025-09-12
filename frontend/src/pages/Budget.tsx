import React, { useState, useEffect } from 'react';
import { Plus, PiggyBank, TrendingUp, TrendingDown, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { formatCurrency } from '../utils/currency';
import { Budget } from '../types';

const BudgetPage: React.FC = () => {
  const { user, budgets, setBudgets, transactions, currency } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    allocated: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
  });

  const categories = [
    'Housing', 'Transportation', 'Food', 'Utilities', 'Insurance',
    'Healthcare', 'Savings', 'Personal', 'Recreation', 'Miscellaneous',
    'Education', 'Clothing', 'Technology', 'Travel', 'Business',
    'Gifts', 'Charity', 'Debt Payments', 'Emergency Fund', 'Other'
  ];

  useEffect(() => {
    if (user) {
      loadBudgets();
    }
  }, [user]);

  const loadBudgets = async () => {
    if (!user) return;
    try {
      const response = await apiService.getBudgets(user.id);
      // Handle the response format: {success: true, data: [...]}
      const data = (response as any)?.data || response;
      if (!Array.isArray(data)) {
        console.warn('Budgets API returned non-array data:', response);
        setBudgets([]);
        return;
      }
      setBudgets(data);
    } catch (error) {
      console.error('Error loading budgets:', error);
      setBudgets([]); // Set empty array on error
    }
  };

  const calculateSpent = (category: string, month: string, year: number) => {
    return Math.abs(transactions
      .filter(t => 
        t.type === 'expense' && 
        t.category === category &&
        new Date(t.date).getMonth() === new Date(month).getMonth() &&
        new Date(t.date).getFullYear() === year
      )
      .reduce((sum, t) => sum + t.amount, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const [year] = formData.month.split('-');
      const spent = calculateSpent(formData.category, formData.month, parseInt(year));

      const budgetData = {
        userId: user.id,
        category: formData.category,
        allocated: Number(formData.allocated),
        spent,
        month: formData.month, // Keep the YYYY-MM format
        year: parseInt(year),
        currency,
      };

      if (editingBudget) {
        // Update existing budget
        const response = await apiService.updateBudget(editingBudget.id, budgetData);
        const updatedBudget = (response as any).data || response;
        setBudgets(safeBudgets.map(b => b.id === editingBudget.id ? updatedBudget : b));
      } else {
        // Create new budget
        const response = await apiService.createBudget(budgetData);
        const savedBudget = (response as any).data || response;
        setBudgets([...safeBudgets, savedBudget]);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Failed to save budget. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      allocated: '',
      month: new Date().toISOString().slice(0, 7),
    });
    setShowAddForm(false);
    setEditingBudget(null);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      allocated: budget.allocated.toString(),
      month: `${budget.year}-${String(new Date(`${budget.month} 1, ${budget.year}`).getMonth() + 1).padStart(2, '0')}`,
    });
    setShowAddForm(true);
  };

  const handleDelete = (budgetId: string) => {
    setBudgets(safeBudgets.filter(b => b.id !== budgetId));
  };

  // Ensure budgets is always an array
  const safeBudgets = Array.isArray(budgets) ? budgets : [];

  const totalAllocated = safeBudgets.reduce((sum, budget) => sum + budget.allocated, 0);
  const totalSpent = safeBudgets.reduce((sum, budget) => sum + budget.spent, 0);
  const remainingBudget = totalAllocated - totalSpent;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
            Budget Planner
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Plan and track your monthly spending across categories
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Allocated</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalAllocated, currency)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <PiggyBank className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalSpent, currency)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Remaining</p>
              <p className={`text-2xl font-bold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(remainingBudget, currency)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${remainingBudget >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
              {remainingBudget >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Add/Edit Budget Form */}
      {showAddForm && (
        <Card className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editingBudget ? 'Edit Budget' : 'Add New Budget'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Allocated Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.allocated}
                onChange={(e) => setFormData({ ...formData, allocated: e.target.value })}
                className="input-field"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Month
              </label>
              <input
                type="month"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div className="md:col-span-3 flex space-x-3">
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingBudget ? 'Update Budget' : 'Add Budget'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Budget List */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Budget Overview</h3>
        {budgets.length === 0 ? (
          <div className="text-center py-12">
            <PiggyBank className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No budgets created</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Start by creating your first budget to track spending
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Budget
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {safeBudgets.map((budget) => {
              const percentage = (budget.spent / budget.allocated) * 100;
              const isOverBudget = percentage > 100;
              const isNearLimit = percentage > 80 && percentage <= 100;
              
              return (
                <div key={budget.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{budget.category}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {budget.month} {budget.year}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(budget.spent, currency)} / {formatCurrency(budget.allocated, currency)}
                        </p>
                        <p className={`text-sm ${
                          isOverBudget ? 'text-red-600' : 
                          isNearLimit ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {percentage.toFixed(1)}% used
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(budget)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(budget.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isOverBudget ? 'bg-red-500' : 
                          isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Message */}
                  {isOverBudget && (
                    <div className="flex items-center text-sm text-red-600 mt-2">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Over budget by {formatCurrency(budget.spent - budget.allocated, currency)}
                    </div>
                  )}
                  {isNearLimit && !isOverBudget && (
                    <div className="flex items-center text-sm text-yellow-600 mt-2">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Approaching budget limit
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default BudgetPage;