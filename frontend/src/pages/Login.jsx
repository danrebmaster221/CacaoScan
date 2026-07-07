import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, Mail } from 'lucide-react';
import { CacaoLightTexture } from '../components/auth/CacaoLightTexture';

function InputField({ icon: Icon, focused, children, trailing }) {
  return (
    <div
      className="flex min-h-[52px] items-center rounded-2xl border-[1.5px] bg-white/75 px-4 shadow-sm backdrop-blur-sm transition-colors duration-200"
      style={{
        borderColor: focused ? '#FFB74D' : 'rgba(161, 136, 127, 0.35)',
        boxShadow: focused ? '0 0 0 3px rgba(255, 183, 77, 0.15)' : undefined,
      }}
    >
      <Icon
        className="mr-3 h-5 w-5 shrink-0 transition-colors"
        style={{ color: focused ? '#6D4C41' : '#A1887F' }}
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">{children}</div>
      {trailing}
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { signIn, session, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      if (userRole === 'admin') {
        navigate('/dashboard/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [session, userRole, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError(signInError);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 sm:px-8">
      <CacaoLightTexture />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex flex-col items-center">
            <img
              src="/cacaoscanlogo.png"
              alt="CacaoScan"
              className="-mt-4 h-auto w-full max-w-[340px] object-contain sm:max-w-[380px]"
            />
            <div
              className="central-scan-width -mt-7 flex justify-between text-[13px] font-bold leading-none text-[#3E2723]"
              aria-label="CENTRAL"
            >
              {'CENTRAL'.split('').map((letter) => (
                <span key={letter}>{letter}</span>
              ))}
            </div>
          </div>
          <p className="strategic-pill mt-4 uppercase">
            Strategic Management Center
          </p>
        </div>

        <div className="mb-6 w-full text-center">
          <h2 className="text-xl font-semibold text-[#3E2723]">Welcome back</h2>
          <p className="mt-1 text-sm text-[#A1887F]">Sign in to your dashboard</p>
        </div>

        <form className="w-full space-y-5" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-full border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <InputField icon={Mail} focused={emailFocused}>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              placeholder="Email address"
              className="auth-field h-11 w-full bg-transparent text-[15px] text-[#3E2723] placeholder:text-[#BCAAA4]"
            />
          </InputField>

          <InputField
            icon={Lock}
            focused={passwordFocused}
            trailing={
              <button
                type="button"
                className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#A1887F] transition-colors hover:text-[#6D4C41]"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" strokeWidth={1.75} />
                ) : (
                  <Eye className="h-5 w-5" strokeWidth={1.75} />
                )}
              </button>
            }
          >
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder="Password"
              className="auth-field h-11 w-full bg-transparent text-[15px] text-[#3E2723] placeholder:text-[#BCAAA4]"
            />
          </InputField>

          <button
            type="submit"
            disabled={loading}
            className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#6D4C41] text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(109,76,65,0.28)] transition-all hover:bg-[#5C3D2E] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        <div className="mt-8 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A1887F]/25 bg-[#FAF0E6]/80 px-4 py-2 text-xs font-medium text-[#A1887F] backdrop-blur-sm">
            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
            Single Sign-On (SSO) Portal
          </span>
        </div>
      </div>
    </div>
  );
}
