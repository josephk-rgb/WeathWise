import React from 'react';
import { useUser } from '../../contexts/UserContext';
import ProfileCompletionModal from './ProfileCompletionModal';

interface ProfileCompletionWrapperProps {
  children: React.ReactNode;
}

const ProfileCompletionWrapper: React.FC<ProfileCompletionWrapperProps> = ({ children }) => {
  const { 
    isAuthenticated,
    isProfileLoading, 
    isProfileComplete,
    userProfile,
    user,
    updateProfile,
    profileError
  } = useUser();

  // Don't show modal if not authenticated or still loading
  const shouldShowProfileCompletion = isAuthenticated && 
    !isProfileLoading && 
    !isProfileComplete && 
    !profileError;

  const handleProfileComplete = async (profileData: any) => {
    await updateProfile({
      profile: profileData,
      metadata: {
        ...userProfile?.metadata,
        onboardingCompleted: true
      }
    });
  };

  const handleProfileSkip = async () => {
    await updateProfile({
      metadata: {
        ...userProfile?.metadata,
        onboardingCompleted: true
      }
    });
  };

  // Show loading state while profile is being fetched
  if (isAuthenticated && isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-violet-900 to-magenta-900">
        <div className="text-white">
          <div className="text-lg mb-4">Loading your profile...</div>
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show error state if profile loading failed
  if (profileError && !profileError.includes('Authentication failed')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-violet-900 to-magenta-900">
        <div className="text-white text-center">
          <div className="text-lg mb-4">Unable to load your profile</div>
          <div className="text-sm mb-4">{profileError}</div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white"
          >
            Retry
          </button>
        </div>
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
        userEmail={user?.email || ''}
      />
    </>
  );
};

export default ProfileCompletionWrapper;
