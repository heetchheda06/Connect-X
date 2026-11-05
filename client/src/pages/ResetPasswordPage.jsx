import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Waves, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios.js';
import PasswordStrengthMeter from '../components/ui/PasswordStrengthMeter.jsx';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // 1. Secure referrer policy
    let meta = document.querySelector('meta[name="referrer"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'referrer';
      document.head.appendChild(meta);
    }
    meta.content = 'no-referrer';

    // 2. Extract and strip token from URL to prevent leakage
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      // Strip token from browser address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('Missing or invalid reset token. Please request a new link.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token,
        password,
        confirmPassword,
      });

      setIsSuccess(true);
      toast.success(res.data?.message || 'Password reset successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to reset password. Link may have expired.';
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-app relative p-4 overflow-hidden font-sans">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-brand-300/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-border-main relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-brand">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-black text-text-primary tracking-tight">
              Connect<span className="text-brand-500">X</span>
            </h2>
            <p className="text-xs text-text-muted">Security & Password</p>
          </div>
        </div>

        {!isSuccess ? (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-bold font-heading text-text-primary">
                Set a new password
              </h3>
              <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
                Choose a strong password with at least 8 characters. Resetting your password will log out all other active devices.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-button bg-brand-gradient text-white font-semibold text-sm shadow-brand hover:shadow-brand-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Update Password & Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md animate-fade-in">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-primary">Password Reset Complete!</h3>
              <p className="text-xs sm:text-sm text-text-muted mt-2 leading-relaxed">
                Your password has been securely updated. Redirecting you to the sign-in page...
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border-main text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

