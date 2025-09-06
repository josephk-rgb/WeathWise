import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { apiService } from '../services/api';

interface BackendUserProfile {
  id: string;
  email: string;
  profile: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: Date;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  metadata: {
    onboardingCompleted?: boolean;
    lastLogin?: Date;
    loginCount: number;
  };
  preferences?: any;
  riskProfile?: any;
  subscription?: any;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export const useProfileCompletion = () => {
  const { isAuthenticated, tokenReady, user: auth0User } = useAuth();
  const [userProfile, setUserProfile] = useState<BackendUserProfile | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  // Fetch user profile from backend
  const fetchUserProfile = async () => {
    if (!isAuthenticated || !tokenReady) {
      console.log('🚫 Profile fetch skipped - Auth:', isAuthenticated, 'TokenReady:', tokenReady);
      return;
    }

    try {
      console.log('🔄 Fetching user profile...');
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.getCurrentUser();
      const profile: BackendUserProfile = response as any;
      
      console.log('✅ Profile fetched successfully:', {
        hasProfile: !!profile,
        hasProfileData: !!profile.profile,
        hasMetadata: !!profile.metadata
      });
      
      setUserProfile(profile);
      
      // Check if profile is complete
      const hasRequiredFields = Boolean(profile.profile?.firstName && profile.profile?.lastName);
      const onboardingCompleted = Boolean(profile.metadata?.onboardingCompleted);
      
      console.log('📋 Profile completion check:', {
        hasRequiredFields,
        onboardingCompleted,
        isComplete: hasRequiredFields && onboardingCompleted
      });
      
      setIsProfileComplete(hasRequiredFields && onboardingCompleted);
    } catch (err: any) {
      console.error('❌ Error fetching user profile:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (profileData: ProfileData): Promise<void> => {
    if (!isAuthenticated || !tokenReady) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      
      // Complete profile and onboarding in one atomic operation
      const updateData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        ...(profileData.phone && { phone: profileData.phone }),
        ...(profileData.dateOfBirth && { dateOfBirth: profileData.dateOfBirth }),
        ...(profileData.address && { address: profileData.address })
      };

      await apiService.completeProfile(updateData as any);
      
      // Refresh profile data to ensure UI is in sync
      await fetchUserProfile();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      throw new Error(err.response?.data?.error || 'Failed to update profile');
    }
  };

  // Skip profile completion (mark onboarding as completed without full profile)
  const skipProfileCompletion = async (): Promise<void> => {
    if (!isAuthenticated || !tokenReady) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      
      // Just mark onboarding as completed without profile data
      await apiService.completeProfile({});
      
      // Refresh profile data
      await fetchUserProfile();
    } catch (err: any) {
      console.error('Error skipping profile completion:', err);
      throw new Error(err.response?.data?.error || 'Failed to skip profile completion');
    }
  };

  // Fetch profile when authentication is ready
  useEffect(() => {
    if (isAuthenticated && tokenReady && !isLoading && !hasAttemptedFetch) {
      console.log('🎯 Triggering profile fetch - Auth:', isAuthenticated, 'TokenReady:', tokenReady, 'Loading:', isLoading);
      setHasAttemptedFetch(true);
      
      // Add a timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.error('⏰ Profile fetch timed out after 10 seconds');
          setError('Profile loading timed out. Please refresh the page.');
          setIsLoading(false);
        }
      }, 10000);
      
      fetchUserProfile().finally(() => {
        clearTimeout(timeoutId);
      });
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isAuthenticated, tokenReady, hasAttemptedFetch]);

  return {
    userProfile,
    isProfileComplete,
    isLoading,
    error,
    updateProfile,
    skipProfileCompletion,
    refetchProfile: fetchUserProfile,
    // Helper to determine if profile completion modal should be shown
    shouldShowProfileCompletion: isAuthenticated && tokenReady && !isLoading && !isProfileComplete,
    // Auth0 user email for display
    userEmail: auth0User?.email
  };
};
