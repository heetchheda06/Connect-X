import React, { useState, useRef } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  User, 
  FileText, 
  Smile, 
  Check, 
  Loader2,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore.js';
import { updateProfileApi, uploadAvatarApi } from '../../api/user.api.js';
import Avatar from '../ui/Avatar.jsx';

const STATUS_PRESETS = [
  '🌊 Riding the ocean wave',
  '💻 In deep focus mode',
  '☕ Coffee & conversation',
  '🚀 Shipping features',
  '🌴 Away from keyboard',
];

export default function EditProfileModal({ isOpen, onClose }) {
  const { user, updateUser } = useAuthStore();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [status, setStatus] = useState(user?.status || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Avatar image must be under 10MB');
      return;
    }

    // Validate mime type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPEG, PNG, WEBP, and GIF images are supported');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleRemoveAvatar = () => {
    setSelectedFile(null);
    setAvatarPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      let updatedAvatarUrl = avatarPreview;

      // 1. If a new file was chosen, upload it first
      if (selectedFile) {
        const formData = new FormData();
        formData.append('avatar', selectedFile);
        const uploadRes = await uploadAvatarApi(formData);
        if (uploadRes.success && uploadRes.data?.avatarUrl) {
          updatedAvatarUrl = uploadRes.data.avatarUrl;
        }
      }

      // 2. Update text fields (and avatar if removed or unchanged)
      const res = await updateProfileApi({
        name: name.trim(),
        bio: bio.trim(),
        status: status.trim(),
        avatar: selectedFile ? updatedAvatarUrl : (avatarPreview ? user?.avatar : ''),
      });

      if (res.success && res.data?.user) {
        updateUser(res.data.user);
        toast.success('Profile updated successfully! ✨');
        onClose();
      }
    } catch (err) {
      console.error('Update profile error:', err);
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
              Edit Your Profile
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Customize how other ConnectX members see you
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface border border-border-main transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Avatar Upload / Gradient Preview */}
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
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-deep-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                title="Change Photo"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <span className="text-xs font-semibold text-text-primary block mb-1">
                Profile Avatar
              </span>
              <p className="text-[11px] text-text-muted mb-3">
                Upload a JPEG, PNG, or WEBP under 10MB, or leave blank for a personalized ocean gradient.
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
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-surface border border-border-main text-xs font-semibold text-text-primary hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all shadow-subtle"
                >
                  <Upload className="w-3.5 h-3.5 text-brand-500" />
                  Upload Photo
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-surface border border-status-danger/30 text-xs font-semibold text-status-danger hover:bg-status-danger/5 transition-all shadow-subtle"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

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

          {/* ConnectX Username (Read-Only) */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              ConnectX Username
            </label>
            <input
              type="text"
              disabled
              value={`@${user?.username}`}
              className="w-full px-3.5 py-2 text-sm bg-surface-alt/60 border border-border-main rounded-button text-text-muted cursor-not-allowed font-mono text-xs"
            />
            <span className="text-[11px] text-text-muted mt-1 block">
              Usernames are unique and cannot be modified after registration.
            </span>
          </div>

          {/* Status Message & Presets */}
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

            {/* Quick status chips */}
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

          {/* Bio Textarea */}
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
              rows={3}
              placeholder="Tell other ConnectX members a bit about yourself, hobbies, or your project role..."
              className="w-full p-3 text-sm bg-surface-alt border border-border-main rounded-button text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-surface transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-main">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-button bg-surface border border-border-main text-text-secondary hover:text-text-primary hover:bg-surface-alt text-xs sm:text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-button bg-brand-gradient text-white text-xs sm:text-sm font-semibold shadow-brand hover:shadow-brand-lg transition-all duration-200 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

