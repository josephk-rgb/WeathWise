import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { AuthLoadingScreen } from './LoadingStates';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, profileError } = useUser();

  if (isLoading) {
    return <AuthLoadingScreen message="Securing your financial data" />;
  }

  // Show error state if profile loading failed critically
  if (profileError && profileError.includes('Authentication failed')) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
