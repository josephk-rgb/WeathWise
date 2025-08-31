import React from 'react';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import ProfileCompletionModal from './ProfileCompletionModal';

interface ProfileCompletionWrapperProps {
  children: React.ReactNode;
}

const ProfileCompletionWrapper: React.FC<ProfileCompletionWrapperProps> = ({ children }) => {
  const { 
    shouldShowProfileCompletion, 
    updateProfile, 
    skipProfileCompletion, 
    userEmail,
    isLoading 
  } = useProfileCompletion();

  const handleProfileComplete = async (profileData: any) => {
    await updateProfile(profileData);
  };

  const handleProfileSkip = async () => {
    await skipProfileCompletion();
  };

  // Don't render anything while loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-violet-900 to-magenta-900">
        <div className="text-white text-lg">Loading profile...</div>
      </div>
    );
  }

  return (
    <>
      {children}
      <ProfileCompletionModal
        isOpen={shouldShowProfileCompletion}
        onComplete={handleProfileComplete}
        onSkip={handleProfileSkip}
        userEmail={userEmail}
      />
    </>
  );
};

export default ProfileCompletionWrapper;
