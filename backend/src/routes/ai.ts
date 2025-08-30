import { Router } from 'express';
import axios from 'axios';

const router = Router();

// ML service URL
const ML_SERVICE_URL = process.env['ML_SERVICE_URL'] || 'http://localhost:8000';

// Chat with AI
router.post('/chat', async (req, res) => {
  try {
    const { message, context, model = 'llama3.1:8b' } = req.body;
    
    // Check if ML service is available
    try {
      const healthCheck = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 2000 });
    } catch (healthError) {
      // ML service not available, return fallback response
      console.log('ML service not available, returning fallback response');
      return res.json({
        success: true,
        data: {
          response: "I apologize, but the AI service is currently unavailable. Please try again later.",
          confidence: 0.5
        },
        userId: req.user?.id,
        source: 'fallback'
      });
    }
    
    // Forward request to Python ML service
    const response = await axios.post(`${ML_SERVICE_URL}/chat`, {
      message,
      context,
      model
    }, {
      timeout: 35000 // 35 second timeout
    });

    res.json({
      success: true,
      data: response.data,
      userId: req.user?.id,
      source: 'ai'
    });
  } catch (error: any) {
    console.error('AI Chat Error:', error.message);
    
    // Return fallback response instead of error
    res.json({
      success: true,
      data: {
        response: "I apologize, but I'm having trouble processing your request right now. Please try again later.",
        confidence: 0.5
      },
      userId: req.user?.id,
      source: 'fallback',
      note: 'AI service temporarily unavailable'
    });
  }
});

// Get AI recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Check if ML service is available
    try {
      const healthCheck = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 2000 });
    } catch (healthError) {
      // ML service not available, return mock recommendations
      console.log('ML service not available, returning mock recommendations');
      return res.json({
        success: true,
        recommendations: [
          "Create an emergency fund covering 3-6 months of expenses",
          "Diversify your investment portfolio across different asset classes",
          "Review and optimize your spending patterns monthly"
        ],
        confidence: 0.8,
        userId: req.user?.id,
        source: 'fallback'
      });
    }
    
    // This could be enhanced to use portfolio data for personalized recommendations
    const recommendationPrompt = "Based on general financial best practices, what are 3 key recommendations for improving financial health?";
    
    const response = await axios.post(`${ML_SERVICE_URL}/chat`, {
      message: recommendationPrompt,
      context: { user_id: userId },
      model: 'llama3.1:8b'
    }, {
      timeout: 30000
    });

    res.json({
      success: true,
      recommendations: response.data.response,
      confidence: response.data.confidence,
      userId: req.user?.id,
      source: 'ai'
    });
  } catch (error: any) {
    console.error('AI Recommendations Error:', error.message);
    
    // Return fallback recommendations instead of error
    res.json({
      success: true,
      recommendations: [
        "Create an emergency fund covering 3-6 months of expenses",
        "Diversify your investment portfolio across different asset classes", 
        "Review and optimize your spending patterns monthly"
      ],
      confidence: 0.7,
      userId: req.user?.id,
      source: 'fallback',
      note: 'AI service temporarily unavailable, showing default recommendations'
    });
  }
});

// Analyze sentiment
router.post('/sentiment', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Check if ML service is available
    try {
      const healthCheck = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 2000 });
    } catch (healthError) {
      // ML service not available, return neutral sentiment
      console.log('ML service not available, returning neutral sentiment');
      return res.json({
        success: true,
        data: {
          sentiment: 'neutral',
          confidence: 0.5,
          score: 0.0
        },
        userId: req.user?.id,
        source: 'fallback'
      });
    }
    
    const response = await axios.post(`${ML_SERVICE_URL}/analyze-sentiment`, {
      message,
      model: 'llama3.1:8b'
    }, {
      timeout: 15000
    });

    res.json({
      success: true,
      data: response.data,
      userId: req.user?.id,
      source: 'ai'
    });
  } catch (error: any) {
    console.error('Sentiment Analysis Error:', error.message);
    
    // Return neutral sentiment instead of error
    res.json({
      success: true,
      data: {
        sentiment: 'neutral',
        confidence: 0.5,
        score: 0.0
      },
      userId: req.user?.id,
      source: 'fallback',
      note: 'AI service temporarily unavailable'
    });
  }
});

// List available models
router.get('/models', async (req, res) => {
  try {
    // Check if ML service is available
    try {
      const healthCheck = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 2000 });
    } catch (healthError) {
      // ML service not available, return default models
      console.log('ML service not available, returning default models');
      return res.json({
        success: true,
        models: ['llama3.1:8b', 'fallback'],
        userId: req.user?.id,
        source: 'fallback'
      });
    }
    
    const response = await axios.get(`${ML_SERVICE_URL}/models`, {
      timeout: 5000
    });

    res.json({
      success: true,
      models: response.data.models,
      userId: req.user?.id,
      source: 'ai'
    });
  } catch (error: any) {
    console.error('Models List Error:', error.message);
    
    // Return default models instead of error
    res.json({
      success: true,
      models: ['llama3.1:8b', 'fallback'],
      userId: req.user?.id,
      source: 'fallback',
      note: 'AI service temporarily unavailable'
    });
  }
});

export default router;

