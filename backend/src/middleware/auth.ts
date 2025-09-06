import { Request, Response, NextFunction } from 'express';
import { expressjwt as jwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import mongoose from 'mongoose';
import { DatabaseService } from '../services/DatabaseService';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string;
        sub?: string;
        email?: string;
        auth0Id?: string;
        given_name?: string;
        family_name?: string;
        [key: string]: any;
      };
    }
  }
}

const databaseService = new DatabaseService();

// Validate Auth0 environment variables
const AUTH0_DOMAIN = process.env['AUTH0_DOMAIN'];
const AUTH0_AUDIENCE = process.env['AUTH0_AUDIENCE'];

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  throw new Error(`Missing required Auth0 environment variables: AUTH0_DOMAIN=${AUTH0_DOMAIN}, AUTH0_AUDIENCE=${AUTH0_AUDIENCE}`);
}

console.log('✅ Auth0 configuration loaded successfully');

// Auth0 JWT verification middleware
const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
    }),
    audience: AUTH0_AUDIENCE,
    issuer: `https://${AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
  });

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  return new Promise<void>((resolve) => {
    // First check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('Database not ready for auth middleware');
      res.status(503).json({ 
        error: 'Database not ready',
        status: 'service_unavailable',
        message: 'Please try again in a moment'
      });
      return resolve();
    }
    
    // Check if authorization header exists
    if (!req.headers.authorization) {
      console.error('No authorization header found');
      res.status(401).json({ error: 'No authorization token provided' });
      return resolve();
    }

    if (!req.headers.authorization.startsWith('Bearer ')) {
      console.error('Invalid authorization header format');
      res.status(401).json({ error: 'Invalid authorization header format' });
      return resolve();
    }

    // Use Auth0 JWT verification
    checkJwt(req, res, async (err: any) => {
      try {
        
        if (err) {
          console.error('Auth0 JWT validation error:', err.message);
          
          let errorMessage = 'Invalid token';
          if (err.code === 'invalid_token') {
            errorMessage = 'Token is invalid or malformed';
          } else if (err.code === 'UnauthorizedError') {
            errorMessage = 'Token verification failed';
          } else if (err.message.includes('jwt expired')) {
            errorMessage = 'Token has expired';
          } else if (err.message.includes('jwt malformed')) {
            errorMessage = 'Token is malformed';
          }
          
          res.status(401).json({ 
            error: errorMessage, 
            details: err.message,
            code: err.code
          });
          return resolve();
        }

        // Extract user info from JWT token - express-jwt v8+ uses req.auth
        const tokenPayload = (req as any).auth || req.user;
        
        const auth0Id = tokenPayload?.sub;
        const email = tokenPayload?.['https://wealthwise.com/email'] || tokenPayload?.email;

        if (!auth0Id) {
          console.error('Missing auth0Id in token payload');
          res.status(401).json({ error: 'Invalid token payload - missing auth0Id' });
          return resolve();
        }

        // Find or create user in database
        let user = await databaseService.findUserByAuth0Id(auth0Id);
        
        if (!user) {
          try {
            // Create new user in database
            const userToCreate = {
              auth0Id,
              email: email ? email.toLowerCase() : `user-${auth0Id.replace('auth0|', '')}@temp.placeholder.com`, // Valid email format
              profile: {
                firstName: tokenPayload?.['https://wealthwise.com/firstName'] || 
                          tokenPayload?.given_name || 
                          tokenPayload?.name?.split(' ')[0] || 
                          'User',
                lastName: tokenPayload?.['https://wealthwise.com/lastName'] || 
                         tokenPayload?.family_name || 
                         tokenPayload?.name?.split(' ').slice(1).join(' ') || 
                         '',
              },
              metadata: {
                lastLogin: new Date(),
                loginCount: 1,
                ipAddress: req.ip || '',
                userAgent: req.get('User-Agent') || '',
                onboardingCompleted: false
              }
            };
            
            // Create new user if they don't exist
            user = await databaseService.createUser(userToCreate);
          } catch (createError: any) {
            if (createError.code === 11000) {
              // Handle duplicate key error - user was created between our check and creation attempt
              user = await databaseService.findUserByAuth0Id(auth0Id);
              if (!user) {
                throw new Error('User creation failed and subsequent lookup also failed');
              }
            } else {
              throw createError;
            }
          }
        } else {
          // Update last login
          await databaseService.updateUserLastLogin((user as any)._id.toString(), req.ip, req.get('User-Agent'));
        }

        // Attach user to request
        req.user = {
          id: (user as any)._id.toString(),
          email: user.email,
          auth0Id: user.auth0Id
        };

        next();
        resolve();
      } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication error' });
        resolve();
      }
    });
  });
};

// Optional auth middleware for endpoints that can work with or without auth
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  return new Promise<void>((resolve) => {
    // Try to authenticate, but don't fail if no token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next(); // Continue without authentication
      return resolve();
    }

    // Use the same JWT verification logic
    checkJwt(req, res, async (err: any) => {
      try {
        if (err) {
          next(); // Continue without authentication
          return resolve();
        }

        const tokenPayload = (req as any).auth || req.user;
        const auth0Id = tokenPayload?.sub;
        const email = tokenPayload?.['https://wealthwise.com/email'] || tokenPayload?.email;

        if (auth0Id) { // Only require auth0Id, not email
          let user = await databaseService.findUserByAuth0Id(auth0Id);
          
          if (user) {
            req.user = {
              id: (user as any)._id.toString(),
              email: user.email,
              auth0Id: user.auth0Id
            };
          }
        }

        next();
        resolve();
      } catch (error) {
        // Continue without authentication on error
        next();
        resolve();
      }
    });
  });
};

