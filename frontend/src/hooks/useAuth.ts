import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, useRef } from 'react';
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

  const [tokenReady, setTokenReady] = useState(false);
  const [tokenInitialized, setTokenInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const initializingRef = useRef(false); // Use ref to prevent React Strict Mode issues

  // ALWAYS log the current state
  console.log('🔧 [FRONTEND] useAuth hook state check:');
  console.log('🔧 [FRONTEND] - isAuthenticated:', isAuthenticated);
  console.log('🔧 [FRONTEND] - isLoading:', isLoading);
  console.log('🔧 [FRONTEND] - user exists:', !!user);
  console.log('🔧 [FRONTEND] - tokenInitialized:', tokenInitialized);
  console.log('🔧 [FRONTEND] - isInitializing:', isInitializing);
  console.log('🔧 [FRONTEND] - tokenReady:', tokenReady);
  
  if (user) {
    console.log('🔧 [FRONTEND] Auth0 user object found:', JSON.stringify(user, null, 2));
  }

  // Automatically get and set token when authenticated
  useEffect(() => {
    console.log('🔧 [FRONTEND] useEffect triggered with conditions:');
    console.log('🔧 [FRONTEND] - isAuthenticated && user && !isLoading && !tokenInitialized && !isInitializing && !initializingRef.current');
    console.log('🔧 [FRONTEND] -', isAuthenticated, '&&', !!user, '&&', !isLoading, '&&', !tokenInitialized, '&&', !isInitializing, '&&', !initializingRef.current);
    console.log('🔧 [FRONTEND] - Final result:', isAuthenticated && user && !isLoading && !tokenInitialized && !isInitializing && !initializingRef.current);
    
    // FORCE token initialization for debugging - remove the tokenInitialized check temporarily
    if (isAuthenticated && user && !isLoading && !isInitializing && !initializingRef.current) {
      const initializeToken = async () => {
        try {
          initializingRef.current = true; // Set ref immediately
          setIsInitializing(true);
          console.log('🔧 [FRONTEND] Initializing Auth0 token for user:', user.email);
          console.log('🔧 [FRONTEND] Full Auth0 user object:', JSON.stringify(user, null, 2));
          setTokenInitialized(true);
          
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE,
              scope: "openid profile email"
            }
          });
          console.log('🔧 [FRONTEND] Got Auth0 token:', token.substring(0, 30) + '...');
          
          // Decode and log the token payload
          try {
            const tokenParts = token.split('.');
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('🔧 [FRONTEND] Token payload:', JSON.stringify(payload, null, 2));
          } catch (decodeError) {
            console.error('🔧 [FRONTEND] Failed to decode token:', decodeError);
          }
          
          apiService.setToken(token);
          setTokenReady(true);
          console.log('🔧 [FRONTEND] Auth0 token successfully set');
        } catch (error) {
          console.error('Error getting Auth0 token:', error);
          setTokenReady(false);
          setTokenInitialized(false);
          initializingRef.current = false;
          
          // Try to get token silently with different parameters
          try {
            const fallbackToken = await getAccessTokenSilently();
            console.log('Got fallback Auth0 token:', fallbackToken.substring(0, 30) + '...');
            apiService.setToken(fallbackToken);
            setTokenReady(true);
            setTokenInitialized(true);
          } catch (fallbackError) {
            console.error('Fallback token retrieval also failed:', fallbackError);
          }
        } finally {
          setIsInitializing(false);
        }
      };
      
      initializeToken();
    } else if (!isAuthenticated && !isLoading) {
      console.log('User not authenticated, clearing token');
      setTokenReady(false);
      setTokenInitialized(false);
      setIsInitializing(false);
      initializingRef.current = false;
      apiService.clearToken();
    }
  }, [isAuthenticated, user, isLoading, getAccessTokenSilently]); // Removed tokenInitialized from dependencies

  const login = () => {
    console.log('🔧 [FRONTEND] Starting Auth0 login with configuration:');
    console.log('🔧 [FRONTEND] - Domain:', import.meta.env.VITE_AUTH0_DOMAIN);
    console.log('🔧 [FRONTEND] - Client ID:', import.meta.env.VITE_AUTH0_CLIENT_ID);
    console.log('🔧 [FRONTEND] - Audience:', import.meta.env.VITE_AUTH0_AUDIENCE);
    console.log('🔧 [FRONTEND] - Scopes: openid profile email');
    
    loginWithRedirect({
      authorizationParams: {
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: "openid profile email"
      }
    });
  };

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
    apiService.clearToken();
    setTokenReady(false);
    setTokenInitialized(false);
    setIsInitializing(false);
    initializingRef.current = false;
  };

  const getToken = async () => {
    try {
      console.log('🔧 [FRONTEND] Getting fresh Auth0 token...');
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: "openid profile email"
        }
      });
      console.log('🔧 [FRONTEND] Got fresh token:', token.substring(0, 30) + '...');
      
      // Decode and log the fresh token payload too
      try {
        const tokenParts = token.split('.');
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('🔧 [FRONTEND] Fresh token payload:', JSON.stringify(payload, null, 2));
      } catch (decodeError) {
        console.error('🔧 [FRONTEND] Failed to decode fresh token:', decodeError);
      }
      
      apiService.setToken(token);
      setTokenReady(true);
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      setTokenReady(false);
      return null;
    }
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    tokenReady,
    login,
    logout: handleLogout,
    getToken,
  };
};
