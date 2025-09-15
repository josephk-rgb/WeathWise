import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Play, 
  Trash2, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  User, 
  Database, 
  TrendingUp, 
  Shield,
  Download,
  Upload,
  RefreshCw,
  Eye,
  BarChart3
} from 'lucide-react';
import Button from '../UI/Button';
import Card from '../UI/Card';
import { apiService } from '../../services/api';
import { 
  PersonaInfo, 
  PersonaLoadOptions, 
  PersonaLoadResult, 
  PersonaStatus, 
  PersonaSummary,
  PersonaValidationResult,
  PersonaSystemHealth
} from '../../types';

interface AdminPersonaDataProps {
  isAdmin: boolean;
  currentUserId?: string;
}

const AdminPersonaData: React.FC<AdminPersonaDataProps> = ({ isAdmin, currentUserId }) => {
  // Debug logging
  console.log('🔍 AdminPersonaData - isAdmin:', isAdmin);
  console.log('🔍 AdminPersonaData - currentUserId:', currentUserId);
  console.log('🔍 AdminPersonaData - typeof currentUserId:', typeof currentUserId);

  const [availablePersonas, setAvailablePersonas] = useState<string[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [personaInfo, setPersonaInfo] = useState<PersonaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [personaStatus, setPersonaStatus] = useState<PersonaStatus | null>(null);
  const [validationResult, setValidationResult] = useState<PersonaValidationResult | null>(null);
  const [systemHealth, setSystemHealth] = useState<PersonaSystemHealth | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loadOptions, setLoadOptions] = useState<PersonaLoadOptions>({
    clearExistingData: true,
    generateHistoricalData: true,
    batchSize: 1000,
    validateData: true
  });

  // Load available personas on mount
  useEffect(() => {
    if (isAdmin) {
      loadAvailablePersonas();
      loadSystemHealth();
      if (currentUserId) {
        loadPersonaStatus(currentUserId);
      }
    }
  }, [isAdmin, currentUserId]);

  // Load persona info when selection changes
  useEffect(() => {
    if (selectedPersona) {
      loadPersonaInfo(selectedPersona);
    }
  }, [selectedPersona]);

  const loadAvailablePersonas = async () => {
    try {
      const response = await apiService.getAvailablePersonas();
      if (response.success) {
        setAvailablePersonas(response.data.personas);
        if (response.data.personas.length > 0) {
          setSelectedPersona(response.data.personas[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load available personas:', error);
      setMessage({ type: 'error', text: 'Failed to load available personas' });
    }
  };

  const loadPersonaInfo = async (personaName: string) => {
    try {
      const response = await apiService.getPersonaInfo(personaName);
      if (response.success) {
        setPersonaInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to load persona info:', error);
      setMessage({ type: 'error', text: 'Failed to load persona information' });
    }
  };

  const loadPersonaStatus = async (userId: string) => {
    try {
      const response = await apiService.getPersonaStatus(userId);
      if (response.success) {
        setPersonaStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load persona status:', error);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const response = await apiService.getPersonaSystemHealth();
      if (response.success) {
        setSystemHealth(response.data);
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
    }
  };

  const handleLoadPersonaData = async () => {
    if (!selectedPersona || !currentUserId) {
      setMessage({ type: 'error', text: 'Please select a persona and ensure user ID is available' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await apiService.loadPersonaData(currentUserId, selectedPersona, loadOptions);
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: `Persona data loaded successfully! Created ${Object.values(response.data.recordsCreated).reduce((sum: number, count: any) => sum + count, 0)} records in ${response.data.processingTime}ms` 
        });
        
        // Reload status after successful load
        await loadPersonaStatus(currentUserId);
        
        // Show validation result if there were errors
        if (response.data.errors && response.data.errors.length > 0) {
          setMessage({ 
            type: 'warning', 
            text: `Data loaded with ${response.data.errors.length} warnings: ${response.data.errors.join(', ')}` 
          });
        }
      } else {
        setMessage({ 
          type: 'error', 
          text: response.message || 'Failed to load persona data' 
        });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load persona data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateData = async () => {
    if (!currentUserId) {
      setMessage({ type: 'error', text: 'User ID is required for validation' });
      return;
    }

    setIsValidating(true);
    setMessage(null);
    
    try {
      const response = await apiService.validatePersonaData(currentUserId);
      
      if (response.success) {
        setValidationResult(response.data);
        
        if (response.data.isValid) {
          setMessage({ 
            type: 'success', 
            text: `Data validation passed! Score: ${response.data.score}/100` 
          });
        } else {
          setMessage({ 
            type: 'warning', 
            text: `Data validation found ${response.data.issues.length} issues (Score: ${response.data.score}/100)` 
          });
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to validate data' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to validate data' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleClearData = async () => {
    console.log('🔧 [DEBUG] Clear data initiated:', {
      currentUserId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });

    if (!currentUserId) {
      console.error('❌ [DEBUG] No currentUserId available');
      setMessage({ type: 'error', text: 'User ID is required to clear data' });
      return;
    }

    if (!window.confirm('Are you sure you want to clear all persona data? This action cannot be undone.\n\nThis operation will:\n- Create a backup of all data\n- Delete all transactions, investments, accounts, and other persona data\n- Take several minutes to complete')) {
      console.log('🔧 [DEBUG] User cancelled clear data operation');
      return;
    }

    console.log('🔧 [DEBUG] Starting clear data operation:', {
      userId: currentUserId,
      confirm: true,
      backup: true,
      timestamp: new Date().toISOString()
    });

    setIsClearing(true);
    setMessage({ type: 'warning', text: 'Clearing data and creating backup... This may take several minutes. Please wait.' });
    
    const startTime = Date.now();
    
    try {
      console.log('🚀 [DEBUG] Calling apiService.clearPersonaData...');
      const response = await apiService.clearPersonaData(currentUserId, true, true);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('✅ [DEBUG] Clear data response received:', {
        success: response.success,
        message: response.message,
        data: response.data,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: `Data cleared successfully! Deleted ${response.data.recordsDeleted} records. Backup created: ${response.data.backupCreated ? 'Yes' : 'No'}` 
        });
        setPersonaStatus(null);
        setValidationResult(null);
      } else {
        console.error('❌ [DEBUG] Clear data failed:', response);
        setMessage({ type: 'error', text: 'Failed to clear data' });
      }
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.error('❌ [DEBUG] Clear data error:', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      if (error.message.includes('timed out')) {
        setMessage({ 
          type: 'warning', 
          text: 'Request timed out, but the operation may still be running on the server. Please check the backend logs or try again in a few minutes.' 
        });
      } else {
        setMessage({ type: 'error', text: error.message || 'Failed to clear data' });
      }
    } finally {
      console.log('🔧 [DEBUG] Clear data operation completed, setting isClearing to false');
      setIsClearing(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const response = await apiService.createPersonaBackup(currentUserId, selectedPersona, true);
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: `Backup created successfully: ${response.data.backupName}` 
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to create backup' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to create backup' });
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Main Persona Management Card */}
      <Card>
        <div className="flex items-center mb-4">
          <Users className="w-5 h-5 text-violet-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Persona Data Management
          </h2>
        </div>
        
        {/* Status Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : message.type === 'warning'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : message.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 mr-2" />
            ) : (
              <AlertCircle className="w-4 h-4 mr-2" />
            )}
            {message.text}
          </div>
        )}

        {/* Persona Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Persona
          </label>
          <select
            value={selectedPersona}
            onChange={(e) => setSelectedPersona(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Select a persona...</option>
            {availablePersonas.map((persona) => (
              <option key={persona} value={persona}>
                {persona.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Persona Information */}
        {personaInfo && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              {personaInfo.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {personaInfo.description}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <strong>Financial Story:</strong> {personaInfo.financialStory}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Net Worth Journey:</strong> {personaInfo.netWorthJourney}
            </p>
          </div>
        )}

        {/* Current Data Status */}
        {personaStatus && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
              <Database className="w-4 h-4 mr-2" />
              Current Data Status
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Accounts:</span>
                <span className="ml-2 font-medium">{personaStatus.recordCounts.accounts}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Transactions:</span>
                <span className="ml-2 font-medium">{personaStatus.recordCounts.transactions}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Investments:</span>
                <span className="ml-2 font-medium">{personaStatus.recordCounts.investments}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Goals:</span>
                <span className="ml-2 font-medium">{personaStatus.recordCounts.goals}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Debts:</span>
                <span className="ml-2 font-medium">{personaStatus.recordCounts.debts}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Budgets:</span>
                <span className="ml-2 font-medium">{personaStatus.recordCounts.budgets}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Net Worth Milestones:</span>
                <span className="ml-2 font-medium">{personaStatus.recordCounts.netWorthMilestones}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total Records:</span>
                <span className="ml-2 font-medium">{personaStatus.totalRecords}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Debug button states */}
          {process.env.NODE_ENV === 'development' && (
            <div className="w-full p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs mb-2">
              <div>Debug: selectedPersona={selectedPersona}, isLoading={isLoading.toString()}, currentUserId={currentUserId}</div>
              <div>Load button disabled: {(!selectedPersona || isLoading || !currentUserId).toString()}</div>
              <div>Validate button disabled: {(isValidating || !currentUserId).toString()}</div>
              <div>Backup button disabled: {(!currentUserId).toString()}</div>
              <div>Clear button disabled: {(isClearing || !currentUserId).toString()}</div>
            <div>Available personas: {availablePersonas.length}</div>
            <div>Is admin: {isAdmin.toString()}</div>
          </div>
        )}
          <Button
            onClick={handleLoadPersonaData}
            disabled={!selectedPersona || isLoading || !currentUserId}
            className="flex items-center"
          >
            {isLoading ? (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Load Persona Data
          </Button>

          <Button
            onClick={handleValidateData}
            disabled={isValidating || !currentUserId}
            variant="secondary"
            className="flex items-center"
          >
            {isValidating ? (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Validate Data
          </Button>

          <Button
            onClick={handleCreateBackup}
            disabled={!currentUserId}
            variant="secondary"
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Create Backup
          </Button>

          <Button
            onClick={() => setShowAdvanced(!showAdvanced)}
            variant="secondary"
            className="flex items-center"
          >
            <Settings className="w-4 h-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </Button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Advanced Options</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={loadOptions.clearExistingData}
                  onChange={(e) => setLoadOptions(prev => ({ ...prev, clearExistingData: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Clear existing data before loading</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={loadOptions.generateHistoricalData}
                  onChange={(e) => setLoadOptions(prev => ({ ...prev, generateHistoricalData: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Generate historical data</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={loadOptions.validateData}
                  onChange={(e) => setLoadOptions(prev => ({ ...prev, validateData: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Validate data after loading</span>
              </label>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Batch Size: {loadOptions.batchSize}
                </label>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={loadOptions.batchSize}
                  onChange={(e) => setLoadOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleClearData}
            disabled={isClearing || !currentUserId}
            variant="danger"
            className="flex items-center"
          >
            {isClearing ? (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Clear All Data
          </Button>
        </div>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <div className="flex items-center mb-4">
            <Shield className="w-5 h-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Validation Results
            </h3>
            <div className="ml-auto">
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                validationResult.isValid 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                Score: {validationResult.score}/100
              </span>
            </div>
          </div>

          {validationResult.issues.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Issues Found</h4>
              <div className="space-y-2">
                {validationResult.issues.map((issue, index) => (
                  <div key={index} className={`p-3 rounded-lg ${
                    issue.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20' :
                    issue.severity === 'high' ? 'bg-orange-50 dark:bg-orange-900/20' :
                    issue.severity === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                    'bg-blue-50 dark:bg-blue-900/20'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium mr-2 ${
                          issue.severity === 'critical' ? 'bg-red-200 text-red-800' :
                          issue.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                          issue.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>
                          {issue.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {issue.message}
                        </span>
                      </div>
                    </div>
                    {issue.suggestedFix && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <strong>Suggested fix:</strong> {issue.suggestedFix}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Warnings</h4>
              <div className="space-y-2">
                {validationResult.warnings.map((warning, index) => (
                  <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {warning.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* System Health */}
      {systemHealth && (
        <Card>
          <div className="flex items-center mb-4">
            <BarChart3 className="w-5 h-5 text-green-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              System Health
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Database</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>Users: {systemHealth.database.users}</div>
                <div>Accounts: {systemHealth.database.accounts}</div>
                <div>Transactions: {systemHealth.database.transactions}</div>
                <div>Investments: {systemHealth.database.investments}</div>
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Snapshots</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>Total: {systemHealth.snapshots.totalSnapshots}</div>
                <div>Today: {systemHealth.snapshots.snapshotsToday}</div>
                <div>This Week: {systemHealth.snapshots.snapshotsThisWeek}</div>
                <div>Avg/User: {systemHealth.snapshots.averageSnapshotsPerUser.toFixed(1)}</div>
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">System</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>Uptime: {Math.floor(systemHealth.system.uptime / 3600)}h</div>
                <div>Memory: {Math.round(systemHealth.system.memoryUsage.used / 1024 / 1024)}MB</div>
                <div>Node: {systemHealth.system.nodeVersion}</div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminPersonaData;
