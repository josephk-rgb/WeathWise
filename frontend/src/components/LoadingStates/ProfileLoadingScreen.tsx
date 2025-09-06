import React from 'react';
import { User } from 'lucide-react';

interface ProfileLoadingScreenProps {
  message?: string;
  subtitle?: string;
}

const ProfileLoadingScreen: React.FC<ProfileLoadingScreenProps> = ({ 
  message = "Preparing your dashboard",
  subtitle = "Loading your personalized financial insights"
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-violet-900 to-magenta-900 relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-8 gap-2 h-full">
          {Array.from({ length: 64 }).map((_, i) => (
            <div 
              key={i} 
              className="bg-white rounded animate-pulse"
              style={{ 
                animationDelay: `${i * 0.1}s`,
                animationDuration: '2s'
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {/* Avatar placeholder with animation */}
          <div className="mb-8">
            <div className="relative mx-auto w-20 h-20 mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse opacity-75"></div>
              <div className="absolute inset-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Loading message */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2 animate-pulse">
              {message}
            </h2>
            <p className="text-gray-300 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Progress indicators */}
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2 text-emerald-400">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Security verified</span>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2 text-blue-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <span className="text-sm">Loading preferences</span>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2 text-purple-400">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                <span className="text-sm">Analyzing data</span>
              </div>
            </div>
          </div>

          {/* Spinner */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-white/20 rounded-full"></div>
              <div className="absolute inset-0 w-10 h-10 border-2 border-transparent border-t-blue-400 border-r-purple-400 rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileLoadingScreen;
