import React, { useState } from 'react';
import { X, Clock, Check, ShieldAlert } from 'lucide-react';
import { setDisappearingMessagesApi } from '../../api/chat.api.js';
import { toast } from 'react-hot-toast';

const OPTIONS = [
  { label: 'Off', seconds: null, desc: 'Messages will not disappear' },
  { label: '24 hours', seconds: 86400, desc: 'Messages disappear after 1 day' },
  { label: '7 days', seconds: 604800, desc: 'Messages disappear after 1 week' },
  { label: '90 days', seconds: 7776000, desc: 'Messages disappear after ~3 months' },
];

export default function DisappearingModal({
  isOpen,
  onClose,
  conversationId,
  currentDurationSec,
  onUpdated,
}) {
  const [selectedSec, setSelectedSec] = useState(currentDurationSec ?? null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setSelectedSec(currentDurationSec ?? null);
  }, [currentDurationSec, isOpen]);

  if (!isOpen) return null;

  const handleApply = async () => {
    try {
      setSaving(true);
      const res = await setDisappearingMessagesApi(conversationId, selectedSec);
      if (res.success) {
        toast.success(
          selectedSec
            ? `Disappearing messages enabled (${OPTIONS.find((o) => o.seconds === selectedSec)?.label}) ⏳`
            : 'Disappearing messages turned off'
        );
        if (onUpdated) onUpdated(selectedSec);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update disappearing messages');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-900/60 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl border border-border-main flex flex-col space-y-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border-main">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Disappearing Messages</h3>
              <p className="text-xs text-text-muted mt-0.5">Applies to new messages only</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-alt text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-2 p-3 rounded-2xl bg-brand-50/70 border border-brand-200/80 text-[11px] text-text-secondary leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
          <span>
            For more privacy, new messages will disappear from this chat for everyone after the chosen period. Recipients can still save, copy, or forward them.
          </span>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {OPTIONS.map((opt) => {
            const isSelected = selectedSec === opt.seconds;
            return (
              <div
                key={opt.label}
                onClick={() => setSelectedSec(opt.seconds)}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-brand-50 border-brand-300 shadow-xs'
                    : 'bg-surface-alt hover:bg-surface border-border-main'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-text-primary">{opt.label}</p>
                  <span className="text-[11px] text-text-muted">{opt.desc}</span>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'border-2 border-border-main'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
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
            onClick={handleApply}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-button text-xs font-semibold bg-brand-gradient text-white shadow-brand hover:opacity-95 disabled:opacity-50 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}

