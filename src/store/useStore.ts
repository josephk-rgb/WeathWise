import { create } from 'zustand';
import { User, Transaction, Budget, Goal, Investment, ChatMessage, Recommendation, Debt } from '../types';

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

export const useStore = create<Store>((set, get) => ({
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