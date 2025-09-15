import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign, Home, Car, CreditCard, Building, Gem } from 'lucide-react';
import { apiService } from '../services/api';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import AccountFormModal from '../components/Assets/AccountFormModal';
import AssetFormModal from '../components/Assets/AssetFormModal.tsx';
import { useUser } from '../contexts/UserContext';
import { Account, PhysicalAsset } from '../types';

const AssetsPage: React.FC = () => {
  const { isAuthenticated, isLoading, userProfile } = useUser();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [physicalAssets, setPhysicalAssets] = useState<PhysicalAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingAsset, setEditingAsset] = useState<PhysicalAsset | null>(null);

  useEffect(() => {
    const userId = userProfile?.id || (userProfile as any)?._id;
    if (isAuthenticated && !isLoading && userId) {
      loadAssetsData();
    }
  }, [isAuthenticated, isLoading, userProfile?.id, (userProfile as any)?._id]);

  const loadAssetsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [accountsData, assetsData] = await Promise.all([
        apiService.getAccounts(),
        apiService.getAssets()
      ]);
      
      console.log('🔍 Accounts data received:', accountsData);
      console.log('🔍 Assets data received:', assetsData);
      setAccounts(accountsData);
      setPhysicalAssets(assetsData);
    } catch (error) {
      console.error('Error loading assets data:', error);
      setError('Failed to load assets data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSave = async (accountData: any) => {
    try {
      if (editingAccount) {
        await apiService.updateAccount(editingAccount.id, accountData);
      } else {
        await apiService.createAccount(accountData);
      }
      
      await loadAssetsData();
      setShowAccountForm(false);
      setEditingAccount(null);
    } catch (error) {
      console.error('Error saving account:', error);
      throw error;
    }
  };

  const handleAssetSave = async (assetData: any) => {
    try {
      if (editingAsset) {
        await apiService.updateAsset(editingAsset.id, assetData);
      } else {
        await apiService.createAsset(assetData);
      }
      
      await loadAssetsData();
      setShowAssetForm(false);
      setEditingAsset(null);
    } catch (error) {
      console.error('Error saving asset:', error);
      throw error;
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      try {
        await apiService.deleteAccount(accountId);
        await loadAssetsData();
      } catch (error) {
        console.error('Error deleting account:', error);
        setError('Failed to delete account. Please try again.');
      }
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (window.confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
      try {
        await apiService.deleteAsset(assetId);
        await loadAssetsData();
      } catch (error) {
        console.error('Error deleting asset:', error);
        setError('Failed to delete asset. Please try again.');
      }
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
      case 'savings':
        return DollarSign;
      case 'credit':
        return CreditCard;
      case 'investment':
        return Building;
      default:
        return DollarSign;
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'real_estate':
        return Home;
      case 'vehicle':
        return Car;
      case 'collectible':
      case 'jewelry':
        return Gem;
      default:
        return DollarSign;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'checking':
        return 'text-blue-500';
      case 'savings':
        return 'text-green-500';
      case 'credit':
        return 'text-red-500';
      case 'investment':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'real_estate':
        return 'text-orange-500';
      case 'vehicle':
        return 'text-blue-500';
      case 'collectible':
        return 'text-purple-500';
      case 'jewelry':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!userProfile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Please log in to view your assets
          </h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8">
        <div className="mb-4 md:mb-0">
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100">
            Assets & Accounts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your accounts, investments, and physical assets
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <Button
            onClick={() => {
              setEditingAccount(null);
              setShowAccountForm(true);
            }}
            className="flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </Button>
          <Button
            onClick={() => {
              setEditingAsset(null);
              setShowAssetForm(true);
            }}
            variant="outline"
            className="flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Financial Accounts Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Financial Accounts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const IconComponent = getAccountIcon(account.type);
            const typeColor = getAccountTypeColor(account.type);
            
            return (
              <Card key={account.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-full bg-gray-100 dark:bg-gray-800`}>
                      <IconComponent className={`w-6 h-6 ${typeColor}`} />
                    </div>
                    <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {account.name || account.accountInfo?.name || 'Unnamed Account'}
                  </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {account.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingAccount(account);
                        setShowAccountForm(true);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Balance:</span>
                    <span className={`text-lg font-semibold ${
                      (account.balance || account.accountInfo?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(account.balance || account.accountInfo?.balance || 0, account.currency || account.accountInfo?.currency || 'USD')}
                    </span>
                  </div>
                  
                  {(account.institution || account.provider?.name) && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Institution:</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {account.institution || account.provider?.name}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
          
          {accounts.length === 0 && (
            <Card className="p-8 text-center col-span-full">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No accounts yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Add your first account to start tracking your finances
              </p>
              <Button 
                onClick={() => {
                  setEditingAccount(null);
                  setShowAccountForm(true);
                }}
              >
                Add Your First Account
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Physical Assets Section */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Physical Assets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {physicalAssets.map((asset) => {
            const IconComponent = getAssetIcon(asset.type);
            const typeColor = getAssetTypeColor(asset.type);
            const hasLoan = asset.loanInfo && asset.loanInfo.remainingBalance > 0;
            
            return (
              <Card key={asset.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-full bg-gray-100 dark:bg-gray-800`}>
                      <IconComponent className={`w-6 h-6 ${typeColor}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {asset.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {asset.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingAsset(asset);
                        setShowAssetForm(true);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Current Value:</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(asset.currentValue)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Equity:</span>
                    <span className="text-lg font-semibold text-green-600">
                      {formatCurrency(asset.equity || 0)}
                    </span>
                  </div>
                  
                  {hasLoan && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Loan Balance:</span>
                        <span className="text-sm font-medium text-red-600">
                          {formatCurrency(asset.loanInfo!.remainingBalance)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Lender:</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {asset.loanInfo!.lender}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {asset.purchasePrice && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Purchase Price:</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(asset.purchasePrice)}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
          
          {physicalAssets.length === 0 && (
            <Card className="p-8 text-center col-span-full">
              <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No physical assets yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Track your real estate, vehicles, and other valuable assets to get a complete picture of your net worth.
              </p>
              <Button 
                onClick={() => {
                  setEditingAsset(null);
                  setShowAssetForm(true);
                }}
              >
                Add Your First Asset
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Account Form Modal */}
      {showAccountForm && (
        <AccountFormModal
          isOpen={showAccountForm}
          account={editingAccount}
          onClose={() => {
            setShowAccountForm(false);
            setEditingAccount(null);
          }}
          onSubmit={handleAccountSave}
        />
      )}

      {/* Asset Form Modal */}
      {showAssetForm && (
        <AssetFormModal
          isOpen={showAssetForm}
          asset={editingAsset}
          onClose={() => {
            setShowAssetForm(false);
            setEditingAsset(null);
          }}
          onSubmit={handleAssetSave}
        />
      )}
    </div>
  );
};

export default AssetsPage;
