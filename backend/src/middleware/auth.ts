import { Request, Response, NextFunction } from 'express';
import { expressjwt as jwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import mongoose from 'mongoose';
import { DatabaseService } from '../services/DatabaseService';

// Auth0 Management API helper function
async function fetchAuth0UserInfo(auth0Id: string): Promise<{ email?: string; given_name?: string; family_name?: string; name?: string } | null> {
  try {
    // First get a Management API token
    const tokenResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials'
      })
    });
    
    if (!tokenResponse.ok) {
      console.error('Failed to get Management API token');
      return null;
    }
    
    const tokenData = await tokenResponse.json() as { access_token?: string };
    const access_token = tokenData.access_token;
    
    if (!access_token) {
      console.error('No access token received from Management API');
      return null;
    }
    
    // Now get user info
    const userResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(auth0Id)}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!userResponse.ok) {
      console.error('Failed to get user info from Management API');
      return null;
    }
    
    const userInfo = await userResponse.json() as any;
    return {
      email: userInfo.email,
      given_name: userInfo.given_name,
      family_name: userInfo.family_name,
      name: userInfo.name
    };
  } catch (error) {
    console.error('Error fetching from Auth0 Management API:', error);
    return null;
  }
}

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
        
        console.log('🔧 [AUTH] Full token payload:', JSON.stringify(tokenPayload, null, 2));
        
        const auth0Id = tokenPayload?.sub;
        
        // If no email in token, we'll need to get it from Auth0 Management API
        // For now, let's try to extract any available info
        let email = tokenPayload?.['https://wealthwise.com/email'] ||
                   tokenPayload?.email || 
                   tokenPayload?.['email'];

        // Extract names from custom claims first, then fallback to standard claims
        const given_name = tokenPayload?.['https://wealthwise.com/given_name'] || 
                          tokenPayload?.given_name;
        const family_name = tokenPayload?.['https://wealthwise.com/family_name'] || 
                           tokenPayload?.family_name;
        const name = tokenPayload?.['https://wealthwise.com/name'] || 
                    tokenPayload?.name;

        console.log('🔧 [AUTH] Extracted user data:', {
          sub: auth0Id,
          email: email,
          given_name: given_name,
          family_name: family_name,
          name: name,
          customClaims: {
            email: tokenPayload?.['https://wealthwise.com/email'],
            given_name: tokenPayload?.['https://wealthwise.com/given_name'],
            family_name: tokenPayload?.['https://wealthwise.com/family_name'],
            name: tokenPayload?.['https://wealthwise.com/name']
          },
          allTokenFields: Object.keys(tokenPayload || {})
        });

        // TEMPORARY: If no email in token, try to get user info from Auth0 Management API
        if (!email && auth0Id) {
          console.log('🔧 [AUTH] No email in token, will fetch from Auth0 Management API');
          try {
            const userInfo = await fetchAuth0UserInfo(auth0Id);
            if (userInfo) {
              email = userInfo.email;
              console.log('🔧 [AUTH] Retrieved email from Management API:', email);
            }
          } catch (error) {
            console.error('🔧 [AUTH] Failed to fetch from Management API:', error);
          }
        }

        if (!auth0Id) {
          console.error('❌ Missing auth0Id in token payload');
          res.status(401).json({ error: 'Invalid token payload - missing auth0Id' });
          return resolve();
        }

        // If no email is provided by Auth0, create a temporary one that can be updated during onboarding
        if (!email) {
          console.warn('⚠️ No email found in Auth0 token, using temporary email for user:', auth0Id);
          email = `temp-${auth0Id.replace('auth0|', '')}@temp.wealthwise.com`;
        }

        // Find or create user in database
        let user = await databaseService.findUserByAuth0Id(auth0Id);
        
        if (!user) {
          try {
            console.log('🔧 [AUTH] Creating new user for:', auth0Id, 'with email:', email);
            
            // Use extracted names from token (including custom claims)
            const firstName = given_name || name?.split(' ')[0] || 'FirstName';
            const lastName = family_name || name?.split(' ').slice(1).join(' ') || 'LastName';
            
            console.log('🔧 [AUTH] Using names:', { firstName, lastName, source: 'extracted from token' });
            
            // Create new user in database
            const userToCreate = {
              auth0Id,
              email: email.toLowerCase(),
              profile: {
                firstName: firstName,
                lastName: lastName,
              },
              metadata: {
                lastLogin: new Date(),
                loginCount: 1,
                ipAddress: req.ip || '',
                userAgent: req.get('User-Agent') || '',
                onboardingCompleted: false,
                profileNeedsCompletion: !given_name || !family_name // Flag if we used placeholders
              }
            };
            
            console.log('🔧 [AUTH] User creation data:', {
              auth0Id: userToCreate.auth0Id,
              email: userToCreate.email,
              firstName: userToCreate.profile.firstName,
              lastName: userToCreate.profile.lastName,
              profileNeedsCompletion: userToCreate.metadata.profileNeedsCompletion
            });
            
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

