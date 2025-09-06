import React from 'react';
import { LogIn, Shield, TrendingUp, Brain } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import Button from '../components/UI/Button';
import { AuthLoadingScreen } from '../components/LoadingStates';

const Login: React.FC = () => {
  const { login, isLoading } = useUser();

  // Show loading screen while authenticating
  if (isLoading) {
    return <AuthLoadingScreen message="Signing you in securely" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-violet-900 to-magenta-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
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

      {/* Floating icons */}
      <div className="absolute top-10 left-10 text-white/20 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>
        <TrendingUp size={32} />
      </div>
      <div className="absolute top-20 right-20 text-white/20 animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }}>
        <Brain size={32} />
      </div>
      <div className="absolute bottom-20 left-20 text-white/20 animate-bounce" style={{ animationDelay: '2s', animationDuration: '3s' }}>
        <Shield size={32} />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full animate-pulse opacity-75"></div>
            <div className="absolute inset-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white mb-2">
            WealthWise AI
          </h1>
          <p className="text-gray-300">
            Smarter Wealth, Powered by AI
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-white mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-300">
              Take control of your finances with AI
            </p>
          </div>

          <Button
            onClick={login}
            loading={isLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold"
            size="lg"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign in with Auth0
          </Button>

          {/* Feature highlights */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="p-3">
              <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs text-gray-300">Smart Analytics</p>
            </div>
            <div className="p-3">
              <Shield className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
              <p className="text-xs text-gray-300">Secure</p>
            </div>
            <div className="p-3">
              <Brain className="w-6 h-6 text-violet-400 mx-auto mb-1" />
              <p className="text-xs text-gray-300">AI Powered</p>
            </div>
          </div>

          {/* Info Notice */}
          <div className="mt-6 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <p className="text-sm text-emerald-300 text-center">
              <strong>Bank-Level Security:</strong> Enterprise-grade protection powered by Auth0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;