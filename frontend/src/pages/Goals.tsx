import React, { useState, useEffect } from 'react';
import { Plus, Target, DollarSign, TrendingUp, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { formatCurrency } from '../utils/currency';
import { Goal } from '../types';

const GoalsPage: React.FC = () => {
  const { user, goals, setGoals, currency } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const categories = [
    'Emergency Fund', 'Vacation', 'Home Purchase', 'Car Purchase',
    'Education', 'Retirement', 'Technology', 'Healthcare',
    'Wedding', 'Business', 'Investment', 'Other'
  ];

  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;
    try {
      const data = await apiService.getGoals(user.id);
      // Ensure we always get an array for goals
      if (!Array.isArray(data)) {
        console.warn('Goals API returned non-array data:', data);
        setGoals([]);
        return;
      }
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
      setGoals([]); // Set empty array on error
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const goalData: Goal = {
      id: editingGoal?.id || Date.now().toString(),
      userId: user.id,
      title: formData.title,
      description: formData.description,
      targetAmount: Number(formData.targetAmount),
      currentAmount: Number(formData.currentAmount),
      targetDate: new Date(formData.targetDate),
      category: formData.category,
      priority: formData.priority,
      currency,
    };

    if (editingGoal) {
      setGoals(safeGoals.map(g => g.id === editingGoal.id ? goalData : g));
    } else {
      setGoals([...safeGoals, goalData]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      targetAmount: '',
      currentAmount: '',
      targetDate: '',
      category: '',
      priority: 'medium',
    });
    setShowAddForm(false);
    setEditingGoal(null);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      targetDate: new Date(goal.targetDate).toISOString().split('T')[0],
      category: goal.category,
      priority: goal.priority,
    });
    setShowAddForm(true);
  };

  const handleDelete = (goalId: string) => {
    setGoals(safeGoals.filter(g => g.id !== goalId));
    if (selectedGoal?.id === goalId) {
      setSelectedGoal(null);
    }
  };

  const calculateProjection = (goal: Goal) => {
    const today = new Date();
    const targetDate = new Date(goal.targetDate);
    const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const monthsRemaining = Math.max(1, daysRemaining / 30);
    const amountNeeded = goal.targetAmount - goal.currentAmount;
    const monthlyRequired = amountNeeded / monthsRemaining;
    
    return {
      daysRemaining,
      monthsRemaining: Math.ceil(monthsRemaining),
      monthlyRequired,
      isAchievable: monthlyRequired > 0,
    };
  };

  // Ensure goals is always an array
  const safeGoals = Array.isArray(goals) ? goals : [];

  const totalGoalAmount = safeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSaved = safeGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const completedGoals = safeGoals.filter(goal => goal.currentAmount >= goal.targetAmount).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
            Savings Goals
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Set, track, and achieve your financial goals
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Goal Amount</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalGoalAmount, currency)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Saved</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalSaved, currency)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Goals</p>
              <p className="text-2xl font-bold text-violet-600">
                {completedGoals} / {safeGoals.length}
              </p>
            </div>
            <div className="p-3 bg-violet-100 dark:bg-violet-900/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-violet-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Add/Edit Goal Form */}
      {showAddForm && (
        <Card className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editingGoal ? 'Edit Goal' : 'Add New Goal'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Goal Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-field"
                placeholder="e.g., Emergency Fund"
                required
              />
            </div>

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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Describe your goal..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                className="input-field"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                className="input-field"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Date
              </label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="input-field"
                required
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div className="md:col-span-2 flex space-x-3">
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingGoal ? 'Update Goal' : 'Add Goal'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Goals List */}
        <div>
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Goals</h3>
            {safeGoals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No goals set</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Start by creating your first savings goal
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {safeGoals.map((goal) => {
                  const progress = (goal.currentAmount / goal.targetAmount) * 100;
                  const isCompleted = progress >= 100;
                  const projection = calculateProjection(goal);
                  
                  return (
                    <div 
                      key={goal.id} 
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedGoal?.id === goal.id 
                          ? 'bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-200 dark:border-violet-700' 
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      onClick={() => setSelectedGoal(goal)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            isCompleted ? 'bg-green-100 dark:bg-green-900/20' : 'bg-blue-100 dark:bg-blue-900/20'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Target className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{goal.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{goal.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            goal.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                            goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {goal.priority}
                          </span>
                          <div className="flex space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(goal);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(goal.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span>{formatCurrency(goal.currentAmount, currency)}</span>
                          <span>{formatCurrency(goal.targetAmount, currency)}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isCompleted ? 'bg-green-500' : 'bg-violet-500'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {progress.toFixed(1)}% complete
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {projection.daysRemaining} days left
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Goal Details */}
        <div>
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Goal Details</h3>
            {selectedGoal ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {selectedGoal.title}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {selectedGoal.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Target Amount</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(selectedGoal.targetAmount, currency)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Amount</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(selectedGoal.currentAmount, currency)}
                    </p>
                  </div>
                </div>

                {(() => {
                  const projection = calculateProjection(selectedGoal);
                  return (
                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">Projection Analysis</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Days remaining:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{projection.daysRemaining}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Monthly required:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(projection.monthlyRequired, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Target date:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(selectedGoal.targetDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {projection.monthlyRequired > 0 && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex items-center mb-2">
                            <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                            <span className="font-medium text-blue-900 dark:text-blue-100">Recommendation</span>
                          </div>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Save {formatCurrency(projection.monthlyRequired, currency)} per month to reach your goal on time.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Select a goal to view detailed analysis and projections
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GoalsPage;