import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Image, 
  Mic, 
  MicOff,
  TrendingUp,
  DollarSign,
  Target,
  CreditCard,
  Lightbulb,
  History,
  Bookmark
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { formatCurrency } from '../utils/currency';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  prompt: string;
}

const TalkToFinances: React.FC = () => {
  const { 
    chatMessages, 
    addChatMessage, 
    transactions, 
    investments, 
    goals,
    currency 
  } = useStore();
  
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick actions for common financial questions
  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Portfolio Analysis',
      description: 'Get insights about your investments',
      icon: TrendingUp,
      prompt: 'Analyze my current portfolio and provide recommendations for diversification.'
    },
    {
      id: '2',
      title: 'Budget Review',
      description: 'Review your spending patterns',
      icon: DollarSign,
      prompt: 'Review my recent spending and suggest ways to improve my budget.'
    },
    {
      id: '3',
      title: 'Goal Planning',
      description: 'Plan your financial goals',
      icon: Target,
      prompt: 'Help me create a plan to achieve my financial goals.'
    },
    {
      id: '4',
      title: 'Expense Analysis',
      description: 'Analyze your expenses',
      icon: CreditCard,
      prompt: 'Analyze my expenses and identify areas where I can save money.'
    },
    {
      id: '5',
      title: 'Investment Advice',
      description: 'Get investment recommendations',
      icon: Lightbulb,
      prompt: 'What investment opportunities should I consider based on my current financial situation?'
    },
    {
      id: '6',
      title: 'Financial Health',
      description: 'Check your financial health score',
      icon: TrendingUp,
      prompt: 'Assess my overall financial health and provide actionable recommendations.'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || message;
    if (!messageToSend.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      content: messageToSend,
      sender: 'user' as const,
      timestamp: new Date(),
      imageUrl: selectedImage ? URL.createObjectURL(selectedImage) : undefined,
    };

    addChatMessage(userMessage);
    setMessage('');
    setSelectedImage(null);
    setIsTyping(true);

    try {
      const response = await apiService.sendChatMessage(messageToSend, { image: selectedImage });
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'ai' as const,
        timestamp: new Date(),
      };
      addChatMessage(aiMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSendMessage(action.prompt);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording functionality
  };

  // Ensure arrays are always arrays for calculations
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeInvestments = Array.isArray(investments) ? investments : [];

  // Calculate financial summary
  const totalIncome = safeTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = Math.abs(safeTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0));

  const portfolioValue = safeInvestments.reduce((sum, inv) => 
    sum + (inv.shares * inv.currentPrice), 0);

  const netWorth = totalIncome - totalExpenses + portfolioValue;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-20">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Talk to my Finances
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Your AI financial assistant is here to help you make better financial decisions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowQuickActions(!showQuickActions)}
                variant="outline"
                size="sm"
              >
                {showQuickActions ? 'Hide' : 'Show'} Quick Actions
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Financial Context Panel */}
          <div className="xl:col-span-1 space-y-6">
            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <DollarSign className="w-5 h-5 text-violet-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Financial Summary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Net Worth</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(netWorth, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Portfolio Value</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(portfolioValue, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Monthly Income</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(totalIncome / 6, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Monthly Expenses</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(totalExpenses / 6, currency)}
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <Target className="w-5 h-5 text-violet-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Active Goals</h3>
              </div>
              <div className="space-y-3">
                {goals.slice(0, 3).map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {goal.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(goal.currentAmount, currency)} / {formatCurrency(goal.targetAmount, currency)}
                      </p>
                    </div>
                    <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                        style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {showQuickActions && (
              <Card>
                <div className="flex items-center space-x-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-violet-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
                </div>
                <div className="space-y-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action)}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-5 h-5 text-violet-500" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {action.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {action.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Main Chat Interface */}
          <div className="xl:col-span-3">
            <Card className="h-[700px] flex flex-col">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">WealthWise AI</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your financial assistant</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <History className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Bookmark className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Welcome to your AI Financial Assistant
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      I'm here to help you analyze your finances, plan your goals, and make better financial decisions. 
                      Ask me anything about your money!
                    </p>
                    <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                      {quickActions.slice(0, 4).map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.id}
                            onClick={() => handleQuickAction(action)}
                            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200 text-left"
                          >
                            <Icon className="w-4 h-4 text-violet-500 mb-1" />
                            <p className="text-xs font-medium text-gray-900 dark:text-white">
                              {action.title}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-lg ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {msg.sender === 'ai' && (
                          <Bot className="w-5 h-5 mt-0.5 text-violet-500 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          {msg.imageUrl && (
                            <img 
                              src={msg.imageUrl} 
                              alt="Uploaded" 
                              className="max-w-full h-32 object-cover rounded mb-2"
                            />
                          )}
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-2">
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        {msg.sender === 'user' && (
                          <User className="w-5 h-5 mt-0.5 text-white flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Bot className="w-5 h-5 text-violet-500" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                {selectedImage && (
                  <div className="mb-3 relative inline-block">
                    <img 
                      src={URL.createObjectURL(selectedImage)} 
                      alt="Selected" 
                      className="h-16 w-16 object-cover rounded border"
                    />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="flex space-x-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-violet-500 transition-colors"
                  >
                    <Image className="w-5 h-5" />
                  </button>
                  <button
                    onClick={toggleRecording}
                    className={`p-2 transition-colors ${
                      isRecording 
                        ? 'text-red-500' 
                        : 'text-gray-400 hover:text-violet-500'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your finances, upload receipts, or get advice..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm"
                  />
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={(!message.trim() && !selectedImage) || isTyping}
                    size="sm"
                    className="px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalkToFinances;
