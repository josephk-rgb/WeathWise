import { useState } from 'react';
import { useAuth } from './useAuth';
import { useUser } from '../contexts/UserContext';
import { apiService } from '../services/api';

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
  const { userProfile, isProfileLoading, isProfileComplete: contextIsProfileComplete } = useUser();
  const [error, setError] = useState<string | null>(null);

  // Use UserContext data instead of separate API calls
  const isLoading = isProfileLoading;
  const isProfileComplete = contextIsProfileComplete;

  console.log('📋 [useProfileCompletion] State:', {
    isAuthenticated,
    tokenReady,
    isLoading,
    isProfileComplete,
    shouldShow: isAuthenticated && tokenReady && !isLoading && !isProfileComplete
  });

  // Update profile function
  const updateProfile = async (profileData: ProfileData): Promise<void> => {
    try {
      setError(null);
      
      // Update profile using the updateProfile API
      await apiService.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        dateOfBirth: profileData.dateOfBirth
      } as any);

      console.log('✅ Profile updated successfully');
      
      // Mark onboarding as complete
      await apiService.completeOnboarding();
      
      // Refresh the page to get updated data
      window.location.reload();
      
    } catch (err: any) {
      console.error('❌ Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  };

  // Skip profile completion (mark onboarding as completed without full profile)
  const skipProfileCompletion = async (): Promise<void> => {
    try {
      setError(null);
      
      console.log('⏭️ Skipping profile completion...');
      
      // Just mark onboarding as completed without profile data
      await apiService.completeOnboarding();
      
      console.log('✅ Profile completion skipped');
      
      // Refresh to get updated state
      window.location.reload();
      
    } catch (err: any) {
      console.error('❌ Error skipping profile completion:', err);
      setError(err.message || 'Failed to skip profile completion');
      throw err;
    }
  };

  return {
    userProfile,
    isProfileComplete,
    isLoading,
    error,
    updateProfile,
    skipProfileCompletion,
    refetchProfile: () => window.location.reload(),
    // Helper to determine if profile completion modal should be shown
    shouldShowProfileCompletion: isAuthenticated && tokenReady && !isLoading && !isProfileComplete,
    // Auth0 user email for display
    userEmail: auth0User?.email
  };
};
