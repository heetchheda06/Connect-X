import React from 'react';
import { Sparkles, ShieldCheck, Languages, MessageSquare, Mic, Bell, X, ArrowRight } from 'lucide-react';
import { useAiStore } from '../../store/aiStore.js';
import { toast } from 'react-hot-toast';

export default function AiOnboardingModal({ isOpen, onClose, onConfirm }) {
  const { updateSettings, isUpdating } = useAiStore();

  if (!isOpen) return null;

  const handleEnable = async () => {
    const res = await updateSettings({ enabled: true });
    if (res.success) {
      toast.success('ConnectX AI is now active! ✨');
      if (onConfirm) onConfirm();
      onClose();
    } else {
      toast.error(res.error || 'Failed to enable AI features');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-surface rounded-card border border-border-main shadow-brand-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[92dvh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ocean Header Banner */}
        <div className="p-6 bg-gradient-to-r from-brand-50 via-surface to-brand-100/50 border-b border-border-main relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface border border-border-main transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 border border-brand-500/20">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              ConnectX Intelligence
            </span>
          </div>

          <h2 className="text-xl font-heading font-bold text-text-primary">
            Supercharge your conversations with AI
          </h2>
          <p className="text-xs text-text-secondary mt-1 max-w-md">
            Smart, privacy-first AI tools designed to keep you in flow without losing the thread.
          </p>
        </div>

        {/* Feature Highlights Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Capability Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-surface-alt border border-border-main flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                <Languages className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">Live Translation</h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Chat across English, Hindi, Hinglish, and 12+ regional languages seamlessly.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-alt border border-border-main flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">Smart Replies & Tone</h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Contextual quick-reply chips and instant draft tone polishing.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-alt border border-border-main flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">Voice Note Transcripts</h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Instant text transcriptions and executive summaries for voice messages.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-alt border border-border-main flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">Smart Reminders</h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Natural language reminder extraction from messages ("kal subah 9 baje").
                </p>
              </div>
            </div>
          </div>

          {/* Privacy & Consent Card */}
          <div className="p-4 rounded-xl bg-brand-50/60 border border-brand-200 space-y-2">
            <div className="flex items-center gap-2 text-brand-800">
              <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
              <h4 className="text-xs font-bold">Privacy & Transparency Guarantee</h4>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              When an AI feature is actively triggered, only the relevant message snippet is sent securely to Google Gemini API for processing. Your conversations are never sold, never publicly broadcast, and never used to train global AI models.
            </p>
            <p className="text-[11px] text-text-secondary font-medium">
              You can turn AI off anytime with a single toggle in Settings.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-surface-alt border-t border-border-main flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-button text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border-main transition-colors"
          >
            Keep Off for Now
          </button>
          <button
            type="button"
            onClick={handleEnable}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-button bg-brand-gradient text-white text-xs font-bold shadow-brand hover:opacity-95 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isUpdating ? 'Activating...' : 'Enable ConnectX AI'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
