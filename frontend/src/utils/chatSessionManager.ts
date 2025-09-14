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
  static createSession(title?: string): ChatSessionData {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newSession: ChatSessionData = {
      id: sessionId,
      title: title || 'New Chat',
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
      sessions[sessionIndex] = {
        ...sessions[sessionIndex],
        lastMessage: message,
        messageCount: sessions[sessionIndex].messageCount + 1,
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

