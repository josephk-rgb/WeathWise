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
  Bookmark,
  Clock
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiService } from '../services/api';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import MarkdownMessage from '../components/Chat/MarkdownMessage';
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
      // Use the new ML proxy endpoint for personalized responses
      const response = await apiService.sendMLChatMessage(messageToSend, "llama3.1:8b", true);
      
      if (!response || !response.response || response.response.trim() === '') {
        throw new Error('Empty response received from AI service');
      }
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        sender: 'ai' as const,
        timestamp: new Date(),
      };
      addChatMessage(aiMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat for user feedback
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I'm having trouble responding right now. Please try again later. (Error: ${error instanceof Error ? error.message : 'Unknown error'})`,
        sender: 'ai' as const,
        timestamp: new Date(),
      };
      addChatMessage(errorMessage);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-20 w-full">
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

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8" style={{ height: 'calc(100vh - 200px)' }}>
          {/* Financial Context Panel */}
          <div className="xl:col-span-1 space-y-6 overflow-y-auto h-full max-h-full">
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
          <div className="xl:col-span-3 flex flex-col h-full">
            <Card className="flex-1 flex flex-col h-full">
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
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
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
                
                {chatMessages.map((msg, index) => {
                  const isLastMessage = index === chatMessages.length - 1;
                  return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-6 group`}
                  >
                    <div
                      className={`max-w-2xl rounded-lg transition-all duration-200 ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25 px-6 py-4 min-w-[200px]'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm hover:shadow-md px-4 py-3'
                      } ${isLastMessage ? 'animate-in slide-in-from-bottom-2 duration-300' : ''}`}
                    >
                      <div className={`flex items-start ${msg.sender === 'user' ? 'space-x-4' : 'space-x-3'}`}>
                        {msg.sender === 'ai' && (
                          <Bot className="w-5 h-5 mt-0.5 text-violet-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          {msg.imageUrl && (
                            <img 
                              src={msg.imageUrl} 
                              alt="Uploaded" 
                              className="max-w-full h-32 object-cover rounded mb-2"
                            />
                          )}
                          <div className={msg.sender === 'user' ? 'user-message' : 'chat-message'}>
                            <MarkdownMessage 
                              content={msg.content} 
                              isAI={msg.sender === 'ai'} 
                            />
                          </div>
                          <div className={`flex items-center justify-between pt-3 ${
                            msg.sender === 'user' 
                              ? 'mt-4 border-t border-white/10' 
                              : 'mt-3 border-t border-gray-200/50 dark:border-gray-600/30'
                          }`}>
                            <div className={`text-xs font-medium ${
                              msg.sender === 'user' 
                                ? 'text-white/80' 
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {msg.sender === 'ai' ? 'WeathWise AI' : 'You'}
                            </div>
                            <div className={`flex items-center space-x-1 text-xs transition-all duration-200 group-hover:opacity-100 ${
                              msg.sender === 'user' 
                                ? 'text-white/70 group-hover:text-white/90' 
                                : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'
                            }`}>
                              <Clock className="w-3 h-3" />
                              <span>
                                {(() => {
                                  const now = new Date();
                                  const msgDate = new Date(msg.timestamp);
                                  const isToday = msgDate.toDateString() === now.toDateString();
                                  const isYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === msgDate.toDateString();
                                  
                                  if (isToday) {
                                    return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                  } else if (isYesterday) {
                                    return `Yesterday ${msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                  } else {
                                    return msgDate.toLocaleDateString([], { 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    });
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {msg.sender === 'user' && (
                          <User className="w-5 h-5 mt-0.5 text-white flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}

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
              <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
