import React from 'react';
import { Globe, Bell, Shield, Palette, Database } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useUser } from '../contexts/UserContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import AdminMockData from '../components/Admin/AdminMockData';
import { CURRENCIES } from '../utils/currency';

const Settings: React.FC = () => {
  const { darkMode, toggleDarkMode, currency, setCurrency } = useStore();
  const { userProfile } = useUser();

  // Debug: Log admin check
  console.log('🔍 DEBUG - Settings page userProfile:', userProfile);
  console.log('🔍 DEBUG - Settings page role:', userProfile?.role);
  console.log('🔍 DEBUG - Settings page userProfile.id:', userProfile?.id);
  console.log('🔍 DEBUG - Settings page userProfile._id:', userProfile?._id);
  console.log('🔍 DEBUG - Is admin check:', userProfile?.role === 'admin');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize your WealthWise experience
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <Card>
          <div className="flex items-center mb-4">
            <Palette className="w-5 h-5 text-violet-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Appearance
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Switch between light and dark themes
                </p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-violet-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Currency */}
        <Card>
          <div className="flex items-center mb-4">
            <Globe className="w-5 h-5 text-violet-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Currency & Region
            </h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Primary Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-field max-w-xs"
              >
                {Object.entries(CURRENCIES).map(([code, info]) => (
                  <option key={code} value={code}>
                    {info.symbol} {code} - {info.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-violet-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Budget Alerts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get notified when you're close to budget limits
                </p>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-violet-500">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Goal Reminders</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reminders about your savings goals progress
                </p>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-violet-500">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Investment Updates</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Market updates and portfolio performance alerts
                </p>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
              </button>
            </div>
          </div>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <div className="flex items-center mb-4">
            <Shield className="w-5 h-5 text-violet-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Privacy & Security
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Data Export</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Download your financial data
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Database className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </Card>

        {/* AI Settings */}
        <Card>
          <div className="flex items-center mb-4">
            <div className="w-5 h-5 bg-gradient-to-r from-violet-500 to-magenta-500 rounded mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              AI Assistant
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Personalized Recommendations</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Allow AI to analyze your data for better advice
                </p>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-violet-500">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Chat History</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Save conversations for better context
                </p>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-violet-500">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
              </button>
            </div>
          </div>
        </Card>

        {/* Admin Mock Data Section */}
        <AdminMockData 
          isAdmin={userProfile?.role === 'admin'} 
          currentUserId={userProfile?.id || userProfile?._id} 
        />

        {/* Danger Zone */}
        <Card>
          <div className="flex items-center mb-4">
            <div className="w-5 h-5 bg-red-500 rounded mr-2" />
            <h2 className="text-lg font-semibold text-red-600">
              Danger Zone
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Delete Account</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                Delete Account
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;