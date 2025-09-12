import React, { useState, useEffect } from 'react';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import { Account } from '../../types';

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (accountData: Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  account?: Account | null;
  loading?: boolean;
}

const AccountFormModal: React.FC<AccountFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  account,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking' as Account['type'],
    institution: '',
    balance: 0,
    currency: 'USD',
    interestRate: 0,
    isActive: true,
    accountNumber: '',
    routingNumber: '',
    notes: ''
  });

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        type: account.type,
        institution: account.institution,
        balance: account.balance,
        currency: account.currency,
        interestRate: account.interestRate || 0,
        isActive: account.isActive,
        accountNumber: account.accountNumber || '',
        routingNumber: account.routingNumber || '',
        notes: account.notes || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'checking',
        institution: '',
        balance: 0,
        currency: 'USD',
        interestRate: 0,
        isActive: true,
        accountNumber: '',
        routingNumber: '',
        notes: ''
      });
    }
  }, [account, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : 
               type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               value
    }));
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} size="lg">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          {account ? 'Edit Account' : 'Add New Account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="account-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Name
              </label>
              <input
                id="account-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Chase Checking"
              />
            </div>

            <div>
              <label htmlFor="account-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Type
              </label>
              <select
                id="account-type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="money_market">Money Market</option>
                <option value="cd">Certificate of Deposit</option>
                <option value="credit_card">Credit Card</option>
                <option value="loan">Loan</option>
                <option value="investment">Investment</option>
                <option value="retirement">Retirement</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="institution" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Institution
              </label>
              <input
                id="institution"
                type="text"
                name="institution"
                value={formData.institution}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Chase Bank"
              />
            </div>

            <div>
              <label htmlFor="balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Balance
              </label>
              <input
                id="balance"
                type="number"
                name="balance"
                value={formData.balance}
                onChange={handleInputChange}
                required
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="JPY">JPY</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Interest Rate (%)
              </label>
              <input
                type="number"
                name="interestRate"
                value={formData.interestRate}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Number
              </label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="****1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Routing Number
              </label>
              <input
                type="text"
                name="routingNumber"
                value={formData.routingNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="123456789"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Account is active</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Optional notes about this account..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : account ? 'Update Account' : 'Add Account'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AccountFormModal;
