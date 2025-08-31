import React, { useState } from 'react';
import { Plus, CreditCard, Calendar, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { formatCurrency } from '../utils/currency';
import { Debt } from '../types';

const DebtPage: React.FC = () => {
  const { user, debts, addDebt, currency } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    totalAmount: '',
    remainingBalance: '',
    interestRate: '',
    minimumPayment: '',
    dueDate: '',
    type: 'credit_card' as Debt['type'],
  });

  const debtTypes = [
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'loan', label: 'Personal Loan' },
    { value: 'mortgage', label: 'Mortgage' },
    { value: 'student_loan', label: 'Student Loan' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newDebt: Debt = {
      id: Date.now().toString(),
      userId: user.id,
      name: formData.name,
      totalAmount: Number(formData.totalAmount),
      remainingBalance: Number(formData.remainingBalance),
      interestRate: Number(formData.interestRate),
      minimumPayment: Number(formData.minimumPayment),
      dueDate: new Date(formData.dueDate),
      type: formData.type,
      currency,
      createdAt: new Date(),
    };

    addDebt(newDebt);
    setShowAddForm(false);
    setFormData({
      name: '',
      totalAmount: '',
      remainingBalance: '',
      interestRate: '',
      minimumPayment: '',
      dueDate: '',
      type: 'credit_card',
    });
  };

  const calculatePayoffTime = (debt: Debt) => {
    const monthlyRate = debt.interestRate / 100 / 12;
    const months = Math.ceil(
      -Math.log(1 - (debt.remainingBalance * monthlyRate) / debt.minimumPayment) / 
      Math.log(1 + monthlyRate)
    );
    return isFinite(months) ? months : 0;
  };

  // Ensure debts is always an array
  const safeDebts = Array.isArray(debts) ? debts : [];

  const totalDebt = safeDebts.reduce((sum, debt) => sum + debt.remainingBalance, 0);
  const totalMinimumPayments = safeDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
            Debt Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your debts and repayment progress
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Debt
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Debt</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalDebt, currency)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Payments</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalMinimumPayments, currency)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Debts</p>
              <p className="text-2xl font-bold text-blue-600">
                {debts.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Add Debt Form */}
      {showAddForm && (
        <Card className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add New Debt</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Debt Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g., Chase Credit Card"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Debt Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Debt['type'] })}
                className="input-field"
                required
              >
                {debtTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                className="input-field"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Remaining Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.remainingBalance}
                onChange={(e) => setFormData({ ...formData, remainingBalance: e.target.value })}
                className="input-field"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interest Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.interestRate}
                onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                className="input-field"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Payment
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.minimumPayment}
                onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
                className="input-field"
                placeholder="0.00"
                required
              />
            </div>

            <div className="md:col-span-2 flex space-x-3">
              <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add Debt
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Debts List */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Debts</h3>
        {debts.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No debts tracked</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Start by adding your first debt to track repayment progress
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Debt
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {safeDebts.map((debt) => {
              const payoffMonths = calculatePayoffTime(debt);
              const progressPercentage = ((debt.totalAmount - debt.remainingBalance) / debt.totalAmount) * 100;
              
              return (
                <div key={debt.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{debt.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {debt.type.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">
                        {formatCurrency(debt.remainingBalance, currency)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        of {formatCurrency(debt.totalAmount, currency)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{progressPercentage.toFixed(1)}% paid off</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Interest Rate</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{debt.interestRate}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Min Payment</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(debt.minimumPayment, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Payoff Time</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {payoffMonths > 0 ? `${payoffMonths} months` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Due Date</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(debt.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DebtPage;