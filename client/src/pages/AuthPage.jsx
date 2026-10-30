import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Waves, 
  MessageSquare, 
  Compass, 
  Paperclip, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  User as UserIcon, 
  AtSign, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore.js';

export default function AuthPage({ initialMode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const { login, register, isLoading } = useAuthStore();

  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const errors = {};
    if (!loginForm.identifier.trim()) {
      errors.identifier = 'Please enter your username or email';
    }
    if (!loginForm.password) {
      errors.password = 'Please enter your password';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const result = await login(loginForm);
    if (result.success) {
      toast.success(`Welcome back, ${result.user.name}! 🌊`, {
        style: {
          borderRadius: '12px',
          background: '#0B2A3C',
          color: '#fff',
        },
      });
      navigate(from, { replace: true });
    } else {
      toast.error(result.error);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const errors = {};
    if (!registerForm.name.trim()) {
      errors.name = 'Full name is required';
    }
    if (!registerForm.username.trim()) {
      errors.username = 'Username is required';
    } else if (registerForm.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_.]+$/.test(registerForm.username)) {
      errors.username = 'Only letters, numbers, underscores and dots allowed';
    }

    if (!registerForm.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(registerForm.email)) {
      errors.email = 'Please provide a valid email';
    }

    if (!registerForm.password) {
      errors.password = 'Password is required';
    } else if (registerForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const result = await register({
      name: registerForm.name.trim(),
      username: registerForm.username.trim().toLowerCase(),
      email: registerForm.email.trim().toLowerCase(),
      password: registerForm.password,
      confirmPassword: registerForm.confirmPassword,
    });

    if (result.success) {
      toast.success(`Welcome to ConnectX, ${result.user.name}! 🚀`, {
        style: {
          borderRadius: '12px',
          background: '#0B2A3C',
          color: '#fff',
        },
      });
      navigate(from, { replace: true });
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col lg:flex-row bg-app relative overflow-hidden font-sans">
      {/* Subtle blurred ambient ocean-gradient blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-brand-300/30 blur-3xl pointer-events-none" />

      {/* LEFT PANEL: Deep Ocean Hero Branding (Collapsible on mobile) */}
      <div className="w-full lg:w-5/12 bg-deep-ocean text-white p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative overflow-hidden flex-shrink-0">
        {/* Ambient background glows inside left panel */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-brand-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-0 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />

        {/* Top Header / Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-brand-200 shadow-brand">
              <Waves className="w-7 h-7 text-brand-300" />
            </div>
            <div>
              <span className="text-2xl font-heading font-black tracking-tight text-white flex items-center gap-1.5">
                Connect<span className="text-brand-300">X</span>
              </span>
              <span className="block text-xs text-brand-100/70 font-medium tracking-wide uppercase">
                Real-Time Chat Platform
              </span>
            </div>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-brand-100">
            <span className="w-2 h-2 rounded-full bg-status-online animate-pulse" />
            v1.0 Live
          </div>
        </div>

        {/* Center Hero Copy & Floating Mock-Chat (Desktop view) */}
        <div className="my-8 lg:my-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-300/30 text-brand-200 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-brand-300" />
            Fresh, Calm, Social by Design
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold leading-[1.15] tracking-tight text-white mb-4">
            Conversations that feel alive.
          </h1>

          <p className="text-brand-100/80 text-sm sm:text-base leading-relaxed max-w-lg mb-8">
            Experience real-time messaging crafted with a serene ocean aesthetic. No clutter, no distractions—just pure, vibrant communication.
          </p>

          {/* Floating Mock-Chat Illustration (Visible on tablet & desktop) */}
          <div className="hidden sm:flex flex-col gap-3.5 max-w-md my-4 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-2xl">
            {/* Incoming message */}
            <div className="flex items-start gap-2.5 animate-float">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-300 to-brand-100 text-deep-900 font-bold text-xs flex items-center justify-center shadow-sm">
                AL
              </div>
              <div className="bg-white text-text-primary px-4 py-2.5 rounded-bubble rounded-tl-bubble-tail shadow-card max-w-[85%] text-xs sm:text-sm">
                <p className="font-medium">Have you seen the new ConnectX rooms? It feels so fast and clean! 🌊</p>
                <span className="text-[10px] text-text-muted mt-1 block text-right">10:24 AM</span>
              </div>
            </div>

            {/* Outgoing message */}
            <div className="flex items-end justify-end gap-2.5 animate-float-delayed">
              <div className="bg-brand-gradient text-white px-4 py-2.5 rounded-bubble rounded-tr-bubble-tail shadow-brand max-w-[85%] text-xs sm:text-sm">
                <p className="font-medium">Yes! Live typing, instant presence, and ocean gradients. Total game changer. ✨</p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-white/80">
                  <span>10:25 AM</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-100 tick-read-glow" />
                </div>
              </div>
            </div>
          </div>

          {/* 3 Value Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Zap className="w-5 h-5 text-brand-300 mb-1.5" />
              <h4 className="text-xs font-semibold text-white">Instant Sync</h4>
              <p className="text-[11px] text-brand-100/70">Socket.IO real-time delivery & typing status</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Compass className="w-5 h-5 text-brand-300 mb-1.5" />
              <h4 className="text-xs font-semibold text-white">Public Rooms</h4>
              <p className="text-[11px] text-brand-100/70">Browse and join community discussion spaces</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Paperclip className="w-5 h-5 text-brand-300 mb-1.5" />
              <h4 className="text-xs font-semibold text-white">Rich Media</h4>
              <p className="text-[11px] text-brand-100/70">Seamless images, file sharing, and lightboxes</p>
            </div>
          </div>
        </div>

        {/* Bottom wave decoration */}
        <div className="relative z-10 pt-6 flex items-center justify-between text-xs text-brand-100/60 border-t border-white/10">
          <span>&copy; {new Date().getFullYear()} ConnectX Platform</span>
          <span>Crafted with Ocean Vibes</span>
        </div>
      </div>

      {/* RIGHT PANEL: Auth Card Form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-4 sm:p-8 lg:p-16 z-10">
        <div className="w-full max-w-md bg-surface rounded-card p-6 sm:p-10 border border-border-main shadow-card relative">
          {/* Form Tabs: Sign In / Create Account */}
          <div className="flex p-1 mb-8 rounded-button bg-surface-alt border border-border-main">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setFieldErrors({});
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-[10px] transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-surface text-text-primary shadow-subtle'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setFieldErrors({});
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-[10px] transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-surface text-text-primary shadow-subtle'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-heading font-bold text-text-primary">
              {mode === 'login' ? 'Welcome Back!' : 'Join ConnectX Today'}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              {mode === 'login'
                ? 'Enter your credentials to access your real-time chats.'
                : 'Sign up in seconds to start connecting with your teams and friends.'}
            </p>
          </div>

          {/* LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginForm.identifier}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, identifier: e.target.value })
                    }
                    placeholder="you@domain.com or username"
                    className={`w-full pl-10 pr-4 py-2.5 text-sm bg-surface-alt border rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all ${
                      fieldErrors.identifier ? 'border-status-danger' : 'border-border-main'
                    }`}
                  />
                </div>
                {fieldErrors.identifier && (
                  <p className="text-xs text-status-danger mt-1 font-medium">
                    {fieldErrors.identifier}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-text-primary">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-10 py-2.5 text-sm bg-surface-alt border rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all ${
                      fieldErrors.password ? 'border-status-danger' : 'border-border-main'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-status-danger mt-1 font-medium">
                    {fieldErrors.password}
                  </p>
                )}
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
                    Sign In to ConnectX
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={registerForm.name}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, name: e.target.value })
                    }
                    placeholder="e.g. Alex Morgan"
                    className={`w-full pl-10 pr-4 py-2 text-sm bg-surface-alt border rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all ${
                      fieldErrors.name ? 'border-status-danger' : 'border-border-main'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-xs text-status-danger mt-1 font-medium">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <AtSign className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={registerForm.username}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        username: e.target.value.toLowerCase().replace(/\s+/g, ''),
                      })
                    }
                    placeholder="alexmorgan"
                    className={`w-full pl-10 pr-4 py-2 text-sm bg-surface-alt border rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all ${
                      fieldErrors.username ? 'border-status-danger' : 'border-border-main'
                    }`}
                  />
                </div>
                {fieldErrors.username && (
                  <p className="text-xs text-status-danger mt-1 font-medium">
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, email: e.target.value })
                    }
                    placeholder="alex@domain.com"
                    className={`w-full pl-10 pr-4 py-2 text-sm bg-surface-alt border rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all ${
                      fieldErrors.email ? 'border-status-danger' : 'border-border-main'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-status-danger mt-1 font-medium">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={registerForm.password}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, password: e.target.value })
                      }
                      placeholder="Min 6 chars"
                      className={`w-full pl-3 pr-9 py-2 text-sm bg-surface-alt border rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all ${
                        fieldErrors.password ? 'border-status-danger' : 'border-border-main'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-primary"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] text-status-danger mt-1 font-medium">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={registerForm.confirmPassword}
                      onChange={(e) =>
                        setRegisterForm({
                          ...registerForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="Repeat password"
                      className={`w-full pl-3 pr-9 py-2 text-sm bg-surface-alt border rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all ${
                        fieldErrors.confirmPassword ? 'border-status-danger' : 'border-border-main'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-primary"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-[11px] text-status-danger mt-1 font-medium">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-3 px-4 rounded-button bg-brand-gradient text-white font-semibold text-sm shadow-brand hover:shadow-brand-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Create ConnectX Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Social / Security footnote */}
          <div className="mt-6 pt-5 border-t border-border-main text-center text-xs text-text-muted">
            Protected by JWT 7-day tokens and bcrypt salted hashes.
          </div>
        </div>
      </div>
    </div>
  );
}

