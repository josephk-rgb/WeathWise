import React, { useState, useEffect } from 'react';
import { TrendingUp, Shield, Brain, Banknote, PieChart, Target, BarChart3, DollarSign, CreditCard, Wallet } from 'lucide-react';

interface AuthLoadingScreenProps {
  message?: string;
}

const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({ 
  message = "Take control of your finances" 
}) => {
  const [loadingStep, setLoadingStep] = useState(0);
  const [displayMessage, setDisplayMessage] = useState('');
  
  const loadingSteps = [
    "Establishing secure connection...",
    "Verifying your identity...",
    "Loading financial insights...",
    "Preparing your dashboard..."
  ];

  // Typing effect for the main message
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= message.length) {
        setDisplayMessage(message.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [message]);

  // Loading step progression
  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  // Floating financial icons animation
  const floatingIcons = [
    { Icon: TrendingUp, delay: '0s', position: 'top-10 left-10', color: 'text-emerald-400' },
    { Icon: PieChart, delay: '0.5s', position: 'top-20 right-20', color: 'text-blue-400' },
    { Icon: Target, delay: '1s', position: 'bottom-20 left-20', color: 'text-purple-400' },
    { Icon: BarChart3, delay: '1.5s', position: 'bottom-10 right-10', color: 'text-cyan-400' },
    { Icon: Banknote, delay: '2s', position: 'top-1/2 left-5', color: 'text-green-400' },
    { Icon: Brain, delay: '2.5s', position: 'top-1/3 right-5', color: 'text-violet-400' },
    { Icon: DollarSign, delay: '3s', position: 'bottom-1/3 left-10', color: 'text-yellow-400' },
    { Icon: CreditCard, delay: '3.5s', position: 'top-2/3 right-20', color: 'text-pink-400' },
    { Icon: Wallet, delay: '4s', position: 'bottom-1/2 right-5', color: 'text-indigo-400' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-violet-900 to-magenta-900 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-12 gap-4 h-full animate-pulse">
          {Array.from({ length: 144 }).map((_, i) => (
            <div 
              key={i} 
              className="bg-white rounded-sm"
              style={{ 
                animationDelay: `${i * 0.05}s`,
                opacity: Math.random() * 0.3 + 0.1 
              }}
            />
          ))}
        </div>
      </div>

      {/* Floating financial icons */}
      {floatingIcons.map(({ Icon, delay, position, color }, index) => (
        <div
          key={index}
          className={`absolute ${position} ${color} animate-bounce opacity-30 hover:opacity-60 transition-opacity`}
          style={{ animationDelay: delay, animationDuration: '3s' }}
        >
          <Icon size={28 + (index % 3) * 4} />
        </div>
      ))}

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          {/* Logo with pulsing effect */}
          <div className="mb-8">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full animate-pulse opacity-75"></div>
              <div className="absolute inset-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-3 tracking-tight">
              WealthWise AI
            </h1>
            <p className="text-lg text-gray-300 font-light">
              Smarter Wealth, Powered by AI
            </p>
          </div>

          {/* Main message with typewriter effect */}
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 h-20 overflow-hidden">
              <span className="inline-block">
                {displayMessage}
                <span className="animate-pulse">|</span>
              </span>
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              We're setting up your personalized financial dashboard with 
              <span className="text-emerald-400 font-semibold"> AI-powered insights</span>
            </p>
            <div className="mt-4 text-sm text-gray-400 animate-pulse">
              {loadingSteps[loadingStep]}
            </div>
          </div>

          {/* Loading animation */}
          <div className="mb-8">
            {/* Progress bar with step indicator */}
            <div className="relative w-full h-3 bg-white/20 rounded-full overflow-hidden mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full opacity-50">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                ></div>
              </div>
            </div>
            
            {/* Dual spinner */}
            <div className="flex justify-center">
              <div className="relative">
                {/* Outer ring */}
                <div className="w-16 h-16 border-4 border-white/10 rounded-full"></div>
                {/* Inner spinner */}
                <div className="absolute inset-2 w-12 h-12 border-4 border-transparent border-t-emerald-400 border-r-cyan-400 rounded-full animate-spin"></div>
                {/* Center dot */}
                <div className="absolute inset-6 w-4 h-4 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-white font-medium">Smart Analytics</p>
              <div className="mt-2 flex justify-center">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <Shield className="w-6 h-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-white font-medium">Bank-Level Security</p>
              <div className="mt-2 flex justify-center">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <Brain className="w-6 h-6 text-violet-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-white font-medium">AI Recommendations</p>
              <div className="mt-2 flex justify-center">
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>
            </div>
          </div>

          {/* Loading text */}
          <div className="mt-8">
            <p className="text-white/80 text-sm animate-pulse">
              Authenticating your account...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLoadingScreen;
