# Part 4: Authentication & Security with Auth0

## 4.1 Auth0 Setup and Configuration

### Auth0 Tenant Configuration

```javascript
// Auth0 tenant settings
{
  "tenant": "wealthwise-ai",
  "friendly_name": "WeathWise AI",
  "picture_url": "https://your-domain.com/logo.png",
  "support_email": "support@wealthwise.com",
  "support_url": "https://wealthwise.com/support",
  "default_audience": "https://api.wealthwise.com",
  "default_directory": "Username-Password-Authentication",
  "enabled_locales": ["en", "es", "fr"],
  "flags": {
    "change_pwd_flow_v1": false,
    "enable_apis_section": true,
    "enable_pipeline2": true,
    "enable_dynamic_client_registration": false,
    "enable_custom_domain_in_emails": true,
    "universal_login": true,
    "revoke_refresh_token_grant": true
  },
  "session_lifetime": 720,
  "idle_session_lifetime": 72,
  "sandbox_version": "18"
}
```

### Application Configuration

#### Single Page Application (Frontend)
```json
{
  "name": "WeathWise AI Frontend",
  "description": "React frontend application for WeathWise AI",
  "app_type": "spa",
  "oidc_conformant": true,
  "callbacks": [
    "http://localhost:5173/callback",
    "https://wealthwise-ai.vercel.app/callback"
  ],
  "web_origins": [
    "http://localhost:5173",
    "https://wealthwise-ai.vercel.app"
  ],
  "cors_origins": [
    "http://localhost:5173",
    "https://wealthwise-ai.vercel.app"
  ],
  "allowed_logout_urls": [
    "http://localhost:5173",
    "https://wealthwise-ai.vercel.app"
  ],
  "grant_types": ["authorization_code", "refresh_token"],
  "jwt_configuration": {
    "lifetime_in_seconds": 36000,
    "secret_encoded": true,
    "alg": "RS256"
  },
  "token_endpoint_auth_method": "none",
  "custom_login_page_on": true
}
```

#### Machine-to-Machine Application (Backend)
```json
{
  "name": "WeathWise AI Backend",
  "description": "Backend API application for WeathWise AI",
  "app_type": "non_interactive",
  "oidc_conformant": true,
  "grant_types": ["client_credentials"],
  "jwt_configuration": {
    "lifetime_in_seconds": 36000,
    "secret_encoded": true,
    "alg": "RS256"
  },
  "token_endpoint_auth_method": "client_secret_post"
}
```

### API Configuration

```json
{
  "name": "WeathWise AI API",
  "identifier": "https://api.wealthwise.com",
  "signing_alg": "RS256",
  "scopes": [
    {
      "value": "read:profile",
      "description": "Read user profile information"
    },
    {
      "value": "write:profile", 
      "description": "Update user profile information"
    },
    {
      "value": "read:transactions",
      "description": "Read user transaction data"
    },
    {
      "value": "write:transactions",
      "description": "Create and update transactions"
    },
    {
      "value": "read:investments",
      "description": "Read investment portfolio data"
    },
    {
      "value": "write:investments",
      "description": "Create and update investments"
    },
    {
      "value": "read:recommendations",
      "description": "Read AI recommendations"
    },
    {
      "value": "admin:users",
      "description": "Administrative access to user management"
    },
    {
      "value": "admin:system",
      "description": "System administration access"
    }
  ],
  "allow_offline_access": true,
  "token_lifetime": 86400,
  "token_lifetime_for_web": 7200,
  "skip_consent_for_verifiable_first_party_clients": true
}
```

## 4.2 Frontend Authentication Implementation

### Auth0 React Integration

```tsx
// src/auth/Auth0Provider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Auth0Provider as BaseAuth0Provider, useAuth0 } from '@auth0/auth0-react';
import { AuthContextType, AuthConfig } from './types';

const authConfig: AuthConfig = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN!,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID!,
  authorizationParams: {
    redirect_uri: window.location.origin + '/callback',
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    scope: 'openid profile email read:profile write:profile read:transactions write:transactions read:investments write:investments'
  },
  useRefreshTokens: true,
  cacheLocation: 'localstorage'
};

export const Auth0Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BaseAuth0Provider {...authConfig}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BaseAuth0Provider>
  );
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth0 = useAuth0();
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (auth0.isLoading) return;

      try {
        if (auth0.isAuthenticated && auth0.user) {
          // Get access token with permissions
          const token = await auth0.getAccessTokenSilently();
          
          // Decode token to get permissions
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          const userPermissions = tokenPayload.permissions || [];
          
          setUser(auth0.user);
          setPermissions(userPermissions);
          
          // Store token for API calls
          localStorage.setItem('access_token', token);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [auth0.isLoading, auth0.isAuthenticated, auth0.user]);

  const login = () => {
    auth0.loginWithRedirect({
      authorizationParams: {
        prompt: 'login'
      }
    });
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    auth0.logout({ 
      logoutParams: { 
        returnTo: window.location.origin 
      } 
    });
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      return await auth0.getAccessTokenSilently();
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const value: AuthContextType = {
    ...auth0,
    isInitialized,
    user,
    permissions,
    login,
    logout,
    getAccessToken,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an Auth0Provider');
  }
  return context;
};
```

### Protected Route Implementation

```tsx
// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/Auth0Provider';
import { LoadingSpinner } from './UI/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  fallback
}) => {
  const { isLoading, isAuthenticated, hasPermission, isInitialized } = useAuth();
  const location = useLocation();

  if (!isInitialized || isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check required permissions
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );

    if (!hasAllPermissions) {
      return fallback || <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

// Usage in App.tsx
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="portfolio" element={
            <ProtectedRoute requiredPermissions={['read:investments']}>
              <Portfolio />
            </ProtectedRoute>
          } />
          <Route path="admin" element={
            <ProtectedRoute requiredPermissions={['admin:users']}>
              <AdminPanel />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
```

### API Client with Authentication

```typescript
// src/services/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuth } from '../auth/Auth0Provider';

class ApiClient {
  private client: AxiosInstance;
  private getAccessToken: () => Promise<string | null>;

  constructor(baseURL: string, getAccessToken: () => Promise<string | null>) {
    this.getAccessToken = getAccessToken;
    
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const newToken = await this.getAccessToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client.request(originalRequest);
            }
          } catch (refreshError) {
            // Redirect to login if refresh fails
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }
}

// Hook to create authenticated API client
export const useApiClient = (): ApiClient => {
  const { getAccessToken } = useAuth();
  
  return new ApiClient(
    import.meta.env.VITE_API_BASE_URL,
    getAccessToken
  );
};
```

## 4.3 Backend Authentication Implementation

### JWT Middleware

```typescript
// server/src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest, UserPayload } from '../types/auth';

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  requestHeaders: {},
  timeout: 30000,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUriCache: 600000, // 10 minutes
  jwksUriCacheTimeout: 600000
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export const authenticateToken = (options?: {
  required?: boolean;
  permissions?: string[];
}) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      if (options?.required !== false) {
        return res.status(401).json({ error: 'Access token required' });
      }
      return next();
    }

    jwt.verify(token, getKey, {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        console.error('JWT verification error:', err);
        return res.status(403).json({ error: 'Invalid token' });
      }

      const user = decoded as UserPayload;
      req.user = user;

      // Check required permissions
      if (options?.permissions && options.permissions.length > 0) {
        const userPermissions = user.permissions || [];
        const hasAllPermissions = options.permissions.every(permission =>
          userPermissions.includes(permission)
        );

        if (!hasAllPermissions) {
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            required: options.permissions,
            current: userPermissions
          });
        }
      }

      next();
    });
  };
};

// Permission-based middleware
export const requirePermissions = (...permissions: string[]) => {
  return authenticateToken({ required: true, permissions });
};

// Role-based middleware
export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = req.user.roles || [];
    if (!userRoles.includes(role)) {
      return res.status(403).json({ 
        error: 'Insufficient role',
        required: role,
        current: userRoles
      });
    }

    next();
  };
};
```

### User Management Service

```typescript
// server/src/services/userService.ts
import { Management } from 'auth0';
import { UserDocument } from '../types/database';
import { DatabaseService } from './databaseService';
import { EncryptionService } from './encryptionService';

export class UserService {
  private auth0Management: Management;
  private db: DatabaseService;
  private encryption: EncryptionService;

  constructor() {
    this.auth0Management = new Management({
      domain: process.env.AUTH0_DOMAIN!,
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      scope: 'read:users update:users create:users delete:users'
    });
    
    this.db = new DatabaseService();
    this.encryption = new EncryptionService();
  }

  async createUser(auth0User: any): Promise<UserDocument> {
    try {
      // Create user in our database
      const userData: Partial<UserDocument> = {
        auth0Id: auth0User.user_id,
        email: auth0User.email,
        profile: {
          firstName: auth0User.given_name || '',
          lastName: auth0User.family_name || '',
          avatar: auth0User.picture
        },
        preferences: {
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'en',
          theme: 'auto',
          notifications: {
            email: true,
            push: true,
            sms: false,
            trading: true,
            news: true
          }
        },
        riskProfile: {
          level: 'moderate',
          questionnaire: {
            age: 0,
            experience: '',
            timeline: '',
            riskTolerance: 5,
            completedAt: new Date()
          }
        },
        subscription: {
          plan: 'free',
          startDate: new Date(),
          features: ['basic_portfolio', 'basic_budgeting']
        },
        encryption: {
          keyId: await this.encryption.generateUserKey(auth0User.user_id),
          algorithm: 'AES-256-GCM',
          version: 1
        },
        metadata: {
          lastLogin: new Date(),
          loginCount: 1,
          onboardingCompleted: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user = await this.db.users.create(userData);

      // Update Auth0 user metadata
      await this.auth0Management.users.update(
        { id: auth0User.user_id },
        {
          app_metadata: {
            wealthwise_user_id: user._id.toString(),
            roles: ['user'],
            permissions: [
              'read:profile',
              'write:profile',
              'read:transactions',
              'write:transactions',
              'read:investments',
              'write:investments'
            ]
          }
        }
      );

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async getUserByAuth0Id(auth0Id: string): Promise<UserDocument | null> {
    return await this.db.users.findOne({ auth0Id });
  }

  async updateUserProfile(userId: string, profileData: Partial<UserDocument['profile']>): Promise<UserDocument> {
    // Encrypt sensitive fields
    const encryptedData = await this.encryption.encryptUserProfile(profileData, userId);
    
    return await this.db.users.findByIdAndUpdate(
      userId,
      {
        $set: {
          profile: encryptedData,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserDocument['preferences']>): Promise<UserDocument> {
    return await this.db.users.findByIdAndUpdate(
      userId,
      {
        $set: {
          preferences,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.db.users.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    try {
      // Delete from Auth0
      await this.auth0Management.users.delete({ id: user.auth0Id });

      // Delete user data (implement GDPR compliance)
      await this.db.users.findByIdAndDelete(userId);
      await this.db.transactions.deleteMany({ userId });
      await this.db.investments.deleteMany({ userId });
      await this.db.chatSessions.deleteMany({ userId });
      
      // Delete encryption keys
      await this.encryption.deleteUserKey(userId);
      
      console.log(`User ${userId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }
}
```

## 4.4 Role-Based Access Control (RBAC)

### Auth0 Roles and Permissions Setup

```javascript
// Auth0 Actions: Assign roles and permissions
exports.onExecutePostLogin = async (event, api) => {
  const { user } = event;
  const ManagementClient = require('auth0').ManagementClient;

  const management = new ManagementClient({
    domain: event.secrets.DOMAIN,
    clientId: event.secrets.CLIENT_ID,
    clientSecret: event.secrets.CLIENT_SECRET,
  });

  try {
    // Get user roles
    const userRoles = await management.getUserRoles({ id: user.user_id });
    const roleNames = userRoles.data.map(role => role.name);

    // Get user permissions
    const userPermissions = await management.getUserPermissions({ id: user.user_id });
    const permissionNames = userPermissions.data.map(perm => perm.permission_name);

    // Default role assignment for new users
    if (event.stats.logins_count === 1) {
      await management.assignRolestoUser(
        { id: user.user_id },
        { roles: ['rol_xxxxxxxxxx'] } // Default 'user' role ID
      );
      roleNames.push('user');
    }

    // Add custom claims to tokens
    api.idToken.setCustomClaim('https://wealthwise.com/roles', roleNames);
    api.idToken.setCustomClaim('https://wealthwise.com/permissions', permissionNames);
    
    api.accessToken.setCustomClaim('https://wealthwise.com/roles', roleNames);
    api.accessToken.setCustomClaim('https://wealthwise.com/permissions', permissionNames);

    // Add subscription info
    const appMetadata = user.app_metadata || {};
    api.accessToken.setCustomClaim('https://wealthwise.com/subscription', {
      plan: appMetadata.subscription_plan || 'free',
      features: appMetadata.features || []
    });

  } catch (error) {
    console.error('Error in Auth0 Action:', error);
  }
};
```

### Permission-Based Route Protection

```typescript
// server/src/routes/investments.ts
import express from 'express';
import { InvestmentController } from '../controllers/investmentController';
import { authenticateToken, requirePermissions } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = express.Router();
const controller = new InvestmentController();

// All routes require authentication
router.use(authenticateToken({ required: true }));

// Read investments
router.get('/', 
  requirePermissions('read:investments'),
  rateLimiter({ windowMs: 60000, max: 100 }), // 100 requests per minute
  controller.getUserInvestments
);

// Create investment
router.post('/',
  requirePermissions('write:investments'),
  rateLimiter({ windowMs: 60000, max: 20 }), // 20 creates per minute
  controller.createInvestment
);

// Update investment
router.put('/:id',
  requirePermissions('write:investments'),
  controller.updateInvestment
);

// Delete investment
router.delete('/:id',
  requirePermissions('write:investments'),
  controller.deleteInvestment
);

// Admin routes
router.get('/admin/all',
  requirePermissions('admin:users'),
  controller.getAllInvestments
);

export default router;
```

### Subscription-Based Feature Access

```typescript
// server/src/middleware/subscription.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';

interface FeatureAccess {
  [key: string]: string[]; // feature: [plans that can access it]
}

const FEATURE_ACCESS: FeatureAccess = {
  'basic_portfolio': ['free', 'premium', 'enterprise'],
  'advanced_analytics': ['premium', 'enterprise'],
  'ai_recommendations': ['premium', 'enterprise'],
  'real_time_data': ['premium', 'enterprise'],
  'api_access': ['enterprise'],
  'white_label': ['enterprise'],
  'priority_support': ['premium', 'enterprise']
};

export const requireFeature = (feature: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userSubscription = req.user.subscription || { plan: 'free' };
    const allowedPlans = FEATURE_ACCESS[feature];

    if (!allowedPlans || !allowedPlans.includes(userSubscription.plan)) {
      return res.status(403).json({
        error: 'Feature not available in your subscription plan',
        feature,
        currentPlan: userSubscription.plan,
        requiredPlans: allowedPlans
      });
    }

    next();
  };
};

// Usage in routes
router.get('/advanced-analytics',
  authenticateToken({ required: true }),
  requireFeature('advanced_analytics'),
  controller.getAdvancedAnalytics
);
```

## 4.5 Security Middleware

### Rate Limiting

```typescript
// server/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests, please try again later',
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      const authReq = req as any;
      return authReq.user?.sub || req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for certain endpoints or conditions
      return req.path === '/health' || req.path === '/status';
    }
  });
};

// Different rate limits for different endpoints
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later'
});

export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  skipSuccessfulRequests: true
});

export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute for sensitive operations
  message: 'Rate limit exceeded for sensitive operation'
});
```

### Input Validation and Sanitization

```typescript
// server/src/middleware/validation.ts
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Common validation rules
export const validateUserId = param('userId').isMongoId().withMessage('Invalid user ID');

export const validateTransaction = [
  body('amount').isFloat({ min: -1000000, max: 1000000 }).withMessage('Invalid amount'),
  body('description').isLength({ min: 1, max: 255 }).trim().escape(),
  body('category').isLength({ min: 1, max: 50 }).trim().escape(),
  body('type').isIn(['income', 'expense', 'transfer']).withMessage('Invalid transaction type'),
  body('date').isISO8601().withMessage('Invalid date format'),
  handleValidationErrors
];

export const validateInvestment = [
  body('symbol').isLength({ min: 1, max: 10 }).trim().toUpperCase(),
  body('name').isLength({ min: 1, max: 100 }).trim().escape(),
  body('shares').isFloat({ min: 0 }).withMessage('Shares must be positive'),
  body('purchasePrice').isFloat({ min: 0 }).withMessage('Purchase price must be positive'),
  body('type').isIn(['stock', 'etf', 'crypto', 'bond', 'real_estate']).withMessage('Invalid investment type'),
  handleValidationErrors
];

// Sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return DOMPurify.sanitize(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  
  next();
};
```

### Security Headers and CORS

```typescript
// server/src/middleware/security.ts
import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

export const securityMiddleware = [
  // Helmet for security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.wealthwise.com", "wss://api.wealthwise.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),

  // CORS configuration
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'https://wealthwise-ai.vercel.app',
        process.env.FRONTEND_URL
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
];

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    // Log suspicious activity
    if (res.statusCode >= 400) {
      console.warn(`Suspicious request: ${req.method} ${req.path} - ${res.statusCode} - IP: ${req.ip}`);
    }
  });
  
  next();
};
```

## 4.6 Session Management and Security Monitoring

### Session Security

```typescript
// server/src/services/sessionService.ts
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export class SessionService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async createSession(userId: string, metadata: any): Promise<string> {
    const sessionId = uuidv4();
    const sessionData = {
      userId,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      metadata,
      isActive: true
    };

    // Store session with 24 hour expiry
    await this.redis.setex(
      `session:${sessionId}`,
      86400, // 24 hours
      JSON.stringify(sessionData)
    );

    // Track user's active sessions
    await this.redis.sadd(`user_sessions:${userId}`, sessionId);
    await this.redis.expire(`user_sessions:${userId}`, 86400);

    return sessionId;
  }

  async getSession(sessionId: string): Promise<any | null> {
    const sessionData = await this.redis.get(`session:${sessionId}`);
    if (!sessionData) return null;

    const session = JSON.parse(sessionData);
    
    // Update last accessed time
    session.lastAccessed = new Date().toISOString();
    await this.redis.setex(`session:${sessionId}`, 86400, JSON.stringify(session));

    return session;
  }

  async revokeSession(sessionId: string): Promise<void> {
    const sessionData = await this.redis.get(`session:${sessionId}`);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      await this.redis.srem(`user_sessions:${session.userId}`, sessionId);
    }
    
    await this.redis.del(`session:${sessionId}`);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user_sessions:${userId}`);
    
    if (sessionIds.length > 0) {
      const pipeline = this.redis.pipeline();
      sessionIds.forEach(sessionId => {
        pipeline.del(`session:${sessionId}`);
      });
      await pipeline.exec();
    }

    await this.redis.del(`user_sessions:${userId}`);
  }

  async getUserActiveSessions(userId: string): Promise<any[]> {
    const sessionIds = await this.redis.smembers(`user_sessions:${userId}`);
    const sessions = [];

    for (const sessionId of sessionIds) {
      const sessionData = await this.redis.get(`session:${sessionId}`);
      if (sessionData) {
        sessions.push({
          id: sessionId,
          ...JSON.parse(sessionData)
        });
      }
    }

    return sessions;
  }
}
```

### Audit Logging

```typescript
// server/src/services/auditService.ts
import { DatabaseService } from './databaseService';

interface AuditEvent {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  outcome: 'success' | 'failure' | 'warning';
  timestamp: Date;
}

export class AuditService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  async logEvent(event: AuditEvent): Promise<void> {
    try {
      await this.db.auditLogs.create({
        ...event,
        timestamp: new Date()
      });

      // Log high-severity events immediately
      if (this.isHighSeverity(event)) {
        console.warn('High severity audit event:', event);
        // Could send alerts here
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  private isHighSeverity(event: AuditEvent): boolean {
    const highSeverityActions = [
      'user_deleted',
      'admin_access',
      'data_export',
      'permission_elevated',
      'multiple_failed_login',
      'suspicious_activity'
    ];

    return highSeverityActions.includes(event.action) || event.outcome === 'failure';
  }

  async getAuditTrail(userId: string, limit: number = 100): Promise<AuditEvent[]> {
    return await this.db.auditLogs
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  async detectSuspiciousActivity(userId: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Check for multiple failed login attempts
    const failedLogins = await this.db.auditLogs.countDocuments({
      userId,
      action: 'login',
      outcome: 'failure',
      timestamp: { $gte: oneHourAgo }
    });

    if (failedLogins >= 5) {
      await this.logEvent({
        userId,
        action: 'suspicious_activity',
        resource: 'authentication',
        metadata: { failedLogins, timeframe: '1 hour' },
        outcome: 'warning',
        timestamp: new Date()
      });
      return true;
    }

    return false;
  }
}
```

## Next Steps

Part 5 will cover AI & Machine Learning Integration:
- Local AI setup with Ollama for financial conversations
- ML model development for investment recommendations
- Financial data analysis algorithms
- Backtesting framework implementation
- Real-time market sentiment analysis
- Portfolio optimization using modern portfolio theory
