import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, session } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect immediately
  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Simulate Unified Auth
    const { error } = await signIn(email, password);
    setLoading(false);
    
    if (error) {
      setError(error);
      return;
    }
    // Success will automatically trigger session effect change
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
        <img src="/logo.png" alt="CacaoScan Logo" className="w-96 md:w-[400px] h-auto -mt-20 -mb-16 object-contain" />
        <h2 className="text-center text-3xl font-extrabold text-[#3E2723] z-10 relative">
          CacaoScan Central
        </h2>
        <p className="mt-2 text-center text-sm font-medium text-[#A1887F]">
          Strategic Management Center
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FAF0E6] py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-[#A1887F]/20">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm text-center font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#3E2723]">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-[#A1887F]/30 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FFB74D] focus:border-[#FFB74D] sm:text-sm bg-white text-[#3E2723]"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3E2723]">
                Password
              </label>
              <div className="mt-1 relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-[#A1887F]/30 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FFB74D] focus:border-[#FFB74D] sm:text-sm bg-white text-[#3E2723] pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#6D4C41] hover:bg-[#5C3D2E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6D4C41] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
              </button>
            </div>
          </form>

          <div className="mt-6 flex justify-center">
            <span className="flex items-center text-xs font-medium text-[#A1887F]">
              <Lock className="w-3 h-3 mr-1" /> Single Sign-On (SSO) Portal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
