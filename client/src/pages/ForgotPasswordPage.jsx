import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Waves, Mail, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      setIsSubmitted(true);
      toast.success(res.data?.message || "Check your email for reset instructions.");
    } catch (err) {
      // Enumeration-safe: Even on error, show the confirmation screen
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-app relative p-4 overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-brand-300/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-border-main relative z-10">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-brand">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-black text-text-primary tracking-tight">
              Connect<span className="text-brand-500">X</span>
            </h2>
            <p className="text-xs text-text-muted">Account Recovery</p>
          </div>
        </div>

        {!isSubmitted ? (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-bold font-heading text-text-primary">
                Forgot your password?
              </h3>
              <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
                Enter your email address and we will send you a secure link to reset your password. The link is valid for 30 minutes.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all"
                  />
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
                    Send Reset Link
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md animate-fade-in">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text-primary">Check your inbox</h3>
              <p className="text-xs sm:text-sm text-text-muted mt-2 leading-relaxed">
                If an account exists for <span className="font-semibold text-text-primary">{email}</span>, you will receive an email with instructions to reset your password.
              </p>
            </div>
            <div className="p-3 bg-surface-alt rounded-2xl border border-border-main text-xs text-text-muted text-left">
              💡 <strong>Tip:</strong> Be sure to check your spam or junk folder if you don't see it within a few minutes.
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

