import { Router } from 'express';
import { AIServiceManager } from '../services/aiServiceManager';

const router = Router();
const aiService = new AIServiceManager();

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

// Get AI recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const { userId } = req.query;
    const portfolioData = req.body.portfolio; // Optional portfolio data
    
    try {
      const response = await aiService.getRecommendations(userId as string, portfolioData);
      
      res.json({
        success: true,
        recommendations: response.response || response,
        confidence: response.confidence || 0.8,
        userId: req.user?.id,
        source: 'ai'
      });
    } catch (error: any) {
      console.log('AI service unavailable, returning fallback recommendations');
      
      const fallbackResponse = aiService.generateFallbackResponse('recommendations', { portfolio: portfolioData });
      
      res.json({
        success: true,
        recommendations: fallbackResponse.recommendations,
        confidence: fallbackResponse.confidence,
        userId: req.user?.id,
        source: 'fallback',
        note: 'AI service temporarily unavailable, showing default recommendations'
      });
    }
  } catch (error: any) {
    console.error('AI Recommendations Error:', error.message);
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

