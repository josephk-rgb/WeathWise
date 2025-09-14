import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  SortAsc, 
  SortDesc, 
  MessageSquare, 
  Clock, 
  Trash2, 
  Download,
  Plus,
  Filter,
  X
} from 'lucide-react';
import { useStore, ChatSession, ChatHistoryFilters } from '../../store/useStore';
import { apiService } from '../../services/api';
import { ChatSessionManager } from '../../utils/chatSessionManager';
import Button from '../UI/Button';
import Card from '../UI/Card';

interface ChatHistoryProps {
  onSelectSession: (sessionId: string) => void;
  onCreateNewSession: () => void;
  className?: string;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ 
  onSelectSession, 
  onCreateNewSession,
  className = '' 
}) => {
  const { 
    chatSessions, 
    setChatSessions, 
    chatHistoryFilters, 
    setChatHistoryFilters,
    clearChatHistoryFilters,
    currentSessionId 
  } = useStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(chatHistoryFilters.searchTerm);

  // Load chat sessions on component mount
  useEffect(() => {
    loadChatSessions();
  }, []);

  // Update search query when filters change
  useEffect(() => {
    setSearchQuery(chatHistoryFilters.searchTerm);
  }, [chatHistoryFilters.searchTerm]);

  const loadChatSessions = async () => {
    setIsLoading(true);
    try {
      const sessions = ChatSessionManager.getSessions();
      const chatSessions: ChatSession[] = sessions.map(session => ({
        id: session.id,
        title: session.title,
        lastMessage: session.lastMessage,
        messageCount: session.messageCount,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        isActive: session.id === currentSessionId
      }));
      setChatSessions(chatSessions);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      setChatSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setChatHistoryFilters({ searchTerm: query });
  };

  const handleSortChange = (sortBy: 'newest' | 'oldest' | 'mostMessages') => {
    setChatHistoryFilters({ sortBy });
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setChatHistoryFilters({ 
      dateRange: { start, end } 
    });
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this chat session?')) return;
    
    try {
      ChatSessionManager.deleteSession(sessionId);
      setChatSessions(chatSessions.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleExportSession = async (sessionId: string) => {
    try {
      const blob = await apiService.exportChatSession(sessionId, 'json');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-session-${sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export session:', error);
    }
  };

  // Filter and sort sessions
  const filteredSessions = chatSessions
    .filter(session => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return session.title.toLowerCase().includes(query) || 
               session.lastMessage.toLowerCase().includes(query);
      }
      return true;
    })
    .filter(session => {
      // Date range filter
      if (chatHistoryFilters.dateRange.start) {
        if (session.updatedAt < chatHistoryFilters.dateRange.start) return false;
      }
      if (chatHistoryFilters.dateRange.end) {
        if (session.updatedAt > chatHistoryFilters.dateRange.end) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (chatHistoryFilters.sortBy) {
        case 'oldest':
          return a.updatedAt.getTime() - b.updatedAt.getTime();
        case 'mostMessages':
          return b.messageCount - a.messageCount;
        case 'newest':
        default:
          return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
    });

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-violet-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Chat History</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            onClick={onCreateNewSession}
            variant="primary"
            size="sm"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chat history..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
              <Button
                onClick={clearChatHistoryFilters}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Sort Options */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
              <select
                value={chatHistoryFilters.sortBy}
                onChange={(e) => handleSortChange(e.target.value as any)}
                className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="mostMessages">Most Messages</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={chatHistoryFilters.dateRange.start?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleDateRangeChange(
                  e.target.value ? new Date(e.target.value) : null,
                  chatHistoryFilters.dateRange.end
                )}
                className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={chatHistoryFilters.dateRange.end?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleDateRangeChange(
                  chatHistoryFilters.dateRange.start,
                  e.target.value ? new Date(e.target.value) : null
                )}
                className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-8 h-8 mb-2" />
            <p className="text-sm">No chat sessions found</p>
            <p className="text-xs">Start a new conversation to see it here</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredSessions.map((session) => (
              <Card
                key={session.id}
                className={`p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  session.isActive 
                    ? 'ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-900/20' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {session.title}
                      </h3>
                      {session.isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200">
                          Active
                        </span>
                      )}
                    </div>
                    
                    {session.lastMessage && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2">
                        {session.lastMessage}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{session.messageCount} messages</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(session.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportSession(session.id);
                      }}
                      variant="ghost"
                      size="sm"
                      className="p-1"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                      variant="ghost"
                      size="sm"
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistory;
