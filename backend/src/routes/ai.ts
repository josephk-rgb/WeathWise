import { Router } from 'express';
import axios from 'axios';

const router = Router();

// ML service URL
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Chat with AI
router.post('/chat', async (req, res) => {
  try {
    const { message, context, model = 'llama3.1:8b' } = req.body;
    
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
      userId: req.user?.id
    });
  } catch (error: any) {
    console.error('AI Chat Error:', error.message);
    res.status(500).json({ 
      error: 'AI service error', 
      details: error.message,
      userId: req.user?.id 
    });
  }
});

// Get AI recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const { userId } = req.query;
    
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
      userId: req.user?.id
    });
  } catch (error: any) {
    console.error('AI Recommendations Error:', error.message);
    res.status(500).json({ 
      error: 'AI service error', 
      details: error.message,
      userId: req.user?.id 
    });
  }
});

// Analyze sentiment
router.post('/sentiment', async (req, res) => {
  try {
    const { message } = req.body;
    
    const response = await axios.post(`${ML_SERVICE_URL}/analyze-sentiment`, {
      message,
      model: 'llama3.1:8b'
    }, {
      timeout: 15000
    });

    res.json({
      success: true,
      data: response.data,
      userId: req.user?.id
    });
  } catch (error: any) {
    console.error('Sentiment Analysis Error:', error.message);
    res.status(500).json({ 
      error: 'AI service error', 
      details: error.message,
      userId: req.user?.id 
    });
  }
});

// List available models
router.get('/models', async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/models`, {
      timeout: 5000
    });

    res.json({
      success: true,
      models: response.data.models,
      userId: req.user?.id
    });
  } catch (error: any) {
    console.error('Models List Error:', error.message);
    res.status(500).json({ 
      error: 'AI service error', 
      details: error.message,
      userId: req.user?.id 
    });
  }
});

export default router;

