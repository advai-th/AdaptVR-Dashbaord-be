import React, { useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('evelyn.vance@adaptvr.edu');
  const [password, setPassword] = useState('password123');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    if (!isSignUp) {
      // Switching to Sign Up
      setPassword('');
      setConfirmPassword('');
    } else {
      // Switching back to Login
      setEmail('evelyn.vance@adaptvr.edu');
      setPassword('password123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignUp) {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const data = await api.register(fullName.trim(), email.trim(), password);
        if (data.token) {
          localStorage.setItem('adaptvr_auth_token', data.token);
          localStorage.setItem('adaptvr_user', JSON.stringify(data.user));
          onLogin(data.user);
        } else {
          setError('Registration succeeded but no token was returned.');
        }
      } else {
        const data = await api.login(email.trim(), password);
        if (data.token) {
          localStorage.setItem('adaptvr_auth_token', data.token);
          localStorage.setItem('adaptvr_user', JSON.stringify(data.user));
          onLogin(data.user);
        } else {
          setError('Authentication failed. No token returned.');
        }
      }
    } catch (err: any) {
      console.error(isSignUp ? 'Registration error:' : 'Login error:', err);
      setError(
        err.message ||
          (isSignUp
            ? 'Failed to create account. Please try again.'
            : 'Invalid credentials. Please check your email and password.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#ffffff] min-h-screen flex items-center justify-center p-4 font-sans text-[#121c2a]">
      <main className="w-full max-w-md bg-white rounded-xl border border-[#bcc9c6]/40 shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="px-8 pt-6 pb-5 text-center border-b border-[#eff4ff]">
          <div className="flex flex-col items-center justify-center">
            <img
              src="/assets/vr-logo-dark.svg"
              alt="AdaptVR Platform"
              className="h-11 object-contain dark:hidden"
            />
            <img
              src="/assets/vr-logo-light.svg"
              alt="AdaptVR Platform"
              className="h-18 object-contain hidden dark:block"
            />
            <p className="text-xs font-semibold text-[#3d4947] dark:text-slate-300 mt-2">
              {isSignUp ? 'Create Educator Account' : 'Educator Portal Login'}
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full Name Input (Register mode only) */}
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#3d4947]" htmlFor="fullName">
                  Full Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#bcc9c6] text-[20px]">
                    person
                  </span>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Evelyn Vance"
                    disabled={isLoading}
                    className="w-full h-10 pl-10 pr-4 bg-white border border-[#bcc9c6] rounded-lg text-sm text-[#121c2a] placeholder:text-[#bcc9c6] focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors outline-none disabled:bg-gray-50"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[#3d4947]" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#bcc9c6] text-[20px]">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.edu"
                  disabled={isLoading}
                  className="w-full h-10 pl-10 pr-4 bg-white border border-[#bcc9c6] rounded-lg text-sm text-[#121c2a] placeholder:text-[#bcc9c6] focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors outline-none disabled:bg-gray-50"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[#3d4947]" htmlFor="password">
                  Password
                </label>
                {!isSignUp && (
                  <a className="text-xs text-[#00685f] hover:text-[#008378] transition-colors" href="#">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#bcc9c6] text-[20px]">
                  lock
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full h-10 pl-10 pr-10 bg-white border border-[#bcc9c6] rounded-lg text-sm text-[#121c2a] placeholder:text-[#bcc9c6] focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors outline-none disabled:bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bcc9c6] hover:text-[#121c2a] transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm Password Input (Register mode only) */}
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#3d4947]" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#bcc9c6] text-[20px]">
                    lock_reset
                  </span>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full h-10 pl-10 pr-10 bg-white border border-[#bcc9c6] rounded-lg text-sm text-[#121c2a] placeholder:text-[#bcc9c6] focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors outline-none disabled:bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bcc9c6] hover:text-[#121c2a] transition-colors focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showConfirmPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me (Login mode only) */}
            {!isSignUp && (
              <div className="flex items-center gap-2 mt-1">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#bcc9c6] text-[#00685f] focus:ring-[#00685f] bg-white cursor-pointer"
                />
                <label className="text-sm text-[#3d4947] cursor-pointer" htmlFor="remember">
                  Remember me for 30 days
                </label>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-2 p-3 rounded-lg bg-[#ffdad6] border border-[#ba1a1a] flex items-start gap-2">
                <span className="material-symbols-outlined text-[#ba1a1a] text-[18px] mt-0.5">
                  error
                </span>
                <p className="text-xs text-[#ba1a1a]">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 h-10 w-full bg-[#00685f] hover:bg-[#008378] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>{isSignUp ? 'Creating account...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Login to Dashboard'}</span>
                  <span className="material-symbols-outlined text-[18px]">
                    {isSignUp ? 'person_add' : 'arrow_forward'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-[#eff4ff] border-t border-[#e6eeff] text-center">
          <p className="text-xs text-[#3d4947]">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={handleToggleMode}
                  className="text-[#00685f] hover:underline font-semibold transition-colors"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={handleToggleMode}
                  className="text-[#00685f] hover:underline font-semibold transition-colors"
                >
                  Create an account
                </button>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
};
