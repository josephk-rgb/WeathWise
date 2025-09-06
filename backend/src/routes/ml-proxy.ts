import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import axios from 'axios';

const router = Router();

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

    const { message, model = "llama3.1:8b", include_financial_data = true } = req.body;
    
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

    res.json(mlResponse.data);

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

// Get conversation history - TODO: Implement when conversation history service is ready
// router.get('/chat/history/:sessionId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
//   try {
//     if (!isAuthenticatedUser(req.user)) {
//       res.status(401).json({ error: 'User not authenticated' });
//       return;
//     }

//     const { sessionId } = req.params;
//     const history = await databaseService.getConversationHistory(req.user.id, sessionId);
    
//     res.json({
//       success: true,
//       data: history
//     });
//   } catch (error) {
//     console.error('Error fetching conversation history:', error);
//     res.status(500).json({ error: 'Failed to fetch conversation history' });
//   }
// });

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
