import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, Calendar, DollarSign, Tag, Repeat, CreditCard } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { apiService } from '../../services/api';
import Button from '../UI/Button';
import Card from '../UI/Card';
import { CURRENCIES, convertCurrency } from '../../utils/currency';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose }) => {
  const { user, addTransaction, currency: baseCurrency } = useStore();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    type: 'expense' as 'income' | 'expense',
    date: new Date().toISOString().split('T')[0],
    currency: baseCurrency,
    accountId: '', // Add account selection
    isRecurring: false,
    recurringFrequency: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    receiptFile: null as File | null,
  });

  const categories = [
    'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
    'Bills & Utilities', 'Healthcare', 'Travel', 'Education',
    'Business', 'Personal Care', 'Gifts & Donations', 'Other'
  ];

  // Load accounts when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadAccounts();
    }
  }, [isOpen, user]);

  const loadAccounts = async () => {
    if (!user) return;
    setLoadingAccounts(true);
    try {
      const accountsData = await apiService.getAccounts();
      setAccounts(accountsData);
      // Set default account if none selected
      if (!formData.accountId && accountsData.length > 0) {
        setFormData(prev => ({ ...prev, accountId: accountsData[0].id }));
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const originalAmount = Number(formData.amount);
      const convertedAmount = convertCurrency(originalAmount, formData.currency, baseCurrency);
      const finalAmount = formData.type === 'expense' ? -Math.abs(convertedAmount) : Math.abs(convertedAmount);
      
      // Prepare transaction data for API (without id, as backend will generate it)
      const transactionData = {
        userId: user.id,
        accountId: formData.accountId, // Include account selection
        amount: finalAmount,
        description: formData.description,
        category: formData.category,
        type: formData.type,
        date: new Date(formData.date),
        currency: baseCurrency,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
        receiptUrl: formData.receiptFile ? URL.createObjectURL(formData.receiptFile) : undefined,
        tags: [], // Add empty tags array as expected by backend
      };

      // Call API to create transaction
      const response = await apiService.createTransaction(transactionData);
      
      // Extract the transaction from the response (handle both response formats)
      const savedTransaction = (response as any).data || response;
      
      // Add to local store
      addTransaction(savedTransaction);
      
      // Close modal and reset form
      onClose();
      setFormData({
        amount: '',
        description: '',
        category: '',
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        currency: baseCurrency,
        accountId: accounts.length > 0 ? accounts[0].id : '', // Reset to first account
        isRecurring: false,
        recurringFrequency: 'monthly',
        receiptFile: null,
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      // TODO: Show error message to user
      alert('Failed to create transaction. Please try again.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, receiptFile: file });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100">
              Add Transaction
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selection */}
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'expense' })}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.type === 'expense'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'income' })}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  formData.type === 'income'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Income
              </button>
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input-field pl-10"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="input-field"
                  required
                >
                  {Object.entries(CURRENCIES).map(([code, info]) => (
                    <option key={code} value={code}>
                      {info.symbol} {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Currency Conversion Notice */}
            {formData.currency !== baseCurrency && formData.amount && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {CURRENCIES[formData.currency as keyof typeof CURRENCIES]?.symbol}{formData.amount} {formData.currency} ≈ {CURRENCIES[baseCurrency as keyof typeof CURRENCIES]?.symbol}{convertCurrency(Number(formData.amount), formData.currency, baseCurrency).toFixed(2)} {baseCurrency}
                </p>
              </div>
            )}

            {/* Account Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="input-field pl-10"
                  required
                  disabled={loadingAccounts}
                >
                  <option value="">
                    {loadingAccounts ? 'Loading accounts...' : 'Select account'}
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountInfo?.name || account.name} - {account.type} ({account.accountInfo?.balance || account.balance ? `$${(account.accountInfo?.balance || account.balance).toLocaleString()}` : 'No balance'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                placeholder="Enter description"
                required
              />
            </div>


            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field pl-10"
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
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {/* Recurring */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="recurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="w-4 h-4 text-violet-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-violet-500"
              />
              <label htmlFor="recurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recurring transaction
              </label>
            </div>

            {formData.isRecurring && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frequency
                </label>
                <div className="relative">
                  <Repeat className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={formData.recurringFrequency}
                    onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value as any })}
                    className="input-field pl-10"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
            )}

            {/* Receipt Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Receipt / Proof of Payment
              </label>
              <div className="flex space-x-2">
                <label className="flex-1 flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-violet-500 transition-colors">
                  <Upload className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.receiptFile ? formData.receiptFile.name : 'Upload file'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Camera className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Transaction
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default TransactionModal;