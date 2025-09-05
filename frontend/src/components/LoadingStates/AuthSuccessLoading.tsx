import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, Home, BarChart3, TrendingUp } from 'lucide-react';

interface AuthSuccessLoadingProps {
  message?: string;
  redirectMessage?: string;
}

const AuthSuccessLoading: React.FC<AuthSuccessLoadingProps> = ({ 
  message = "Authentication successful!",
  redirectMessage = "Taking you to your dashboard"
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    { icon: CheckCircle, text: "Authentication verified", color: "text-emerald-400" },
    { icon: BarChart3, text: "Loading your data", color: "text-blue-400" },
    { icon: TrendingUp, text: "Preparing insights", color: "text-purple-400" },
    { icon: Home, text: "Almost ready", color: "text-cyan-400" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(stepInterval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 relative overflow-hidden">
      {/* Success particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-emerald-400 rounded-full opacity-20 animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {/* Success checkmark */}
          <div className="mb-8">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
              <div className="absolute inset-2 bg-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {message}
            </h1>
            <p className="text-emerald-200">
              {redirectMessage}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="relative w-full h-3 bg-white/20 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-100 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-emerald-200 text-sm">{Math.round(progress)}% complete</p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div 
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-500 ${
                    isActive ? 'bg-white/10 backdrop-blur-sm' : 'opacity-50'
                  }`}
                >
                  <div className={`${isCompleted ? 'text-emerald-400' : step.color}`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-white text-sm font-medium flex-1 text-left">
                    {step.text}
                  </span>
                  {isActive && !isCompleted && (
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                  )}
                  {isCompleted && (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Continue indicator */}
          <div className="mt-8 flex items-center justify-center space-x-2 text-emerald-300">
            <span className="text-sm">Redirecting</span>
            <ArrowRight className="w-4 h-4 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSuccessLoading;
