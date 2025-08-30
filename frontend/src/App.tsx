import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Goals from './pages/Goals';
import Portfolio from './pages/Portfolio';
import Debt from './pages/Debt';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Import from './pages/Import';
import TalkToFinances from './pages/TalkToFinances';
import { useStore } from './store/useStore';
import { useAuth } from './hooks/useAuth';

// Callback component to handle Auth0 redirect
const Callback: React.FC = () => {
  const { isLoading, error } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-violet-900 to-magenta-900">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-violet-900 to-magenta-900">
        <div className="text-white text-lg">Error: {error.message}</div>
      </div>
    );
  }

  return <Navigate to="/dashboard" replace />;
};

// Debug component to show current state
const DebugInfo: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { user: storeUser } = useStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-violet-900 to-magenta-900">
      <div className="bg-white p-8 rounded-lg max-w-md">
        <h2 className="text-xl font-bold mb-4">Debug Information</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Auth0 Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
          <p><strong>Auth0 Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
          <p><strong>Auth0 User:</strong> {user ? 'Present' : 'None'}</p>
          <p><strong>Store User:</strong> {storeUser ? 'Present' : 'None'}</p>
          <p><strong>Current URL:</strong> {window.location.href}</p>
        </div>
        <div className="mt-4">
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// Layout wrapper component that uses Outlet
const LayoutWrapper: React.FC = () => {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

function App() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { darkMode, setUser } = useStore();
  const hasSetUser = useRef(false);

  useEffect(() => {
    console.log('Auth state:', { isAuthenticated, isLoading, user });
    console.log('Current URL:', window.location.href);
    
    if (isAuthenticated && user && !isLoading && !hasSetUser.current) {
      console.log('User authenticated, syncing with store...');
      
      // Sync Auth0 user with our store
      const userData = {
        id: user.sub || user.user_id,
        name: user.name || user.nickname || 'User',
        email: user.email || '',
        riskProfile: 'moderate' as const, // Default value
        currency: 'USD', // Default currency
        darkMode: false, // Default dark mode
        createdAt: new Date(),
      };
      console.log('Setting user data:', userData);
      setUser(userData);
      hasSetUser.current = true;
    }
  }, [isAuthenticated, user?.sub, isLoading, setUser]);

  // Show debug info if we're on the root path and authenticated
  if (isAuthenticated && window.location.pathname === '/') {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <DebugInfo />
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/debug" element={<DebugInfo />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <LayoutWrapper />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="budget" element={<Budget />} />
            <Route path="goals" element={<Goals />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="debt" element={<Debt />} />
            <Route path="import" element={<Import />} />
            <Route path="talk-to-finances" element={<TalkToFinances />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;