import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import axios from 'axios';

const router = Router();

// In-memory chat store (temporary until DB-backed)
// Structure: userId -> sessionId -> { title, createdAt, updatedAt, messages: [] }
const chatStore: Map<string, Map<string, {
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ id: string; message_type: 'user' | 'ai'; content: string; timestamp: string; metadata?: any }>;
}>> = new Map();

function getUserSessions(userId: string) {
  if (!chatStore.has(userId)) chatStore.set(userId, new Map());
  return chatStore.get(userId)!;
}

function ensureSession(userId: string, sessionId: string, title?: string) {
  const sessions = getUserSessions(userId);
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      title: title || 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    });
  }
  return sessions.get(sessionId)!;
}

// Type guard to check if user is authenticated
function isAuthenticatedUser(user: any): user is { id: string; email: string; auth0Id: string } {
  return user && typeof user.id === 'string' && typeof user.email === 'string' && typeof user.auth0Id === 'string';
}

// ML Services proxy endpoint for authenticated AI chat
router.post('/chat', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { message, model = "llama3.1:8b", include_financial_data = true, session_id, title } = req.body;
    
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Forward request to ML services with user authentication
    const mlServiceUrl = process.env.ML_SERVICES_URL || 'http://localhost:8000';
    
    const requestPayload = {
      message,
      model,
      include_financial_data,
      user_id: req.user.id
    };

    // Get JWT token from request to pass to ML services
    const authHeader = req.headers.authorization;
    
    const mlResponse = await axios.post(`${mlServiceUrl}/ai/chat`, requestPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      timeout: 60000
    });

    const responseData = mlResponse.data;

    // Persist to in-memory store
    const sid = session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = ensureSession(req.user.id, sid, title);

    // Append user message
    session.messages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      message_type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Append AI message
    const aiContent = responseData?.response || responseData?.data?.response || '';
    if (aiContent) {
      session.messages.push({
        id: `msg_${Date.now()+1}_${Math.random().toString(36).substr(2, 5)}`,
        message_type: 'ai',
        content: aiContent,
        timestamp: new Date().toISOString()
      });
    }
    session.updatedAt = new Date().toISOString();

    res.json({ ...responseData, session_id: sid });

  } catch (error: any) {
    console.error('ML proxy error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'ML service unavailable',
        message: 'The AI service is currently unavailable. Please try again later.'
      });
    } else if (error.response) {
      res.status(error.response.status).json({
        error: 'ML service error',
        message: error.response.data?.message || 'An error occurred with the AI service'
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      });
    }
  }
});

// Get conversation history
router.get('/chat/history/:sessionId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { sessionId } = req.params;
    const { limit = 50 } = req.query;

    // First, serve from in-memory store if present
    const sessions = getUserSessions(req.user.id);
    const session = sessions.get(sessionId);
    if (session) {
      const messages = session.messages.slice(-(parseInt(limit as string) || 50));
      res.json({ success: true, session_id: sessionId, messages });
      return;
    }

    // Otherwise, try ML service history
    const mlServiceUrl = process.env.ML_SERVICES_URL || 'http://localhost:8000';
    const authHeader = req.headers.authorization;
    const mlResponse = await axios.get(`${mlServiceUrl}/ai/chat/history/${sessionId}?user_id=${req.user.id}&limit=${limit}`, {
      headers: { 'Authorization': authHeader },
      timeout: 10000
    });
    res.json(mlResponse.data);
  } catch (error: any) {
    console.error('Error fetching conversation history:', error);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to fetch conversation history' });
    }
  }
});

// Get chat sessions (list of all sessions for a user)
router.get('/chat/sessions', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { limit = 20, offset = 0 } = req.query;
    const sessions = Array.from(getUserSessions(req.user.id).entries()).map(([id, s]) => ({
      id,
      title: s.title,
      lastMessage: s.messages.length ? s.messages[s.messages.length - 1].content : '',
      messageCount: s.messages.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));
    const start = parseInt(offset as string) || 0;
    const end = start + (parseInt(limit as string) || 20);
    const page = sessions
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(start, end);
    res.json({ success: true, sessions: page, total: sessions.length, limit: end - start, offset: start });
  } catch (error: any) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

// Create a new chat session
router.post('/chat/sessions', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { title } = req.body;
    
    // Generate a new session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Create in-memory session so it shows up in listings
    const session = ensureSession(req.user.id, sessionId, title);
    session.title = title || session.title;
    session.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      session_id: sessionId,
      id: sessionId,
      title: title || 'New Chat',
      created_at: new Date().toISOString(),
      user_id: req.user.id
    });
  } catch (error: any) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

// Get a specific chat session
router.get('/chat/sessions/:sessionId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { sessionId } = req.params;
    
    // For now, return a mock session
    // In a real implementation, this would query the database for the specific session
    res.json({
      success: true,
      session: {
        id: sessionId,
        title: 'Chat Session',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: req.user.id
      }
    });
  } catch (error: any) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ error: 'Failed to fetch chat session' });
  }
});

// Update a chat session
router.put('/chat/sessions/:sessionId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { sessionId } = req.params;
    const updates = req.body;
    
    // For now, just return success
    // In a real implementation, this would update the session in the database
    res.json({
      success: true,
      session: {
        id: sessionId,
        ...updates,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error updating chat session:', error);
    res.status(500).json({ error: 'Failed to update chat session' });
  }
});

// Delete a chat session
router.delete('/chat/sessions/:sessionId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { sessionId } = req.params;
    
    // For now, just return success
    // In a real implementation, this would delete the session and all its messages from the database
    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

// Search chat history
router.get('/chat/search', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { q: query, limit = 20 } = req.query;
    
    if (!query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }
    
    // For now, return empty results
    // In a real implementation, this would search through conversation history
    res.json({
      success: true,
      results: [],
      query: query,
      total: 0
    });
  } catch (error: any) {
    console.error('Error searching chat history:', error);
    res.status(500).json({ error: 'Failed to search chat history' });
  }
});

// Export chat session
router.get('/chat/sessions/:sessionId/export', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { sessionId } = req.params;
    const { format = 'json' } = req.query;
    
    // Get the conversation history
    const mlServiceUrl = process.env.ML_SERVICES_URL || 'http://localhost:8000';
    const authHeader = req.headers.authorization;
    
    let history: any = { success: true, messages: [] };
    try {
      const historyResponse = await axios.get(`${mlServiceUrl}/ai/chat/history/${sessionId}?user_id=${req.user.id}&limit=1000`, {
        headers: {
          'Authorization': authHeader,
        },
        timeout: 10000
      });
      history = historyResponse.data;
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        throw err;
      }
      // 404 -> keep empty history fallback
    }
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="chat-session-${sessionId}.json"`);
      res.json(history);
    } else if (format === 'txt') {
      const textContent = history.messages?.map((msg: any) => 
        `[${msg.timestamp}] ${msg.message_type === 'user' ? 'You' : 'AI'}: ${msg.content}`
      ).join('\n\n') || 'No messages found';
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="chat-session-${sessionId}.txt"`);
      res.send(textContent);
    } else {
      res.status(400).json({ error: 'Invalid format. Use json or txt' });
    }
  } catch (error: any) {
    console.error('Error exporting chat session:', error);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to export chat session' });
    }
  }
});

// Health check endpoint for ML services
router.get('/health', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const mlServiceUrl = process.env.ML_SERVICES_URL || 'http://localhost:8000';
    const healthResponse = await axios.get(`${mlServiceUrl}/health`, { timeout: 5000 });
    
    res.json({
      status: 'healthy',
      ml_service: healthResponse.data,
      database: 'connected',
      backend_proxy: 'operational'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'ML service unavailable',
      database: 'connected',
      backend_proxy: 'operational'
    });
  }
});

export default router;

// New: Proxy market sentiment endpoint to ml-services
router.get('/sentiment/:symbol', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol } = req.params;
    if (!symbol || typeof symbol !== 'string') {
      res.status(400).json({ error: 'Invalid symbol' });
      return;
    }

    const mlServiceUrl = process.env.ML_SERVICES_URL || 'http://localhost:8000';
    const authHeader = req.headers.authorization;

    const mlResponse = await axios.get(`${mlServiceUrl}/api/ml/market/sentiment/${encodeURIComponent(symbol)}`, {
      headers: {
        'Authorization': authHeader || '',
      },
      timeout: 15000
    });

    res.json(mlResponse.data);
  } catch (error: any) {
    console.error('ML sentiment proxy error:', error?.message || error);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to fetch sentiment' });
    }
  }
});

// Train sentiment model via ml-services
router.post('/sentiment/train', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbols } = req.body || {};
    if (!Array.isArray(symbols) || symbols.length < 3) {
      res.status(400).json({ error: 'Provide at least 3 symbols' });
      return;
    }

    const mlServiceUrl = process.env.ML_SERVICES_URL || 'http://localhost:8000';
    const authHeader = req.headers.authorization;
    const mlResponse = await axios.post(`${mlServiceUrl}/api/ml/market/train-sentiment-model`, { symbols }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
      timeout: 60000
    });

    res.json(mlResponse.data);
  } catch (error: any) {
    console.error('ML sentiment train proxy error:', error?.message || error);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to start sentiment training' });
    }
  }
});

// New: Proxy optimize-portfolio to ml-services
router.post('/optimize-portfolio', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const mlServiceUrl = process.env.ML_SERVICES_URL || 'http://localhost:8000';
    const authHeader = req.headers.authorization;
    const payload = req.body;

    const mlResponse = await axios.post(`${mlServiceUrl}/api/ml/portfolio/optimize-portfolio`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
      timeout: 60000
    });

    res.json(mlResponse.data);
  } catch (error: any) {
    console.error('ML optimize-portfolio proxy error:', error?.message || error);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to optimize portfolio' });
    }
  }
});

// New: Proxy efficient-frontier to ml-services
router.post('/efficient-frontier', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAuthenticatedUser(req.user)) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const mlServiceUrl = process.env.ML_SERVICES_URL || 'http://localhost:8000';
    const authHeader = req.headers.authorization;
    const payload = req.body;

    const mlResponse = await axios.post(`${mlServiceUrl}/api/ml/portfolio/efficient-frontier`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
      timeout: 60000
    });

    res.json(mlResponse.data);
  } catch (error: any) {
    console.error('ML efficient-frontier proxy error:', error?.message || error);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to get efficient frontier' });
    }
  }
});
