import jwt from 'jsonwebtoken';

// Test utilities for authentication
export const generateAuthToken = (userId: string): string => {
  // For testing purposes, create a simple JWT token
  const payload = {
    sub: `test-auth0-id-${userId}`,
    email: `test-${userId}@example.com`,
    aud: process.env.AUTH0_AUDIENCE || 'test-audience',
    iss: `https://${process.env.AUTH0_DOMAIN || 'test-domain'}/`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    scope: 'read:profile'
  };

  // Use a test secret for development/testing
  const secret = process.env.JWT_TEST_SECRET || 'test-secret-key';
  
  return jwt.sign(payload, secret, { algorithm: 'HS256' });
};

// Mock Auth0 user data for testing
export const createMockAuth0User = (userId: string) => ({
  sub: `test-auth0-id-${userId}`,
  email: `test-${userId}@example.com`,
  given_name: 'Test',
  family_name: 'User',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
  updated_at: new Date().toISOString()
});

// For testing - simplified auth middleware that accepts test tokens
export const testAuthMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.substring(7);
  
  try {
    // In test environment, accept our test tokens
    if (process.env.NODE_ENV === 'test') {
      const decoded = jwt.verify(token, process.env.JWT_TEST_SECRET || 'test-secret-key');
      req.user = decoded;
      return next();
    }
    
    // In production, this would use the real Auth0 verification
    return res.status(401).json({ error: 'Invalid token' });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
