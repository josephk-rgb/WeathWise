import { Router } from 'express';

const router = Router();

// Test endpoint to verify authentication is working
router.get('/test', async (req, res) => {
  try {
    console.log('Auth test endpoint hit');
    console.log('User from request:', req.user);
    console.log('Headers:', req.headers);
    
    res.json({
      message: 'Authentication successful!',
      user: req.user,
      timestamp: new Date().toISOString(),
      authenticated: true
    });
  } catch (error) {
    console.error('Auth test error:', error);
    res.status(500).json({ 
      error: 'Internal server error during auth test',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
