import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../services/DatabaseService';

const databaseService = new DatabaseService();

export const adminOnlyMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get user from database to check role
    const user = await databaseService.findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied. Admin role required.' });
      return;
    }

    // User is admin, proceed
    next();
  } catch (error) {
    console.error('Admin role check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
