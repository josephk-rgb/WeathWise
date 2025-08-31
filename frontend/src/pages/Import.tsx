import React, { useState } from 'react';
import { Upload, FileText, CreditCard, Smartphone, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

interface ImportFile {
  id: string;
  name: string;
  type: 'bank' | 'broker' | 'mpesa';
  size: string;
  status: 'processing' | 'completed' | 'failed';
  transactionsImported: number;
  uploadDate: Date;
}

const Import: React.FC = () => {
  const { } = useStore();
  const [dragActive, setDragActive] = useState(false);
  const [selectedType, setSelectedType] = useState<'bank' | 'broker' | 'mpesa'>('bank');
  const [importHistory, setImportHistory] = useState<ImportFile[]>([
    {
      id: '1',
      name: 'bank_statement_march_2024.pdf',
      type: 'bank',
      size: '2.4 MB',
      status: 'completed',
      transactionsImported: 47,
      uploadDate: new Date('2024-03-15')
    },
    {
      id: '2',
      name: 'mpesa_statement_february.csv',
      type: 'mpesa',
      size: '1.8 MB',
      status: 'processing',
      transactionsImported: 0,
      uploadDate: new Date('2024-03-10')
    }
  ]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    files.forEach(file => {
      const newImport: ImportFile = {
        id: Date.now().toString(),
        name: file.name,
        type: selectedType,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        status: 'processing',
        transactionsImported: 0,
        uploadDate: new Date()
      };
      
      setImportHistory(prev => [newImport, ...prev]);
      
      // Simulate processing
      setTimeout(() => {
        setImportHistory(prev => prev.map(item => 
          item.id === newImport.id 
            ? { ...item, status: 'completed', transactionsImported: Math.floor(Math.random() * 50) + 10 }
            : item
        ));
      }, 3000);
    });
  };

  const getStatusIcon = (status: ImportFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getTypeIcon = (type: ImportFile['type']) => {
    switch (type) {
      case 'bank':
        return <CreditCard className="w-5 h-5 text-blue-500" />;
      case 'broker':
        return <FileText className="w-5 h-5 text-purple-500" />;
      case 'mpesa':
        return <Smartphone className="w-5 h-5 text-green-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
          Import Statements
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload your bank statements, broker reports, and M-Pesa statements to automatically import transactions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Upload New Statement
            </h3>
            
            {/* Statement Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Statement Type
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setSelectedType('bank')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedType === 'bank'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <CreditCard className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Bank Statement</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">PDF, CSV, Excel</div>
                </button>
                
                <button
                  onClick={() => setSelectedType('broker')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedType === 'broker'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <FileText className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Broker Statement</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">PDF, CSV</div>
                </button>
                
                <button
                  onClick={() => setSelectedType('mpesa')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedType === 'mpesa'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <Smartphone className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">M-Pesa Statement</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">PDF, CSV</div>
                </button>
              </div>
            </div>

            {/* File Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Drop your files here, or click to browse
              </h4>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Supports PDF, CSV, and Excel files up to 10MB
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button>
                Choose Files
              </Button>
            </div>

            {/* Processing Info */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                What happens after upload?
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• AI automatically extracts transaction data</li>
                <li>• Transactions are categorized and matched</li>
                <li>• You can review and approve before importing</li>
                <li>• Duplicate transactions are automatically detected</li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Import History */}
        <div>
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Import History
            </h3>
            
            <div className="space-y-4">
              {importHistory.map((item) => (
                <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(item.type)}
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.name}
                      </div>
                    </div>
                    {getStatusIcon(item.status)}
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <div>Size: {item.size}</div>
                    <div>Uploaded: {item.uploadDate.toLocaleDateString()}</div>
                    {item.status === 'completed' && (
                      <div className="text-green-600 dark:text-green-400 font-medium">
                        {item.transactionsImported} transactions imported
                      </div>
                    )}
                    {item.status === 'processing' && (
                      <div className="text-yellow-600 dark:text-yellow-400">
                        Processing...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {importHistory.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No imports yet. Upload your first statement to get started.
                </p>
              </div>
            )}
          </Card>

          {/* Supported Formats */}
          <Card className="mt-6">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
              Supported Formats
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Bank Statements</span>
                <span className="text-gray-900 dark:text-gray-100">PDF, CSV, Excel</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Broker Reports</span>
                <span className="text-gray-900 dark:text-gray-100">PDF, CSV</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">M-Pesa Statements</span>
                <span className="text-gray-900 dark:text-gray-100">PDF, CSV</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Import;