import React from 'react';
import { useUser } from '../../contexts/UserContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import ProfileCompletionModal from './ProfileCompletionModal';

interface ProfileCompletionWrapperProps {
  children: React.ReactNode;
}

const ProfileCompletionWrapper: React.FC<ProfileCompletionWrapperProps> = ({ children }) => {
  const { 
    isAuthenticated,
    user,
    userProfile,
    isProfileComplete: contextProfileComplete
  } = useUser();

  const {
    isProfileComplete: hookProfileComplete,
    isLoading,
    updateProfile,
    skipProfileCompletion,
    shouldShowProfileCompletion
  } = useProfileCompletion();

  // Debug logging
  console.log('🔧 [ProfileCompletionWrapper] State check:', {
    isAuthenticated,
    isLoading,
    contextProfileComplete,
    hookProfileComplete,
    shouldShowProfileCompletion,
    shouldShowModal: shouldShowProfileCompletion,
    userEmail: user?.email,
    userProfileEmail: userProfile?.email,
    firstName: userProfile?.profile?.firstName,
    lastName: userProfile?.profile?.lastName,
    onboardingCompleted: userProfile?.metadata?.onboardingCompleted
  });

  console.log('🚨 [ProfileCompletionWrapper] SHOULD SHOW MODAL:', shouldShowProfileCompletion);

  const handleProfileComplete = async (profileData: any) => {
    await updateProfile(profileData);
  };

  const handleProfileSkip = async () => {
    await skipProfileCompletion();
  };

  // Use the comprehensive logic from the hook instead of simplified logic
  const shouldShowModal = shouldShowProfileCompletion;

  return (
    <>
      {children}
      <ProfileCompletionModal
        isOpen={shouldShowModal}
        onComplete={handleProfileComplete}
        onSkip={handleProfileSkip}
        userEmail={user?.email || ''}
      />
    </>
  );
};

export default ProfileCompletionWrapper;
