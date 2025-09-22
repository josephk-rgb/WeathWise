import { create } from 'zustand';
import { User, Transaction, Budget, Goal, Investment, ChatMessage, Recommendation, Debt } from '../types';

// Enhanced chat types
export interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ChatHistoryFilters {
  searchTerm: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  sortBy: 'newest' | 'oldest' | 'mostMessages';
}

interface Store {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;
  
  // Currency
  currency: string;
  setCurrency: (currency: string) => void;
  
  // Transactions
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  
  // Budget
  budgets: Budget[];
  setBudgets: (budgets: Budget[]) => void;
  
  // Goals
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  
  // Investments
  investments: Investment[];
  setInvestments: (investments: Investment[]) => void;
  
  // Debts
  debts: Debt[];
  setDebts: (debts: Debt[]) => void;
  addDebt: (debt: Debt) => void;
  
  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  
  // Chat Sessions & History
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  chatHistoryFilters: ChatHistoryFilters;
  setChatSessions: (sessions: ChatSession[]) => void;
  addChatSession: (session: ChatSession) => void;
  updateChatSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  setChatHistoryFilters: (filters: Partial<ChatHistoryFilters>) => void;
  clearChatHistoryFilters: () => void;
  
  // Recommendations
  recommendations: Recommendation[];
  setRecommendations: (recommendations: Recommendation[]) => void;
  
  // UI state
  isChatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  
  // Modals
  isTransactionModalOpen: boolean;
  setTransactionModalOpen: (open: boolean) => void;
}

export const useStore = create<Store>((set) => ({
  // User state
  user: null,
  setUser: (user) => set({ user }),
  
  // Theme
  darkMode: false,
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  
  // Currency
  currency: 'USD',
  setCurrency: (currency) => set({ currency }),
  
  // Transactions
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) => set((state) => ({
    transactions: [transaction, ...state.transactions]
  })),
  
  // Budget
  budgets: [],
  setBudgets: (budgets) => set({ budgets }),
  
  // Goals
  goals: [],
  setGoals: (goals) => set({ goals }),
  
  // Investments
  investments: [],
  setInvestments: (investments) => set({ investments }),
  
  // Debts
  debts: [],
  setDebts: (debts) => set({ debts }),
  addDebt: (debt) => set((state) => ({
    debts: [...state.debts, debt]
  })),
  
  // Chat
  chatMessages: [],
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message]
  })),
  clearChat: () => set({ chatMessages: [] }),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  
  // Chat Sessions & History
  chatSessions: [],
  currentSessionId: null,
  chatHistoryFilters: {
    searchTerm: '',
    dateRange: { start: null, end: null },
    sortBy: 'newest'
  },
  setChatSessions: (sessions) => set({ chatSessions: sessions }),
  addChatSession: (session) => set((state) => ({
    chatSessions: [session, ...state.chatSessions]
  })),
  updateChatSession: (sessionId, updates) => set((state) => ({
    chatSessions: state.chatSessions.map(session =>
      session.id === sessionId ? { ...session, ...updates } : session
    )
  })),
  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  setChatHistoryFilters: (filters) => set((state) => ({
    chatHistoryFilters: { ...state.chatHistoryFilters, ...filters }
  })),
  clearChatHistoryFilters: () => set({
    chatHistoryFilters: {
      searchTerm: '',
      dateRange: { start: null, end: null },
      sortBy: 'newest'
    }
  }),
  
  // Recommendations
  recommendations: [],
  setRecommendations: (recommendations) => set({ recommendations }),
  
  // UI state
  isChatOpen: false,
  setChatOpen: (open) => set({ isChatOpen: open }),
  
  // Modals
  isTransactionModalOpen: false,
  setTransactionModalOpen: (open) => set({ isTransactionModalOpen: open }),
}));