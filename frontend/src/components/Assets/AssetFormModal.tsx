import React, { useState, useEffect } from 'react';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import { PhysicalAsset } from '../../types';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (assetData: Omit<PhysicalAsset, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  asset?: PhysicalAsset | null;
  loading?: boolean;
}

const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  asset,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'other' as PhysicalAsset['type'],
    currentValue: 0,
    purchasePrice: 0,
    purchaseDate: '',
    currency: 'USD',
    hasLoan: false,
    loanInfo: {
      loanAmount: 0,
      remainingBalance: 0,
      lender: '',
      monthlyPayment: 0,
      interestRate: 0,
      loanTerm: 0,
      startDate: ''
    },
    description: '',
    location: '',
    condition: 'good' as PhysicalAsset['condition'],
    notes: ''
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        type: asset.type,
        currentValue: asset.currentValue,
        purchasePrice: asset.purchasePrice || 0,
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
        currency: asset.currency,
        hasLoan: asset.hasLoan,
        loanInfo: asset.loanInfo ? {
          loanAmount: asset.loanInfo.loanAmount,
          remainingBalance: asset.loanInfo.remainingBalance,
          lender: asset.loanInfo.lender || '',
          monthlyPayment: asset.loanInfo.monthlyPayment,
          interestRate: asset.loanInfo.interestRate || 0,
          loanTerm: asset.loanInfo.loanTerm || 0,
          startDate: asset.loanInfo.startDate ? new Date(asset.loanInfo.startDate).toISOString().split('T')[0] : ''
        } : {
          loanAmount: 0,
          remainingBalance: 0,
          lender: '',
          monthlyPayment: 0,
          interestRate: 0,
          loanTerm: 0,
          startDate: ''
        },
        description: asset.description || '',
        location: asset.location || '',
        condition: asset.condition || 'good',
        notes: asset.notes || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'other',
        currentValue: 0,
        purchasePrice: 0,
        purchaseDate: '',
        currency: 'USD',
        hasLoan: false,
        loanInfo: {
          loanAmount: 0,
          remainingBalance: 0,
          lender: '',
          monthlyPayment: 0,
          interestRate: 0,
          loanTerm: 0,
          startDate: ''
        },
        description: '',
        location: '',
        condition: 'good',
        notes: ''
      });
    }
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    const submitData = {
      ...formData,
      purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : undefined,
      loanInfo: formData.hasLoan ? {
        ...formData.loanInfo,
        startDate: formData.loanInfo.startDate ? new Date(formData.loanInfo.startDate) : new Date()
      } : undefined,
      equity: formData.currentValue - (formData.hasLoan ? formData.loanInfo.remainingBalance : 0)
    };

    try {
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error submitting asset:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name.startsWith('loanInfo.')) {
      const loanField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        loanInfo: {
          ...prev.loanInfo,
          [loanField]: type === 'number' ? Number(value) : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? Number(value) : type === 'checkbox' ? checked : value
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      onClose={onClose}
      size="xl"
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {asset ? 'Edit Asset' : 'Add Asset'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Asset Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Asset Type
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="real_estate">Real Estate</option>
              <option value="vehicle">Vehicle</option>
              <option value="jewelry">Jewelry</option>
              <option value="art">Art</option>
              <option value="collectibles">Collectibles</option>
              <option value="electronics">Electronics</option>
              <option value="furniture">Furniture</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="currentValue" className="block text-sm font-medium text-gray-700 mb-1">
              Current Value
            </label>
            <input
              type="number"
              id="currentValue"
              name="currentValue"
              value={formData.currentValue}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price
            </label>
            <input
              type="number"
              id="purchasePrice"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              id="purchaseDate"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="KES">KES - Kenyan Shilling</option>
            </select>
          </div>

          <div>
            <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              id="condition"
              name="condition"
              value={formData.condition}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Where is this asset located?"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="hasLoan"
            name="hasLoan"
            checked={formData.hasLoan}
            onChange={handleInputChange}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="hasLoan" className="text-sm font-medium text-gray-700">
            This asset has an associated loan
          </label>
        </div>

        {formData.hasLoan && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="col-span-full text-lg font-medium text-gray-900">Loan Information</h4>
            
            <div>
              <label htmlFor="loanInfo.remainingBalance" className="block text-sm font-medium text-gray-700 mb-1">
                Remaining Balance
              </label>
              <input
                type="number"
                id="loanInfo.remainingBalance"
                name="loanInfo.remainingBalance"
                value={formData.loanInfo.remainingBalance}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="loanInfo.lender" className="block text-sm font-medium text-gray-700 mb-1">
                Lender
              </label>
              <input
                type="text"
                id="loanInfo.lender"
                name="loanInfo.lender"
                value={formData.loanInfo.lender}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="loanInfo.monthlyPayment" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Payment
              </label>
              <input
                type="number"
                id="loanInfo.monthlyPayment"
                name="loanInfo.monthlyPayment"
                value={formData.loanInfo.monthlyPayment}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="loanInfo.interestRate" className="block text-sm font-medium text-gray-700 mb-1">
                Interest Rate (%)
              </label>
              <input
                type="number"
                id="loanInfo.interestRate"
                name="loanInfo.interestRate"
                value={formData.loanInfo.interestRate}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe this asset..."
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            variant="primary"
          >
            {loading 
              ? (asset ? 'Updating...' : 'Adding...') 
              : (asset ? 'Update Asset' : 'Add Asset')
            }
          </Button>
        </div>
      </form>
      </div>
    </Modal>
  );
};

export default AssetFormModal;
