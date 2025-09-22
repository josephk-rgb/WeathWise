import React from 'react';
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
import Assets from './pages/Assets';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Import from './pages/Import';
import TalkToFinances from './pages/TalkToFinances';
import ProfileCompletionWrapper from './components/ProfileCompletion/ProfileCompletionWrapper';
import { AuthLoadingScreen } from './components/LoadingStates';
import { useStore } from './store/useStore';
import { useUser } from './contexts/UserContext';

// Callback component to handle Auth0 redirect
const Callback: React.FC = () => {
  const { isLoading, error } = useAuth0();

  if (isLoading) {
    return <AuthLoadingScreen message="Completing authentication" />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-violet-900 to-magenta-900">
        <div className="text-center max-w-md p-8">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-white text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="text-gray-300 mb-4">{error.message}</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <Navigate to="/dashboard" replace />;
};

// Debug component to show current state
const DebugInfo: React.FC = () => {
  const { isAuthenticated, user, isLoading, userProfile, isProfileLoading, profileError } = useUser();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-violet-900 to-magenta-900">
      <div className="bg-white p-8 rounded-lg max-w-md">
        <h2 className="text-xl font-bold mb-4">Debug Information</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Auth0 Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
          <p><strong>Auth0 Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
          <p><strong>Auth0 User:</strong> {user ? 'Present' : 'None'}</p>
          <p><strong>Profile Loading:</strong> {isProfileLoading ? 'Yes' : 'No'}</p>
          <p><strong>Profile:</strong> {userProfile ? 'Present' : 'None'}</p>
          <p><strong>Profile Error:</strong> {profileError || 'None'}</p>
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
    <ProfileCompletionWrapper>
      <Layout>
        <Outlet />
      </Layout>
    </ProfileCompletionWrapper>
  );
};

function App() {
  const { isAuthenticated } = useUser();
  const { darkMode } = useStore();

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
            <Route path="assets" element={<Assets />} />
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