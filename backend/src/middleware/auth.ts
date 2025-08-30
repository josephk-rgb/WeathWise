import { Request, Response, NextFunction } from 'express';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        auth0Id: string;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement Auth0 token verification
    // For now, just pass through with mock user
    req.user = {
      id: 'mock-user-id',
      email: 'user@example.com',
      auth0Id: 'auth0|mock-user-id'
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

