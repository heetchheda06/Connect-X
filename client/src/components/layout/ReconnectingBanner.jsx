import React from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { useSocketStore } from '../../store/socketStore.js';

export default function ReconnectingBanner() {
  const { isConnected, isReconnecting } = useSocketStore();

  if (isConnected || !isReconnecting) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-deep-900/90 backdrop-blur-md text-white text-xs font-semibold shadow-brand-lg border border-brand-400/30 animate-pulse">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-300" />
      <span>Reconnecting to ConnectX live server...</span>
    </div>
  );
}

