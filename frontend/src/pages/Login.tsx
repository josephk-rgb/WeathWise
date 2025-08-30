import React from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/UI/Button';

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-violet-900 to-magenta-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-white mb-2">
            WealthWise AI
          </h1>
          <p className="text-gray-300">
            Smarter Wealth, Powered by AI
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600">
              Sign in to your account to continue
            </p>
          </div>

          <Button
            onClick={login}
            loading={isLoading}
            className="w-full py-3"
            size="lg"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign in with Auth0
          </Button>

          {/* Info Notice */}
          <div className="mt-6 p-4 bg-violet-50 rounded-lg">
            <p className="text-sm text-violet-700 text-center">
              <strong>Secure Authentication:</strong> Powered by Auth0 for enterprise-grade security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;