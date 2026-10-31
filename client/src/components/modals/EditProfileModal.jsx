import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  User, 
  Smile, 
  Check, 
  Loader2,
  Trash2,
  AtSign,
  Key,
  ShieldCheck,
  AlertCircle,
  Unlink,
  Lock,
  Sparkles,
  Globe,
  Clock,
  ExternalLink,
  Shield,
  MessageSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore.js';
import { useAiStore } from '../../store/aiStore.js';
import AiOnboardingModal from './AiOnboardingModal.jsx';
import { 
  updateProfileApi, 
  uploadAvatarApi, 
  checkUsernameAvailableApi, 
  updateUsernameApi 
} from '../../api/user.api.js';
import { 
  getAuthProvidersApi, 
  setPasswordApi, 
  unlinkGoogleApi 
} from '../../api/auth.api.js';
import useDebounce from '../../hooks/useDebounce.js';
import Avatar from '../ui/Avatar.jsx';

const STATUS_PRESETS = [
  '🌊 Riding the ocean wave',
  '💻 In deep focus mode',
  '☕ Coffee & conversation',
  '🚀 Shipping features',
  '🌴 Away from keyboard',
];

export default function EditProfileModal({ isOpen, onClose }) {
  const { user, updateUser, setSession } = useAuthStore();
  const fileInputRef = useRef(null);

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [status, setStatus] = useState(user?.status || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Username edit state
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(user?.username || '');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ available: true, message: '' });
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  const debouncedUsername = useDebounce(usernameInput, 400);

  // Auth providers state
  const [providersData, setProvidersData] = useState({
    hasPassword: true,
    hasGoogle: false,
    authProviders: [],
  });
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  // Password setting / changing state
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Unlink Google confirmation state
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false);

  // Tab & AI features state
  const [activeTab, setActiveTab] = useState('profile');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const {
    settings: aiSettings,
    languages,
    providers,
    isUpdating: isUpdatingAi,
    updateSettings: updateAiSettings,
    fetchLanguages,
    fetchProviders: fetchAiProviders,
    fetchSettings: fetchAiSettings,
  } = useAiStore();

  // Refresh user fields and AI settings on modal open
  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setStatus(user.status || '');
      setAvatarPreview(user.avatar || '');
      setUsernameInput(user.username || '');
      setIsEditingUsername(false);
      setIsSettingPassword(false);
      fetchProviders();
      fetchAiSettings();
      fetchLanguages();
      fetchAiProviders();
    }
  }, [isOpen, user]);

  const fetchProviders = async () => {
    try {
      setIsLoadingProviders(true);
      const res = await getAuthProvidersApi();
      if (res.success && res.data) {
        setProvidersData(res.data);
      }
    } catch (err) {
      // Non-critical background fetch failure
    } finally {
      setIsLoadingProviders(false);
    }
  };

  // Live debounced availability check when editing username
  useEffect(() => {
    const checkAvailability = async () => {
      const clean = (debouncedUsername || '').toLowerCase().trim();
      if (!clean) {
        setUsernameStatus({ available: false, message: 'Username is required' });
        return;
      }
      if (clean === user?.username) {
        setUsernameStatus({ available: true, message: 'Current username' });
        return;
      }
      if (clean.length < 3 || clean.length > 20 || !/^[a-z0-9_]+$/.test(clean)) {
        setUsernameStatus({
          available: false,
          message: 'Must be 3-20 characters: lowercase letters, numbers, underscores',
        });
        return;
      }

      setIsCheckingUsername(true);
      try {
        const res = await checkUsernameAvailableApi(clean);
        if (res.success && res.data) {
          setUsernameStatus({
            available: res.data.available,
            message: res.data.available ? 'Username available!' : (res.data.reason || 'Username taken'),
          });
        }
      } catch (err) {
        setUsernameStatus({ available: false, message: 'Check failed' });
      } finally {
        setIsCheckingUsername(false);
      }
    };

    if (isEditingUsername && debouncedUsername) {
      checkAvailability();
    }
  }, [debouncedUsername, isEditingUsername, user?.username]);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Avatar image must be under 10MB');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'];
    const isImage = (file.type && file.type.startsWith('image/')) || allowedExtensions.includes(ext);

    if (!isImage) {
      toast.error('Only image files (JPG, PNG, WEBP, GIF, AVIF) are supported');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', file);
      const uploadRes = await uploadAvatarApi(formData);
      if (uploadRes.success && uploadRes.data?.user) {
        updateUser(uploadRes.data.user);
        setAvatarPreview(uploadRes.data.avatarUrl);
        setSelectedFile(null);
        toast.success('Profile photo updated! ✨');
      } else {
        throw new Error(uploadRes.message || 'Upload failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to upload photo');
      setAvatarPreview(user?.avatar || '');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsUploadingAvatar(true);
      const res = await updateProfileApi({ avatar: '' });
      if (res.success && res.data?.user) {
        updateUser(res.data.user);
        setAvatarPreview('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.success('Avatar reset to default gradient.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveUsername = async () => {
    const clean = usernameInput.toLowerCase().trim();
    if (!clean) return;
    if (clean === user?.username) {
      setIsEditingUsername(false);
      return;
    }

    if (!usernameStatus.available) {
      toast.error(usernameStatus.message || 'Please choose an available username');
      return;
    }

    try {
      setIsSavingUsername(true);
      const res = await updateUsernameApi(clean);
      if (res.success && res.data?.user) {
        updateUser(res.data.user);
        toast.success(`Username updated to @${clean}! ✨`);
        setIsEditingUsername(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update username');
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsSubmittingPassword(true);
      const res = await setPasswordApi(newPassword);
      if (res.success) {
        toast.success('Password set successfully! You can now log in with email/password.');
        setNewPassword('');
        setConfirmPassword('');
        setIsSettingPassword(false);
        fetchProviders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set password');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!providersData.hasPassword) {
      toast.error('Set a password first so you do not get locked out.');
      return;
    }

    if (!window.confirm('Are you sure you want to disconnect your Google account from ConnectX?')) {
      return;
    }

    try {
      setIsUnlinkingGoogle(true);
      const res = await unlinkGoogleApi();
      if (res.success && res.data) {
        const { user: updatedUser, token } = res.data;
        setSession(updatedUser, token);
        toast.success('Google account disconnected successfully.');
        fetchProviders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disconnect Google account');
    } finally {
      setIsUnlinkingGoogle(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await updateProfileApi({
        name: name.trim(),
        bio: bio.trim(),
        status: status.trim(),
        avatar: avatarPreview,
      });

      if (res.success && res.data?.user) {
        updateUser(res.data.user);
        toast.success('Profile updated successfully! ✨');
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface rounded-card border border-border-main shadow-brand-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border-main flex items-center justify-between bg-surface-alt/50">
          <div>
            <h3 className="font-heading font-bold text-lg text-text-primary">
              Account & Profile Settings
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Manage your personal info, handle, and sign-in methods
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface border border-border-main transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border-main px-6 bg-surface-alt/40">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Profile & Account
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            AI Features
            {aiSettings?.enabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />
            )}
          </button>
        </div>

        {/* Profile & Account Tab */}
        {activeTab === 'profile' && (
          <div className="p-6 space-y-6 overflow-y-auto">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-surface-alt border border-border-main">
            <div className="relative group">
              <Avatar
                src={avatarPreview}
                name={name || user?.name}
                id={user?._id}
                size="2xl"
              />
              <button
                type="button"
                disabled={isUploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-deep-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white disabled:opacity-60 disabled:cursor-not-allowed"
                title="Change Photo"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <Camera className="w-6 h-6" />
                )}
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <span className="text-xs font-semibold text-text-primary block mb-1">
                Profile Avatar
              </span>
              <p className="text-[11px] text-text-muted mb-3">
                Upload a picture under 10MB, or leave blank for a personalized ocean gradient.
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-surface border border-border-main text-xs font-semibold text-text-primary hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-brand-500" />
                  )}
                  {isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    disabled={isUploadingAvatar}
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-surface border border-status-danger/30 text-xs font-semibold text-status-danger hover:bg-status-danger/5 transition-all shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Editable ConnectX Username */}
          <div className="p-4 rounded-xl bg-surface border border-border-main space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-brand-500" />
                ConnectX Handle
              </label>
              {!isEditingUsername ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingUsername(true);
                    setUsernameInput(user?.username || '');
                  }}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Edit Handle
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingUsername(false)}
                  className="text-xs font-semibold text-text-muted hover:text-text-primary"
                >
                  Cancel
                </button>
              )}
            </div>

            {!isEditingUsername ? (
              <div className="flex items-center justify-between py-1 text-sm font-mono text-text-primary">
                <span>@{user?.username}</span>
                <span className="text-[11px] text-text-muted font-sans font-medium">Permanent handle</span>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    <AtSign className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    maxLength={20}
                    className={`w-full pl-9 pr-9 py-2 text-sm bg-surface-alt border rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400 ${
                      usernameStatus.available ? 'border-border-main' : 'border-status-danger'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {isCheckingUsername ? (
                      <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                    ) : usernameStatus.available ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-status-danger" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-[11px] font-medium ${usernameStatus.available ? 'text-emerald-600' : 'text-status-danger'}`}>
                    {usernameStatus.message || 'Lowercase letters, numbers, underscores (3-20)'}
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveUsername}
                    disabled={isSavingUsername || !usernameStatus.available || usernameInput === user?.username}
                    className="px-3 py-1 rounded-button bg-brand-gradient text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {isSavingUsername ? 'Saving...' : 'Save Handle'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Form (Name, Status, Bio) */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  required
                  placeholder="Your full name"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all"
                />
              </div>
            </div>

            {/* Status Message */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Current Status
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                  <Smile className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  maxLength={100}
                  placeholder="What's happening?"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all"
                />
              </div>

              {/* Status presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {STATUS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setStatus(preset)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                      status === preset
                        ? 'bg-brand-50 text-brand-700 border-brand-300 font-semibold shadow-subtle'
                        : 'bg-surface border-border-main text-text-secondary hover:bg-surface-alt'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-text-primary">
                  About Bio
                </label>
                <span className="text-[11px] text-text-muted font-mono">
                  {bio.length}/250
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={250}
                rows={2}
                placeholder="Tell other ConnectX members a bit about yourself..."
                className="w-full p-2.5 text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all resize-none"
              />
            </div>

            {/* Save Profile Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-button bg-brand-gradient text-white text-xs sm:text-sm font-semibold shadow-brand hover:shadow-brand-lg transition-all duration-200 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Profile Changes
                  </>
                )}
              </button>
            </div>
          </form>

          {/* SIGN-IN METHODS & SECURITY SECTION */}
          <div className="pt-4 border-t border-border-main space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-500" />
                  Sign-In Methods
                </h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Manage login credentials and linked authentication accounts
                </p>
              </div>
            </div>

            {/* Google OAuth Row */}
            <div className="p-3.5 rounded-xl bg-surface-alt border border-border-main flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-[#D5EBF0] flex items-center justify-center shadow-subtle shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary">Google Account</span>
                    {providersData.hasGoogle ? (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-semibold">
                        Connected
                      </span>
                    ) : (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                        Not linked
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">{user?.email}</p>
                </div>
              </div>

              {providersData.hasGoogle && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleUnlinkGoogle}
                    disabled={isUnlinkingGoogle || !providersData.hasPassword}
                    title={
                      !providersData.hasPassword
                        ? 'Set a password first so you do not get locked out'
                        : 'Disconnect Google account'
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-button border text-status-danger border-status-danger/30 hover:bg-status-danger/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    {isUnlinkingGoogle ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                  {!providersData.hasPassword && (
                    <span className="block text-[10px] text-status-warning mt-1">
                      Set a password first to unlink
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Email / Password Row */}
            <div className="p-3.5 rounded-xl bg-surface-alt border border-border-main space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#D5EBF0] flex items-center justify-center shadow-subtle shrink-0">
                    <Key className="w-4 h-4 text-brand-600" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">Password Login</span>
                    <span className="text-[11px] text-text-muted">
                      {providersData.hasPassword
                        ? 'Password is set for this account'
                        : 'No password set (Google sign-in only)'}
                    </span>
                  </div>
                </div>

                {!isSettingPassword && (
                  <button
                    type="button"
                    onClick={() => setIsSettingPassword(true)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 px-2.5 py-1 rounded-button border border-brand-200 bg-surface shadow-subtle hover:bg-brand-50"
                  >
                    {providersData.hasPassword ? 'Change Password' : 'Add Password'}
                  </button>
                )}
              </div>

              {/* Notice for Google-only users */}
              {!providersData.hasPassword && !isSettingPassword && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Adding a password lets you sign in using your email address and password if you ever lose access to Google.
                  </span>
                </div>
              )}

              {/* Inline Form to Set Password */}
              {isSettingPassword && (
                <form onSubmit={handleSetPassword} className="pt-2 border-t border-border-main space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-primary mb-1">
                      New Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      minLength={6}
                      className="w-full px-3 py-1.5 text-xs bg-surface border border-border-main rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-primary mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      minLength={6}
                      className="w-full px-3 py-1.5 text-xs bg-surface border border-border-main rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingPassword(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="text-xs px-3 py-1 rounded-button text-text-muted hover:text-text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingPassword}
                      className="px-3.5 py-1 rounded-button bg-brand-gradient text-white text-xs font-semibold shadow-brand disabled:opacity-60"
                    >
                      {isSubmittingPassword ? 'Saving...' : 'Set Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
        )}

        {/* AI Features Tab */}
        {activeTab === 'ai' && (
          <div className="p-6 space-y-5 overflow-y-auto">
            {/* Master AI Toggle Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-surface-alt via-surface to-brand-50/40 border border-border-main space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 shrink-0">
                    <Sparkles className="w-5 h-5 text-brand-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">ConnectX AI Assistant</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          aiSettings?.enabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-surface text-text-muted border border-border-main'
                        }`}
                      >
                        {aiSettings?.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Master control for translation, smart replies, audio summaries, and reminders
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  disabled={isUpdatingAi}
                  onClick={async () => {
                    if (!aiSettings?.enabled) {
                      setIsOnboardingOpen(true);
                    } else {
                      const res = await updateAiSettings({ enabled: false });
                      if (res.success) {
                        toast.success('AI features turned off.');
                      }
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    aiSettings?.enabled ? 'bg-brand-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      aiSettings?.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 border-t border-border-main/60 flex items-center justify-between text-[11px] text-text-muted">
                <span>When enabled, relevant message snippets are processed by Google Gemini.</span>
                {!aiSettings?.enabled && (
                  <button
                    type="button"
                    onClick={() => setIsOnboardingOpen(true)}
                    className="text-brand-600 font-semibold hover:underline"
                  >
                    Learn more
                  </button>
                )}
              </div>
            </div>

            {aiSettings?.enabled ? (
              <div className="space-y-4">
                {/* Preferred Language */}
                <div className="p-4 rounded-xl bg-surface-alt border border-border-main space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-brand-500" />
                      Preferred Language for Translation
                    </label>
                    <span className="text-[10px] text-text-muted">Auto-translation target</span>
                  </div>
                  <select
                    value={aiSettings?.preferredLanguage || 'en'}
                    disabled={isUpdatingAi}
                    onChange={async (e) => {
                      const newLang = e.target.value;
                      const res = await updateAiSettings({ preferredLanguage: newLang });
                      if (res.success) {
                        toast.success(`Preferred language updated! 🌐`);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-surface border border-border-main rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    {(languages?.length > 0 ? languages : [
                      { code: 'en', name: 'English', nativeName: 'English' },
                      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
                      { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
                      { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
                      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
                      { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
                      { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
                      { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
                      { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
                      { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
                      { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
                      { code: 'es', name: 'Spanish', nativeName: 'Español' },
                      { code: 'fr', name: 'French', nativeName: 'Français' },
                      { code: 'de', name: 'German', nativeName: 'Deutsch' },
                      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
                    ]).map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.nativeName} ({l.name})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-text-muted">
                    Incoming messages in other languages will be translated into this language.
                  </p>
                </div>

                {/* Timezone */}
                <div className="p-4 rounded-xl bg-surface-alt border border-border-main space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-500" />
                      Reminder Timezone
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        const local = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
                        const res = await updateAiSettings({ timezone: local });
                        if (res.success) toast.success(`Timezone set to ${local}`);
                      }}
                      className="text-[10px] text-brand-600 font-semibold hover:underline"
                    >
                      Use System Timezone
                    </button>
                  </div>
                  <input
                    type="text"
                    value={aiSettings?.timezone || 'Asia/Kolkata'}
                    disabled={isUpdatingAi}
                    onChange={(e) => {
                      updateAiSettings({ timezone: e.target.value });
                    }}
                    placeholder="e.g. Asia/Kolkata, America/New_York"
                    className="w-full px-3 py-2 text-xs bg-surface border border-border-main rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore'].map((tz) => (
                      <button
                        key={tz}
                        type="button"
                        onClick={() => updateAiSettings({ timezone: tz })}
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          aiSettings?.timezone === tz
                            ? 'bg-brand-50 border-brand-300 text-brand-700 font-semibold'
                            : 'bg-surface border-border-main text-text-muted hover:border-brand-200'
                        }`}
                      >
                        {tz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smart Replies Toggle */}
                <div className="p-4 rounded-xl bg-surface-alt border border-border-main flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface border border-border-main flex items-center justify-center text-brand-500 shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-text-primary block">Smart Reply Suggestions</span>
                      <p className="text-[11px] text-text-muted">
                        Shows 3 short suggested replies above composer in direct chats
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isUpdatingAi}
                    onClick={async () => {
                      const res = await updateAiSettings({ smartReplies: !aiSettings?.smartReplies });
                      if (res.success) toast.success('Smart replies preference saved.');
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      aiSettings?.smartReplies ? 'bg-brand-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        aiSettings?.smartReplies ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Where your data goes Card */}
                <div className="p-4 rounded-xl bg-brand-50/50 border border-brand-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-brand-600" />
                      Where your data goes
                    </h5>
                    {providers?.policies?.gemini && (
                      <a
                        href={providers.policies.gemini}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-brand-600 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        Google AI Policy <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    AI features run server-side using Google Gemini API. Only necessary snippets (e.g. the message being translated or the voice note being transcribed) are submitted. ConnectX does not share your private chats with third parties.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-surface-alt border border-dashed border-border-main text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 mx-auto">
                  <Sparkles className="w-6 h-6 text-brand-500" />
                </div>
                <h4 className="text-sm font-bold text-text-primary">ConnectX AI is currently disabled</h4>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  Turn on AI to enable live translation in 16 languages, smart reply suggestions, audio summaries, and smart reminders.
                </p>
                <button
                  type="button"
                  onClick={() => setIsOnboardingOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-brand-gradient text-white text-xs font-bold shadow-brand hover:opacity-95 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Explore & Enable AI
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Onboarding Sheet Modal */}
        <AiOnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
        />
      </div>
    </div>
  );
}
