import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Image, History } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { apiService } from '../../services/api';
import { ChatSessionManager } from '../../utils/chatSessionManager';
import Button from '../UI/Button';
import ChatHistory from './ChatHistory';

const ChatWidget: React.FC = () => {
  const { 
    isChatOpen, 
    setChatOpen, 
    chatMessages, 
    addChatMessage,
    setChatMessages,
    currentSessionId,
    setCurrentSessionId
  } = useStore();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(currentSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    // Generate session ID if none exists
    let sessionId = currentSession;
    if (!sessionId) {
      const newSession = ChatSessionManager.createSession();
      sessionId = newSession.id;
      setCurrentSession(sessionId);
      setCurrentSessionId(sessionId);
    }

    const userMessage = {
      id: Date.now().toString(),
      content: message,
      sender: 'user' as const,
      timestamp: new Date(),
      imageUrl: selectedImage ? URL.createObjectURL(selectedImage) : undefined,
    };

    addChatMessage(userMessage);
    
    // Update session with user message
    ChatSessionManager.updateSessionWithMessage(sessionId, message, true);
    
    setMessage('');
    setSelectedImage(null);
    setIsTyping(true);

    try {
      // Use the new ML proxy endpoint for personalized responses
      const response = await apiService.sendMLChatMessage(message, "llama3.1:8b", true);
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: response.response || response.data?.response || 'No response received',
        sender: 'ai' as const,
        timestamp: new Date(),
      };
      addChatMessage(aiMessage);
      
      // Update session with AI response
      ChatSessionManager.updateSessionWithMessage(sessionId, aiMessage.content, false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      setCurrentSession(sessionId);
      setCurrentSessionId(sessionId);
      setShowHistory(false);
      
      // Load messages for this session
      const history = await apiService.getMLChatHistory(sessionId);
      if (history && history.messages) {
        const messages = history.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.message_type === 'user' ? 'user' : 'ai',
          timestamp: new Date(msg.timestamp),
          imageUrl: msg.metadata?.imageUrl
        }));
        setChatMessages(messages);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleCreateNewSession = () => {
    const newSession = ChatSessionManager.createSession();
    setCurrentSession(newSession.id);
    setCurrentSessionId(newSession.id);
    setChatMessages([]);
    setShowHistory(false);
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

  if (!isChatOpen) {
    return (
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-violet-500 to-magenta-500 hover:from-violet-600 hover:to-magenta-600 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105 z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-500 to-magenta-500 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-white">WealthWise AI</h3>
            <p className="text-xs text-white text-opacity-80">Your financial assistant</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-white text-opacity-80 hover:text-white transition-colors duration-200"
            title="Chat History"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => setChatOpen(false)}
            className="text-white text-opacity-80 hover:text-white transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat History Sidebar */}
      {showHistory && (
        <div className="absolute top-16 left-0 w-80 h-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10">
          <ChatHistory
            onSelectSession={handleSelectSession}
            onCreateNewSession={handleCreateNewSession}
            className="h-full"
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
            <Bot className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>Hi! I'm your AI financial assistant.</p>
            <p>Ask me anything about your finances!</p>
          </div>
        )}
        
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-violet-500 to-magenta-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              <div className="flex items-start space-x-2">
                {msg.sender === 'ai' && (
                  <Bot className="w-4 h-4 mt-0.5 text-violet-500" />
                )}
                <div className="text-sm">
                  {msg.imageUrl && (
                    <img 
                      src={msg.imageUrl} 
                      alt="Uploaded" 
                      className="max-w-full h-32 object-cover rounded mb-2"
                    />
                  )}
                  <p>{msg.content}</p>
                </div>
                {msg.sender === 'user' && (
                  <User className="w-4 h-4 mt-0.5 text-white" />
                )}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-violet-500" />
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
          <div className="mb-2 relative">
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
        <div className="flex space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-violet-500 transition-colors"
          >
            <Image className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your finances..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm"
          />
          <Button
            onClick={handleSendMessage}
            disabled={(!message.trim() && !selectedImage) || isTyping}
            size="sm"
            className="px-3"
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
    </div>
  );
};

export default ChatWidget;