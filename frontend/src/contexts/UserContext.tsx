import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../services/api';
import { useStore } from '../store/useStore';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role?: 'user' | 'admin';
  profile?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    employmentStatus?: string;
    annualIncome?: number;
    investmentExperience?: string;
  };
  preferences?: any;
  riskProfile?: any;
  subscription?: any;
  metadata?: {
    onboardingCompleted?: boolean;
    lastLogin?: Date;
    loginCount?: number;
  };
}

interface UserContextValue {
  // Auth state from Auth0
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any; // Auth0 user object
  
  // Enhanced user profile from backend
  userProfile: UserProfile | null;
  isProfileLoading: boolean;
  profileError: string | null;
  isProfileComplete: boolean;
  
  // Actions
  login: () => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

export const UserContext = createContext<UserContextValue | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading: authLoading,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  // Get store actions
  const { setUser } = useStore();

  // Profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Derived state
  const isLoading = authLoading || (isAuthenticated && !hasInitialized);
  const isProfileComplete = Boolean(
    userProfile?.profile?.firstName && 
    userProfile?.profile?.lastName && 
    userProfile?.profile?.firstName !== 'FirstName' &&  // Not placeholder
    userProfile?.profile?.lastName !== 'LastName' &&    // Not placeholder
    userProfile?.metadata?.onboardingCompleted &&
    !userProfile?.email?.includes('@temp.wealthwise.com') // Not temp email
  );

  // Debug logging for profile completion
  console.log('🔧 [UserContext] Profile completion check:', {
    firstName: userProfile?.profile?.firstName,
    lastName: userProfile?.profile?.lastName,
    email: userProfile?.email,
    onboardingCompleted: userProfile?.metadata?.onboardingCompleted,
    isProfileComplete,
    conditions: {
      hasFirstName: !!userProfile?.profile?.firstName,
      hasLastName: !!userProfile?.profile?.lastName,
      firstNameNotPlaceholder: userProfile?.profile?.firstName !== 'FirstName',
      lastNameNotPlaceholder: userProfile?.profile?.lastName !== 'LastName',
      onboardingComplete: !!userProfile?.metadata?.onboardingCompleted,
      emailNotTemp: !userProfile?.email?.includes('@temp.wealthwise.com')
    }
  });

  // Fetch user profile from backend
  const fetchProfile = async () => {
    if (!isAuthenticated || !auth0User) return;

    try {
      setIsProfileLoading(true);
      setProfileError(null);

      // Get token and set it in API service
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        }
      });
      
      console.log('🔧 [DEBUG] Token retrieved:', !!token, token ? token.substring(0, 30) + '...' : 'null');
      
      // Configure API service with token
      apiService.setToken(token);
      
      console.log('🔧 [DEBUG] Token set in API service:', !!apiService.getCurrentToken());

      // Prepare Auth0 user data to send to backend
      const auth0UserData = {
        email: auth0User.email,
        given_name: auth0User.given_name || auth0User.name?.split(' ')[0],
        family_name: auth0User.family_name || auth0User.name?.split(' ').slice(1).join(' '),
        name: auth0User.name
      };

      console.log('🔧 [FRONTEND] Sending Auth0 user data to backend:', auth0UserData);

      // Fetch profile with Auth0 user data
      const profile = await apiService.getCurrentUser(auth0UserData);
      
  // Debug: Log received profile
  console.log('🔍 [UserContext] Raw profile received from backend:', JSON.stringify(profile, null, 2));
  console.log('🔍 DEBUG - Profile role:', profile?.role);
  console.log('🔍 DEBUG - Profile keys:', Object.keys(profile || {}));
      
      setUserProfile(profile);
      
      // Also set the user in the store for compatibility with existing pages
      setUser(profile);
      
      console.log('✅ User profile loaded successfully');
    } catch (error: any) {
      console.error('❌ Failed to load user profile:', error);
      setProfileError(error.message || 'Failed to load profile');
    } finally {
      setIsProfileLoading(false);
      setHasInitialized(true);
    }
  };

  // Initialize profile when authenticated
  useEffect(() => {
    if (isAuthenticated && auth0User && !hasInitialized) {
      console.log('🚀 Initializing user profile for:', auth0User.email);
      fetchProfile();
    } else if (!isAuthenticated) {
      // Reset state on logout
      setUserProfile(null);
      setUser(null);
      setIsProfileLoading(false);
      setProfileError(null);
      setHasInitialized(false);
      apiService.clearToken();
    }
  }, [isAuthenticated, auth0User?.sub]); // Only depend on auth state and user ID

  // Actions
  const login = () => {
    loginWithRedirect({
      authorizationParams: {
        scope: "openid profile email"
      }
    });
  };

  const logout = () => {
    auth0Logout({ 
      logoutParams: { 
        returnTo: window.location.origin 
      } 
    });
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!userProfile) return;

    try {
      setIsProfileLoading(true);
      const updatedProfile = await apiService.updateProfile(data);
      setUserProfile(updatedProfile);
      setUser(updatedProfile);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      throw error;
    } finally {
      setIsProfileLoading(false);
    }
  };

  const value: UserContextValue = {
    // Auth state
    isAuthenticated,
    isLoading,
    user: auth0User,
    
    // Profile state
    userProfile,
    isProfileLoading,
    profileError,
    isProfileComplete,
    
    // Actions
    login,
    logout,
    refreshProfile,
    updateProfile,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// Hook to use UserContext
export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Re-export for backward compatibility (temporary)
export const useAuth = useUser;
