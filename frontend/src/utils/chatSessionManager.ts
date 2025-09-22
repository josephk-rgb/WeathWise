// Chat Session Management Utility
// This handles local session management until we have full backend support

export interface ChatSessionData {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export class ChatSessionManager {
  private static readonly STORAGE_KEY = 'chatSessions';
  private static readonly MESSAGES_STORAGE_KEY = 'chatSessionMessages';
  private static readonly DEFAULT_TITLE = 'New Chat';

  // Create a human-friendly title from the first user message
  private static generateTitleFromMessage(message: string): string {
    if (!message) return this.DEFAULT_TITLE;
    // Remove line breaks and excessive whitespace
    const singleLine = message.replace(/\s+/g, ' ').trim();
    // Strip leading punctuation and markdown symbols
    const cleaned = singleLine.replace(/^[#>*\-\s]+/, '');
    // Limit to 48 chars and add ellipsis if truncated
    const maxLen = 48;
    const base = cleaned.length > maxLen ? cleaned.slice(0, maxLen).trim() + '…' : cleaned;
    // Capitalize first character
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  // Get all sessions from localStorage
  static getSessions(): ChatSessionData[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get sessions from localStorage:', error);
      return [];
    }
  }

  // Save sessions to localStorage
  static saveSessions(sessions: ChatSessionData[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save sessions to localStorage:', error);
    }
  }

  // Create a new session
  static createSession(title?: string, providedId?: string): ChatSessionData {
    const sessionId = providedId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newSession: ChatSessionData = {
      id: sessionId,
      title: title || this.DEFAULT_TITLE,
      lastMessage: '',
      messageCount: 0,
      createdAt: now,
      updatedAt: now
    };

    const sessions = this.getSessions();
    sessions.unshift(newSession); // Add to beginning
    this.saveSessions(sessions);

    return newSession;
  }

  // Update a session
  static updateSession(sessionId: string, updates: Partial<ChatSessionData>): void {
    const sessions = this.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex !== -1) {
      sessions[sessionIndex] = {
        ...sessions[sessionIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveSessions(sessions);
    }
  }

  // ===== Message persistence per session =====
  private static getAllSessionMessages(): Record<string, any[]> {
    try {
      const stored = localStorage.getItem(this.MESSAGES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to get session messages from localStorage:', error);
      return {};
    }
  }

  private static saveAllSessionMessages(allMessages: Record<string, any[]>): void {
    try {
      localStorage.setItem(this.MESSAGES_STORAGE_KEY, JSON.stringify(allMessages));
    } catch (error) {
      console.error('Failed to save session messages to localStorage:', error);
    }
  }

  static appendMessage(sessionId: string, message: any): void {
    const all = this.getAllSessionMessages();
    const list = Array.isArray(all[sessionId]) ? all[sessionId] : [];
    list.push(message);
    all[sessionId] = list;
    this.saveAllSessionMessages(all);
  }

  static getMessages(sessionId: string): any[] {
    const all = this.getAllSessionMessages();
    return Array.isArray(all[sessionId]) ? all[sessionId] : [];
  }

  // Delete a session
  static deleteSession(sessionId: string): void {
    const sessions = this.getSessions();
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    this.saveSessions(updatedSessions);
  }

  // Update session with new message
  static updateSessionWithMessage(sessionId: string, message: string, isUser: boolean): void {
    const sessions = this.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex !== -1) {
      const existing = sessions[sessionIndex];
      const wasEmpty = existing.messageCount === 0;
      const shouldNameFromFirstUserMsg = wasEmpty && isUser && (!existing.title || existing.title === this.DEFAULT_TITLE);
      const newTitle = shouldNameFromFirstUserMsg ? this.generateTitleFromMessage(message) : existing.title;

      sessions[sessionIndex] = {
        ...existing,
        title: newTitle,
        lastMessage: message,
        messageCount: existing.messageCount + 1,
        updatedAt: new Date().toISOString()
      };
      this.saveSessions(sessions);
    } else {
      // Create new session if it doesn't exist
      const newSession = this.createSession();
      this.updateSessionWithMessage(newSession.id, message, isUser);
    }
  }

  // Get session by ID
  static getSession(sessionId: string): ChatSessionData | null {
    const sessions = this.getSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  // Clear all sessions
  static clearAllSessions(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}





