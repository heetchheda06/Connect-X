import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Check, Upload, Sparkles } from 'lucide-react';
import { setWallpaperApi } from '../../api/chat.api.js';
import { uploadFileApi } from '../../api/upload.api.js';
import { useChatStore } from '../../store/chatStore.js';
import { toast } from 'react-hot-toast';

const OCEAN_WALLPAPERS = [
  { id: 'default', name: 'ConnectX Default', style: 'bg-chat-pattern', preview: '#f0fdfa' },
  { id: 'aqua-breeze', name: 'Aqua Breeze', style: 'bg-gradient-to-b from-[#e0f7fa] to-[#b2ebf2]', preview: '#b2ebf2' },
  { id: 'seafoam', name: 'Seafoam Mist', style: 'bg-gradient-to-b from-[#e8f5e9] to-[#c8e6c9]', preview: '#c8e6c9' },
  { id: 'deep-lagoon', name: 'Tropical Lagoon', style: 'bg-gradient-to-b from-[#e0f2f1] to-[#80cbc4]', preview: '#80cbc4' },
  { id: 'sky-ocean', name: 'Ocean Mist', style: 'bg-gradient-to-b from-[#e1f5fe] to-[#b3e5fc]', preview: '#b3e5fc' },
  { id: 'coral-tint', name: 'Sunlit Shore', style: 'bg-gradient-to-b from-[#fff3e0] to-[#ffe0b2]', preview: '#ffe0b2' },
  { id: 'clean-slate', name: 'Pure White', style: 'bg-[#ffffff]', preview: '#ffffff' },
  { id: 'soft-graphite', name: 'Soft Light Gray', style: 'bg-[#f8fafc]', preview: '#f8fafc' },
];

export default function WallpaperModal({ isOpen, onClose, conversationId, currentWallpaper, onWallpaperChange }) {
  const [selected, setSelected] = useState(currentWallpaper || 'default');
  const [customUrl, setCustomUrl] = useState(currentWallpaper?.startsWith('http') ? currentWallpaper : '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(currentWallpaper || 'default');
    setCustomUrl(currentWallpaper?.startsWith('http') ? currentWallpaper : '');
  }, [currentWallpaper, isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (id) => {
    setSelected(id);
    setCustomUrl('');
  };

  const handleCustomUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      setUploading(true);
      const res = await uploadFileApi(file);
      if (res.success && res.data?.file?.url) {
        setCustomUrl(res.data.file.url);
        setSelected(res.data.file.url);
        toast.success('Custom wallpaper uploaded! 🖼️');
      }
    } catch (err) {
      toast.error('Failed to upload wallpaper image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const finalWallpaper = customUrl || selected;
    try {
      setSaving(true);
      const res = await setWallpaperApi(conversationId, finalWallpaper);
      if (res.success) {
        toast.success('Chat wallpaper updated! 🌊');
        useChatStore.getState().upsertConversation({
          _id: conversationId,
          wallpaper: finalWallpaper,
        });
        if (onWallpaperChange) onWallpaperChange(finalWallpaper);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update wallpaper');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-900/60 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-surface rounded-3xl p-6 shadow-2xl border border-border-main flex flex-col space-y-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border-main">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Chat Wallpaper</h3>
              <p className="text-xs text-text-muted mt-0.5">Customize your background for this chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-alt text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ocean Presets Grid */}
        <div className="grid grid-cols-4 gap-3 py-2">
          {OCEAN_WALLPAPERS.map((wp) => {
            const isSelected = selected === wp.id && !customUrl;
            return (
              <div
                key={wp.id}
                onClick={() => handleSelectPreset(wp.id)}
                className={`relative flex flex-col items-center gap-1.5 cursor-pointer group`}
              >
                <div
                  className={`w-full aspect-square rounded-2xl border-2 transition-all flex items-center justify-center shadow-xs overflow-hidden ${
                    isSelected
                      ? 'border-brand-500 scale-105 shadow-brand'
                      : 'border-border-main group-hover:border-brand-300'
                  }`}
                  style={{ backgroundColor: wp.preview }}
                >
                  {isSelected && (
                    <div className="p-1.5 rounded-full bg-brand-500 text-white shadow-sm">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-text-secondary text-center truncate max-w-full">
                  {wp.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Upload Custom Wallpaper */}
        <div className="pt-2 border-t border-border-main">
          <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-border-main hover:border-brand-400 bg-surface-alt/60 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-semibold text-text-primary">
              {uploading ? 'Uploading Image...' : customUrl ? 'Change Custom Image' : 'Upload Custom Image'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleCustomUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-main">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-button text-xs font-semibold text-text-secondary hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-semibold bg-brand-gradient text-white shadow-brand hover:opacity-95 disabled:opacity-50 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Wallpaper</span>
          </button>
        </div>
      </div>
    </div>
  );
}

