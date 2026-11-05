import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Waves, CheckCircle2, XCircle, ArrowRight, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios.js';
import { useAuthStore } from '../store/authStore.js';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const action = searchParams.get('action'); // 'change' for email change confirmation

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function executeVerification() {
      if (!token) {
        if (isMounted) {
          setStatus('error');
          setMessage('No verification token found in URL.');
        }
        return;
      }

      try {
        const endpoint = action === 'change' ? '/auth/confirm-email-change' : '/auth/verify-email';
        const res = await api.post(endpoint, { token });

        if (isMounted) {
          setStatus('success');
          setMessage(res.data?.message || 'Email verified successfully!');

          // Update user in authStore if logged in
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            useAuthStore.setState({
              user: { ...currentUser, emailVerified: true },
            });
          }

          // Strip token from browser address bar
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setMessage(
            err.response?.data?.message ||
              'This verification link is invalid or has expired. Please request a new one.'
          );
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token, action]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResending(true);
    try {
      const res = await api.post('/auth/resend-verification', {
        email: resendEmail.trim().toLowerCase(),
      });
      setResendSent(true);
      toast.success(res.data?.message || 'Verification link sent!');
    } catch (err) {
      setResendSent(true);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-app relative p-4 overflow-hidden font-sans">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-brand-300/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-border-main relative z-10 text-center">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-brand">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-heading font-black text-text-primary tracking-tight">
            Connect<span className="text-brand-500">X</span>
          </span>
        </div>

        {/* 1. Verifying State */}
        {status === 'verifying' && (
          <div className="py-8 space-y-4">
            <div className="w-14 h-14 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto" />
            <h3 className="text-xl font-bold text-text-primary">Verifying your email...</h3>
            <p className="text-xs sm:text-sm text-text-muted">
              Please wait while we confirm your email credentials.
            </p>
          </div>
        )}

        {/* 2. Success State */}
        {status === 'success' && (
          <div className="py-6 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-bold font-heading text-text-primary">
                Email Verified! 🎉
              </h3>
              <p className="text-xs sm:text-sm text-text-muted mt-2 leading-relaxed">
                {message}
              </p>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full mt-4 py-3 px-4 rounded-button bg-brand-gradient text-white font-semibold text-sm shadow-brand hover:shadow-brand-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              Start Chatting
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3. Error / Expired State */}
        {status === 'error' && (
          <div className="py-4 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-md">
              <XCircle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-heading text-text-primary">
                Verification Failed
              </h3>
              <p className="text-xs sm:text-sm text-text-muted mt-2 leading-relaxed">
                {message}
              </p>
            </div>

            {!resendSent ? (
              <form onSubmit={handleResend} className="mt-4 pt-4 border-t border-border-main space-y-3">
                <p className="text-xs font-semibold text-text-primary text-left">
                  Request a new verification link:
                </p>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isResending}
                  className="w-full py-2.5 px-4 rounded-button bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {isResending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    'Resend Verification Link'
                  )}
                </button>
              </form>
            ) : (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 text-center">
                ✅ If an account with this email exists, a new verification link has been sent.
              </div>
            )}

            <div className="pt-4">
              <Link
                to="/login"
                className="text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

