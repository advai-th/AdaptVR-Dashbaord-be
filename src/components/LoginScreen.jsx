import React, { useState } from 'react';

export const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('teacher@school.edu');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password.length >= 6) {
      onLogin({ email, name: 'Dr. E. Vance' });
    } else {
      setError('Invalid credentials. Please check your email and password and try again.');
    }
  };

  return (
    <div className="bg-[#ffffff] min-h-screen flex items-center justify-center p-4 font-sans text-[#121c2a]">
      <main className="w-full max-w-md bg-white rounded-xl border border-[#bcc9c6]/40 shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="px-8 pt-8 pb-5 text-center border-b border-[#eff4ff]">
          <div className="flex flex-col items-center justify-center">
            <img 
              src="/assets/logo-full.svg" 
              alt="AdaptVR Platform" 
              className="h-11 object-contain" 
            />
            <p className="text-xs font-semibold text-[#3d4947] mt-2">Teacher Educator Portal</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                  className="w-full h-10 pl-10 pr-4 bg-white border border-[#bcc9c6] rounded-lg text-sm text-[#121c2a] placeholder:text-[#bcc9c6] focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors outline-none"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[#3d4947]" htmlFor="password">
                  Password
                </label>
                <a className="text-xs text-[#00685f] hover:text-[#008378] transition-colors" href="#">
                  Forgot password?
                </a>
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
                  className="w-full h-10 pl-10 pr-10 bg-white border border-[#bcc9c6] rounded-lg text-sm text-[#121c2a] placeholder:text-[#bcc9c6] focus:border-[#00685f] focus:ring-1 focus:ring-[#00685f] transition-colors outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bcc9c6] hover:text-[#121c2a] transition-colors focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me */}
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
              className="mt-4 h-10 w-full bg-[#00685f] hover:bg-[#008378] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
            >
              <span>Login to Dashboard</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-[#eff4ff] border-t border-[#e6eeff] text-center">
          <p className="text-xs text-[#3d4947]">
            Need help accessing your account? <br />
            <a className="text-[#00685f] hover:underline font-medium" href="#">
              Contact IT Support
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};
