import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
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

  // Automatically get and set token when authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      const initializeToken = async () => {
        try {
          console.log('Initializing Auth0 token for user:', user.email);
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            }
          });
          console.log('Got Auth0 token:', token.substring(0, 30) + '...');
          apiService.setToken(token);
          setTokenReady(true);
          console.log('Auth0 token successfully set');
        } catch (error) {
          console.error('Error getting Auth0 token:', error);
          setTokenReady(false);
          // Try to get token silently with different parameters
          try {
            const fallbackToken = await getAccessTokenSilently();
            console.log('Got fallback Auth0 token:', fallbackToken.substring(0, 30) + '...');
            apiService.setToken(fallbackToken);
            setTokenReady(true);
          } catch (fallbackError) {
            console.error('Fallback token retrieval also failed:', fallbackError);
          }
        }
      };
      
      initializeToken();
    } else {
      setTokenReady(false);
      if (!isAuthenticated && !isLoading) {
        console.log('User not authenticated, clearing token');
        apiService.clearToken();
      }
    }
  }, [isAuthenticated, user, isLoading, getAccessTokenSilently]);

  const login = () => {
    loginWithRedirect();
  };

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
    apiService.clearToken();
    setTokenReady(false);
  };

  const getToken = async () => {
    try {
      console.log('Getting fresh Auth0 token...');
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        }
      });
      console.log('Got fresh token:', token.substring(0, 30) + '...');
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
