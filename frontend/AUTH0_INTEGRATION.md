# Auth0 Integration Guide for Frontend

This guide covers how to integrate Auth0 authentication with the WeathWise frontend application.

## Prerequisites

1. **Auth0 Account**
   - Sign up at [auth0.com](https://auth0.com)
   - Create a new application

2. **Environment Configuration**
   - Create `.env` file in the frontend directory
   - Configure Auth0 environment variables

## Setup Steps

### 1. Create Auth0 Application

1. **Log into Auth0 Dashboard**
   - Go to [manage.auth0.com](https://manage.auth0.com)
   - Navigate to Applications > Applications

2. **Create New Application**
   - Click "Create Application"
   - Name: "WeathWise Frontend"
   - Type: "Single Page Application"
   - Click "Create"

3. **Configure Application Settings**
   - Allowed Callback URLs: `http://localhost:5173/callback`
   - Allowed Logout URLs: `http://localhost:5173`
   - Allowed Web Origins: `http://localhost:5173`
   - Save changes

### 2. Configure Environment Variables

Create `.env` file in the frontend directory:

```env
# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://your-api-identifier

# API Configuration
VITE_API_URL=http://localhost:3001/api

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=true
```

### 3. Install Auth0 Dependencies

```bash
npm install @auth0/auth0-react
```

### 4. Configure Auth0 Provider

Update `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './index.css';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience,
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);
```

### 5. Create Authentication Hook

Create `src/hooks/useAuth.ts`:

```tsx
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../services/api';

export const useAuth = () => {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  const login = () => {
    loginWithRedirect();
  };

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
    apiService.clearToken();
  };

  const getToken = async () => {
    try {
      const token = await getAccessTokenSilently();
      apiService.setToken(token);
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout: handleLogout,
    getToken,
  };
};
```

### 6. Update API Service

The API service is already configured to handle Auth0 tokens. It will:
- Automatically include the Authorization header
- Handle token refresh
- Clear tokens on logout

### 7. Create Protected Route Component

Create `src/components/ProtectedRoute.tsx`:

```tsx
import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

### 8. Update App Component

Update `src/App.tsx` to use authentication:

```tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Budget } from './pages/Budget';
import { Goals } from './pages/Goals';
import { Profile } from './pages/Profile';
import { apiService } from './services/api';

function App() {
  const { isAuthenticated, getToken } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      getToken();
    }
  }, [isAuthenticated, getToken]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budget" element={<Budget />} />
          <Route path="goals" element={<Goals />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
```

### 9. Update Login Page

Update `src/pages/Login.tsx`:

```tsx
import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export const Login: React.FC = () => {
  const { login, isLoading } = useAuth0();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to WeathWise
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your AI-powered financial companion
          </p>
        </div>
        <div>
          <button
            onClick={() => login()}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign in with Auth0
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Testing the Integration

### 1. Start the Application

```bash
npm run dev
```

### 2. Test Authentication Flow

1. Navigate to `http://localhost:5173`
2. You should be redirected to the login page
3. Click "Sign in with Auth0"
4. Complete the Auth0 login process
5. You should be redirected back to the dashboard

### 3. Test API Integration

1. After login, check the browser's Network tab
2. Verify that API requests include the Authorization header
3. Test creating a transaction or investment
4. Verify the data is saved to the backend

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure Auth0 application settings include the correct URLs
   - Check that the backend CORS configuration allows the frontend origin

2. **Token Issues**
   - Verify the audience is configured correctly
   - Check that the API identifier matches between frontend and backend

3. **Redirect Issues**
   - Ensure callback URLs are configured correctly in Auth0
   - Check that the redirect URI matches exactly

4. **API Authentication Failures**
   - Verify the JWT token is being sent correctly
   - Check that the backend Auth0 configuration matches the frontend

### Debug Mode

Enable debug logging by setting:
```env
VITE_ENABLE_DEBUG_MODE=true
```

This will log authentication events to the console.

## Production Deployment

### 1. Update Environment Variables

For production, update the environment variables:

```env
VITE_AUTH0_DOMAIN=your-production-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-production-client-id
VITE_AUTH0_AUDIENCE=https://your-production-api-identifier
VITE_API_URL=https://your-api-domain.com/api
```

### 2. Update Auth0 Application Settings

- Allowed Callback URLs: `https://your-domain.com/callback`
- Allowed Logout URLs: `https://your-domain.com`
- Allowed Web Origins: `https://your-domain.com`

### 3. Security Considerations

- Use HTTPS in production
- Configure proper CSP headers
- Set up proper error handling
- Implement proper logout handling
- Consider implementing refresh token rotation

## Additional Features

### 1. User Profile Management

The Auth0 user object contains basic profile information. You can extend this by:

1. Storing additional user data in your backend
2. Using Auth0's user metadata
3. Implementing custom profile management

### 2. Role-Based Access Control

Implement RBAC by:

1. Adding roles to Auth0 user metadata
2. Checking roles in the frontend
3. Implementing role-based route protection

### 3. Social Login

Enable social login providers in Auth0:

1. Configure providers (Google, Facebook, etc.)
2. Update the login button to show provider options
3. Handle provider-specific user data

### 4. Multi-Factor Authentication

Enable MFA in Auth0:

1. Configure MFA settings in Auth0 dashboard
2. Handle MFA challenges in the frontend
3. Provide fallback authentication methods




