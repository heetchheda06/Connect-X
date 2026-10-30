import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  User as UserIcon, 
  AtSign, 
  Camera, 
  Upload, 
  Check, 
  X, 
  AlertCircle, 
  Loader2,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore.js';
import { updateProfileApi, uploadAvatarApi, checkUsernameAvailableApi, updateUsernameApi } from '../../api/user.api.js';
import useDebounce from '../../hooks/useDebounce.js';
import Avatar from '../ui/Avatar.jsx';

export default function CompleteProfileModal({ isOpen, onClose }) {
  const { user, updateUser, setJustSignedUpWithGoogle } = useAuthStore();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [selectedFile, setSelectedFile] = useState(null);

  // Username validation state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ available: true, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedUsername = useDebounce(username, 400);

  // Sync state when user loads
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setAvatarPreview(user.avatar || '');
    }
  }, [user]);

  // Debounced live username availability check
  useEffect(() => {
    const checkAvailability = async () => {
      const clean = (debouncedUsername || '').toLowerCase().trim();
      if (!clean) {
        setUsernameStatus({ available: false, message: 'Username is required' });
        return;
      }
      if (clean === user?.username) {
        setUsernameStatus({ available: true, message: 'Your current username' });
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
            message: res.data.available ? 'Username available!' : (res.data.reason || 'Username is already taken'),
          });
        }
      } catch (err) {
        setUsernameStatus({ available: false, message: 'Unable to check availability' });
      } finally {
        setIsCheckingUsername(false);
      }
    };

    if (debouncedUsername) {
      checkAvailability();
    }
  }, [debouncedUsername, user?.username]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Avatar image must be under 10MB');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPEG, PNG, WEBP, and GIF images are supported');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleDismiss = () => {
    setJustSignedUpWithGoogle(false);
    onClose();
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }

    const cleanUsername = username.toLowerCase().trim();
    if (!cleanUsername) {
      toast.error('Please choose a username');
      return;
    }

    if (!usernameStatus.available && cleanUsername !== user?.username) {
      toast.error(usernameStatus.message || 'Please choose an available username');
      return;
    }

    try {
      setIsSubmitting(true);
      let updatedUser = { ...user };

      // 1. If username was customized, update it
      if (cleanUsername !== user?.username) {
        const userRes = await updateUsernameApi(cleanUsername);
        if (userRes.success && userRes.data?.user) {
          updatedUser = userRes.data.user;
        }
      }

      // 2. If a new avatar file was chosen, upload it
      let finalAvatarUrl = avatarPreview;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('avatar', selectedFile);
        const uploadRes = await uploadAvatarApi(formData);
        if (uploadRes.success && uploadRes.data?.avatarUrl) {
          finalAvatarUrl = uploadRes.data.avatarUrl;
        }
      }

      // 3. Update profile fields (name, bio, avatar)
      const profileRes = await updateProfileApi({
        name: name.trim(),
        bio: bio.trim(),
        avatar: finalAvatarUrl,
      });

      if (profileRes.success && profileRes.data?.user) {
        updatedUser = profileRes.data.user;
      }

      updateUser(updatedUser);
      toast.success('Profile completed! Welcome to ConnectX. 🌊');
      handleDismiss();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to complete profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-surface rounded-card border border-border-main shadow-card overflow-hidden">
        {/* Ocean header accent banner */}
        <div className="bg-brand-gradient p-6 text-white text-center relative">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-subtle">
            <Sparkles className="w-6 h-6 text-brand-100" />
          </div>
          <h2 className="text-xl font-heading font-bold">Welcome to ConnectX!</h2>
          <p className="text-xs text-brand-100/90 mt-1">
            We generated your account from Google. You can personalize your handle and profile now or skip for later.
          </p>
        </div>

        {/* Modal form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Avatar Preview & Upload */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar
                src={avatarPreview}
                name={name || user?.name}
                size="xl"
                className="ring-4 ring-brand-100"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                title="Change photo"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-text-primary">Profile Photo</h4>
              <p className="text-xs text-text-muted mt-0.5">Imported from your Google account</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-brand-600 font-semibold hover:text-brand-700"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload new picture
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Display Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                required
                className="w-full pl-9 pr-3 py-2 text-sm bg-surface-alt border border-border-main rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface"
              />
            </div>
          </div>

          {/* Username with Live Debounced Availability */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Choose your @username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <AtSign className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                maxLength={20}
                required
                className={`w-full pl-9 pr-9 py-2 text-sm bg-surface-alt border rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface ${
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
            <p className={`text-[11px] mt-1 font-medium ${usernameStatus.available ? 'text-emerald-600' : 'text-status-danger'}`}>
              {usernameStatus.message || 'Lowercase letters, numbers, and underscores (3-20 chars)'}
            </p>
          </div>

          {/* Short Bio */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Bio <span className="text-text-muted font-normal">(Optional)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="What are you working on?"
              className="w-full p-2.5 text-sm bg-surface-alt border border-border-main rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border-main">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs font-semibold text-text-muted hover:text-text-primary px-3 py-2 rounded-button"
            >
              I'll do this later
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !usernameStatus.available}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-button bg-brand-gradient text-white text-xs sm:text-sm font-semibold shadow-brand hover:shadow-brand-lg transition-all duration-200 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Looks good, let's go!
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
