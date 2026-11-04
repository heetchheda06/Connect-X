import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ClearChatModal({ isOpen, onClose, onConfirm }) {
  const [keepStarred, setKeepStarred] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClear = async () => {
    try {
      setLoading(true);
      await onConfirm(keepStarred);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-900/60 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl border border-border-main flex flex-col space-y-4 animate-scale-in">
        <div className="flex items-center gap-3 text-status-danger">
          <div className="p-2.5 rounded-2xl bg-status-danger/10">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">Clear this chat?</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              This only clears messages for your view.
            </p>
          </div>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          Messages in this chat will be cleared from your account. Other members of this conversation will still see their messages.
        </p>

        <div className="flex items-center gap-2 p-3 rounded-2xl bg-surface-alt border border-border-main">
          <input
            type="checkbox"
            id="keepStarred"
            checked={keepStarred}
            onChange={(e) => setKeepStarred(e.target.checked)}
            className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400 cursor-pointer"
          />
          <label htmlFor="keepStarred" className="text-xs font-semibold text-text-primary cursor-pointer select-none">
            Keep starred messages
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-main">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-button text-xs font-semibold text-text-secondary hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="px-4 py-2 rounded-button bg-status-danger text-white text-xs font-bold shadow-md hover:bg-red-600 active:scale-95 transition-all"
          >
            {loading ? 'Clearing...' : 'Clear chat'}
          </button>
        </div>
      </div>
    </div>
  );
}
