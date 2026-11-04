import React, { useState } from 'react';
import { X, Check, Edit2 } from 'lucide-react';
import { editMessageApi } from '../../api/chat.api.js';
import { toast } from 'react-hot-toast';

export default function EditMessageModal({ isOpen, onClose, message, onSave }) {
  const [content, setContent] = useState(message?.content || '');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (message) {
      setContent(message.content || '');
    }
  }, [message]);

  if (!isOpen || !message) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setSaving(true);
      const res = await editMessageApi(message._id, content.trim());
      if (res.success && res.data?.message) {
        toast.success('Message updated ✨');
        if (onSave) onSave(res.data.message);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to edit message');
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
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Edit Message</h3>
              <p className="text-xs text-text-muted mt-0.5">Editable within 15 minutes of sending</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-alt text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <form onSubmit={handleSave} className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full p-3 text-sm bg-surface-alt rounded-2xl border border-border-main text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500 resize-none"
            placeholder="Edit your message..."
            autoFocus
          />

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
              type="submit"
              disabled={!content.trim() || saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-semibold bg-brand-gradient text-white shadow-brand hover:opacity-95 disabled:opacity-50 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

