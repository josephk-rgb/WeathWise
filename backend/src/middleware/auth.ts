import { Request, Response, NextFunction } from 'express';
import { expressjwt as jwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
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

let checkJwt: any;

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  console.error('❌ Missing Auth0 environment variables:');
  console.error('AUTH0_DOMAIN:', AUTH0_DOMAIN);
  console.error('AUTH0_AUDIENCE:', AUTH0_AUDIENCE);
  console.error('⚠️ Auth0 JWT validation will not work until these are configured');
  
  // Create a dummy middleware that always fails auth for now
  checkJwt = (req: Request, res: Response, next: NextFunction) => {
    res.status(401).json({ 
      error: 'Auth0 environment variables not configured',
      details: 'AUTH0_DOMAIN and AUTH0_AUDIENCE must be set in .env file'
    });
  };
} else {
  console.log('✅ Auth0 configuration loaded:');
  console.log('Domain:', AUTH0_DOMAIN);
  console.log('Audience:', AUTH0_AUDIENCE);

  // Auth0 JWT verification middleware
  checkJwt = jwt({
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
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  return new Promise<void>((resolve) => {
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

    // Debug: Log environment variables
    console.log('Auth0 Config:', {
      domain: process.env['AUTH0_DOMAIN'],
      audience: process.env['AUTH0_AUDIENCE'],
      hasToken: !!req.headers.authorization,
      tokenPrefix: req.headers.authorization?.substring(0, 30) + '...'
    });

    // Use Auth0 JWT verification
    checkJwt(req, res, async (err: any) => {
      try {
        console.log('=== JWT MIDDLEWARE DEBUG ===');
        console.log('Error from checkJwt:', err);
        console.log('req.auth after checkJwt:', (req as any).auth);
        console.log('req.user after checkJwt:', req.user);
        console.log('typeof req.auth:', typeof (req as any).auth);
        console.log('req object keys containing auth/user:', Object.keys(req).filter(key => key.includes('auth') || key.includes('user')));
        console.log('=== END JWT DEBUG ===');
        
        if (err) {
          console.error('Auth0 JWT validation error:', err.message);
          console.error('Error details:', {
            name: err.name,
            code: err.code,
            status: err.status,
            inner: err.inner,
            tokenHeader: req.headers.authorization?.substring(0, 50) + '...'
          });
          
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

        console.log('Auth0 JWT validation successful');
        console.log('Token payload req.auth:', (req as any).auth);
        console.log('Token payload req.user:', req.user);
        console.log('Debug: Checking token payload location...');

        // Extract user info from JWT token - express-jwt v8+ uses req.auth
        const tokenPayload = (req as any).auth || req.user;
        console.log('Token payload extracted:', tokenPayload);
        console.log('Token payload type:', typeof tokenPayload);
        console.log('Token payload keys:', tokenPayload ? Object.keys(tokenPayload) : 'null/undefined');
        
        const auth0Id = tokenPayload?.sub;
        const email = tokenPayload?.['https://wealthwise.com/email'] || tokenPayload?.email;
        
        console.log('Extracted values:', { auth0Id, email });

        if (!auth0Id) {
          console.error('Missing auth0Id in token payload');
          console.log('Full token payload for debugging:', JSON.stringify(tokenPayload, null, 2));
          res.status(401).json({ error: 'Invalid token payload - missing auth0Id' });
          return resolve();
        }

        console.log('Processing user:', { auth0Id, email });

        // Find or create user in database
        console.log('Searching for existing user with auth0Id:', auth0Id);
        let user = await databaseService.findUserByAuth0Id(auth0Id);
        console.log('Search result:', user ? 'User found' : 'User not found');
        
        if (!user) {
          console.log('Creating new user for auth0Id:', auth0Id);
          try {
            // Debug: Log what we're about to create
            const userToCreate = {
              auth0Id,
              email: email ? email.toLowerCase() : `user-${auth0Id.replace('auth0|', '')}@temp.placeholder.com`, // Valid email format
              profile: {
                firstName: tokenPayload?.['https://wealthwise.com/firstName'] || tokenPayload?.given_name || 'TempUser',
                lastName: tokenPayload?.['https://wealthwise.com/lastName'] || tokenPayload?.family_name || 'Placeholder',
              },
              metadata: {
                lastLogin: new Date(),
                loginCount: 1,
                ipAddress: req.ip || '',
                userAgent: req.get('User-Agent') || '',
                onboardingCompleted: false
              }
            };
            console.log('About to create user with data:', JSON.stringify(userToCreate, null, 2));
            
            // Create new user if they don't exist
            user = await databaseService.createUser(userToCreate);
          } catch (createError: any) {
            if (createError.code === 11000) {
              // Handle duplicate key error - user was created between our check and creation attempt
              console.log('Duplicate key error - user was created concurrently, trying to find again');
              user = await databaseService.findUserByAuth0Id(auth0Id);
              if (!user) {
                throw new Error('User creation failed and subsequent lookup also failed');
              }
            } else {
              throw createError;
            }
          }
        } else {
          console.log('Found existing user for auth0Id:', auth0Id);
          // Update last login
          await databaseService.updateUserLastLogin((user as any)._id.toString(), req.ip, req.get('User-Agent'));
        }

        // Attach user to request
        req.user = {
          id: (user as any)._id.toString(),
          email: user.email,
          auth0Id: user.auth0Id
        };

        console.log('Authentication successful for user:', req.user.id);
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

