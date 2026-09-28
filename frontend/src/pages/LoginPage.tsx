import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ApiError } from '../types/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      navigate(from, { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.code === 'AUTHENTICATION_FAILED') {
        setError('Invalid email or password. Check your credentials and try again.');
      } else {
        setError('Unable to reach the server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center px-4">
      {/* Background accent line */}
      <div
        className="fixed top-0 left-0 right-0 h-1"
        style={{ backgroundColor: '#0B6E6E' }}
      />

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#0B6E6E] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="3" width="14" height="2" rx="1" fill="white"/>
                <rect x="2" y="8" width="10" height="2" rx="1" fill="white"/>
                <rect x="2" y="13" width="12" height="2" rx="1" fill="white"/>
              </svg>
            </div>
            <span className="text-lg font-semibold text-[#101828] tracking-tight">LeaveFlow</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">Sign in to your account</h1>
          <p className="mt-1.5 text-sm text-[#667085]">Enter your work email and password to continue.</p>
        </div>

        {/* Form Card */}
        <div
          className="bg-white border border-[#E4E7EC] rounded-[10px] p-7"
          style={{ boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}
        >
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-[#101828]">
                Work email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={loading}
                className="h-9 px-3 text-sm text-[#101828] bg-white border border-[#E4E7EC] rounded-[6px] w-full placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-1 transition-colors hover:border-[#D0D5DD] disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-[#101828]">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                disabled={loading}
                className="h-9 px-3 text-sm text-[#101828] bg-white border border-[#E4E7EC] rounded-[6px] w-full placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-1 transition-colors hover:border-[#D0D5DD] disabled:opacity-50"
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-[6px] text-sm"
                style={{ backgroundColor: '#FEF3F2', color: '#B42318' }}
                role="alert"
              >
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 10.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm.75-4.25a.75.75 0 0 1-1.5 0V5a.75.75 0 0 1 1.5 0v2.25z"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="h-9 w-full bg-[#0B6E6E] hover:bg-[#095A5A] text-white text-sm font-medium rounded-[6px] flex items-center justify-center gap-2 transition-colors duration-[140ms] focus-visible:outline-2 focus-visible:outline-[#0B6E6E] focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {loading ? 'Signing in' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-6 border border-[#E4E7EC] rounded-[10px] bg-white p-4">
          <p className="text-xs font-medium text-[#475467] mb-2.5">Demo accounts</p>
          <div className="grid grid-cols-1 gap-1.5 text-xs text-[#667085] font-mono">
            <div className="flex justify-between">
              <span className="text-[#475467]">HR</span>
              <span>hannah@leaveflow.internal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#475467]">Manager</span>
              <span>meera@leaveflow.internal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#475467]">Employee</span>
              <span>arun@leaveflow.internal</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-[#F2F4F7] pt-1.5">
              <span className="text-[#475467]">Password</span>
              <span>Password@123</span>
            </div>
          </div>
          <p
            className="mt-2 text-xs"
            style={{ color: '#B54708' }}
          >
            For demonstration only. Do not reuse this password.
          </p>
        </div>
      </div>
    </div>
  );
}
