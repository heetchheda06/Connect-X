import React, { useState } from 'react';
import { Mail, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore.js';
import api from '../../api/axios.js';

export default function UnverifiedEmailBanner() {
  const { user } = useAuthStore();
  const [isResending, setIsResending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // If user is verified or not logged in, don't show banner
  if (!user || user.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    if (isResending || isSent) return;

    setIsResending(true);
    try {
      await api.post('/auth/resend-verification', { email: user.email });
      setIsSent(true);
      toast.success('Verification link sent! Please check your inbox.');
    } catch (err) {
      toast.error('Unable to resend verification link. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-900 select-none z-30">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong>Email not verified:</strong> Please verify your email ({user.email}) to unlock all features.
        </span>
      </div>

      <button
        onClick={handleResend}
        disabled={isResending || isSent}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 font-semibold active:scale-95 transition-all disabled:opacity-50"
      >
        {isResending ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Mail className="w-3.5 h-3.5" />
        )}
        <span>{isSent ? 'Sent!' : 'Resend Link'}</span>
      </button>
    </div>
  );
}

