import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { AIServiceManager } from '../services/aiServiceManager';
import { RecommendationService } from '../services/recommendationService';

const router = Router();
const aiService = new AIServiceManager();
const recommendationService = new RecommendationService();

// Test endpoint for ML service connectivity (no auth required)
router.post('/test-chat', async (req, res) => {
  try {
    const { message, model = 'llama3.1:8b' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    try {
      const response = await aiService.chat(message, { test: true }, model);
      
      res.json({
        success: true,
        data: response,
        source: 'ai',
        test: true
      });
    } catch (error: any) {
      console.log('AI service unavailable, returning fallback response');
      
      res.json({
        success: true,
        data: {
          response: "I'm a test fallback response. The ML service might be unavailable.",
          confidence: 0.5,
          sources: ["fallback"]
        },
        source: 'fallback',
        note: 'AI service temporarily unavailable'
      });
    }
  } catch (error: any) {
    console.error('AI Test Chat Error:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Chat with AI
router.post('/chat', async (req, res) => {
  try {
    const { message, context, model = 'llama3.1:8b' } = req.body;
    const userId = req.user?.id;
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    
    try {
      // Pass user context to AI service for personalized responses
      const response = await aiService.chat(message, context, model, userId, authToken);
      
      res.json({
        success: true,
        data: response,
        userId: userId,
        source: 'ai',
        personalized: !!userId
      });
    } catch (error: any) {
      console.log('AI service unavailable, returning fallback response');
      
      const fallbackResponse = aiService.generateFallbackResponse('chat', { message });
      
      res.json({
        success: true,
        data: fallbackResponse,
        userId: userId,
        source: 'fallback',
        note: 'AI service temporarily unavailable'
      });
    }
  } catch (error: any) {
    console.error('AI Chat Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trigger recommendation generation (no websockets; UI will poll DB)
router.post('/recommendations/refresh', authMiddleware, async (req, res) => {
  try {
    const userId = (req.user?.id as string) || (req.body.userId as string) || (req.query.userId as string);
    const scope = (req.query.scope as 'dashboard' | 'portfolio') || (req.body.scope as 'dashboard' | 'portfolio') || 'dashboard';
    const max = req.query.max ? parseInt(req.query.max as string, 10) : (req.body.max || 5);
    const portfolioData = req.body.portfolio || undefined;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Simple idempotency: if the same user+scope was requested in last 30s, accept but do nothing
    const cache: any = (global as any).__recRefreshCache || ((global as any).__recRefreshCache = new Map());
    const key = `${userId}:${scope}`;
    const now = Date.now();
    const last = cache.get(key);
    if (last && now - last < 30_000) {
      return res.status(202).json({ success: true, accepted: true, scope, max, message: 'Already refreshing recently' });
    }
    cache.set(key, now);

    // Fire-and-return quickly; actual persistence happens inside service
    recommendationService
      .refreshRecommendations({ userId, scope, max, portfolioData, authToken: req.headers.authorization?.replace('Bearer ', '') })
      .catch(() => {})
      .finally(() => {
        // clear idempotency window sooner if desired
        setTimeout(() => cache.delete(key), 30_000);
      });

    return res.status(202).json({
      success: true,
      accepted: true,
      scope,
      max,
      message: 'Recommendation generation started'
    });
  } catch (error: any) {
    console.error('Recommendations Refresh Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recommendations from DB by scope (for polling)
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const userId = (req.user?.id as string) || (req.query.userId as string);
    const scope = (req.query.scope as 'dashboard' | 'portfolio') || 'dashboard';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const items = await recommendationService.getRecommendations(userId, scope, limit);

    return res.json({
      success: true,
      scope,
      count: items.length,
      recommendations: items
    });
  } catch (error: any) {
    console.error('Recommendations Get Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analyze sentiment
router.post('/sentiment', async (req, res) => {
  try {
    const { message } = req.body;
    
    try {
      const response = await aiService.analyzeSentiment(message);
      
      res.json({
        success: true,
        data: response,
        userId: req.user?.id,
        source: 'ai'
      });
    } catch (error: any) {
      console.log('AI service unavailable, returning neutral sentiment');
      
      const fallbackResponse = aiService.generateFallbackResponse('sentiment');
      
      res.json({
        success: true,
        data: fallbackResponse,
        userId: req.user?.id,
        source: 'fallback',
        note: 'AI service temporarily unavailable'
      });
    }
  } catch (error: any) {
    console.error('Sentiment Analysis Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get portfolio insights
router.post('/insights', async (req, res) => {
  try {
    const { portfolio } = req.body;
    
    try {
      const response = await aiService.getPortfolioInsights(portfolio, req.user?.id);
      
      res.json({
        success: true,
        insights: response,
        userId: req.user?.id,
        source: 'ai'
      });
    } catch (error: any) {
      console.log('AI service unavailable, returning fallback insights');
      
      const fallbackResponse = aiService.generateFallbackResponse('insights', { portfolio });
      
      res.json({
        success: true,
        insights: fallbackResponse.insights,
        confidence: fallbackResponse.confidence,
        userId: req.user?.id,
        source: 'fallback',
        note: 'AI service temporarily unavailable'
      });
    }
  } catch (error: any) {
    console.error('Portfolio Insights Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get risk assessment
router.post('/risk-assessment', async (req, res) => {
  try {
    const { portfolio, userProfile } = req.body;
    
    try {
      const response = await aiService.getRiskAssessment(portfolio, userProfile);
      
      res.json({
        success: true,
        assessment: response,
        userId: req.user?.id,
        source: 'ai'
      });
    } catch (error: any) {
      console.log('AI service unavailable, returning fallback risk assessment');
      
      const fallbackResponse = aiService.generateFallbackResponse('risk');
      
      res.json({
        success: true,
        assessment: fallbackResponse,
        userId: req.user?.id,
        source: 'fallback',
        note: 'AI service temporarily unavailable'
      });
    }
  } catch (error: any) {
    console.error('Risk Assessment Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI service status
router.get('/status', async (req, res) => {
  try {
    const status = aiService.getStatus();
    const isAvailable = await aiService.isServiceAvailable();
    
    res.json({
      success: true,
      status: {
        ...status,
        isAvailable,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('AI Status Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset circuit breaker (admin endpoint)
router.post('/reset-circuit-breaker', async (req, res) => {
  try {
    aiService.resetCircuitBreaker();
    
    res.json({
      success: true,
      message: 'Circuit breaker reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Circuit Breaker Reset Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

