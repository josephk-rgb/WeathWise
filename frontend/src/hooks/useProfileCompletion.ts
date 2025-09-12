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
  const { userProfile, isProfileLoading, isProfileComplete: contextIsProfileComplete, refreshProfile } = useUser();
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
      
      console.log('🔧 [FRONTEND] Sending profile data:', profileData);
      
      // Clean up the data - don't send empty strings
      const cleanData: any = {
        firstName: profileData.firstName,
        lastName: profileData.lastName
      };
      
      // Only include optional fields if they have values
      if (profileData.phone && profileData.phone.trim()) {
        cleanData.phone = profileData.phone.trim();
      }
      
      if (profileData.dateOfBirth && profileData.dateOfBirth.trim()) {
        cleanData.dateOfBirth = profileData.dateOfBirth.trim();
      }
      
      // Only include address if it has meaningful data
      if (profileData.address) {
        const hasAddressData = Object.values(profileData.address).some(value => value && value.trim());
        if (hasAddressData) {
          cleanData.address = profileData.address;
        }
      }
      
      console.log('🔧 [FRONTEND] Cleaned data being sent:', cleanData);
      
      // Update profile using the updateProfile API
      await apiService.updateProfile(cleanData);

      console.log('✅ Profile updated successfully');
      
      // Mark onboarding as complete
      console.log('🔧 [FRONTEND] Marking onboarding as complete...');
      await apiService.completeOnboarding();
      console.log('✅ Onboarding marked as complete');
      
      // Refresh the user profile data to update the completion status
      console.log('🔧 [FRONTEND] Refreshing user profile data...');
      await refreshProfile();
      console.log('✅ Profile data refreshed - modal should close');
      
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
