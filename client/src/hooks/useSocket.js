import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useSocketStore } from '../store/socketStore.js';

export function useSocket() {
  const { token, isAuthenticated } = useAuthStore();
  const { initSocket, disconnectSocket, isConnected, isReconnecting, socket } = useSocketStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      initSocket(token);
    } else {
      disconnectSocket();
    }

    return () => {
      // Don't eagerly disconnect on quick re-renders, only when logged out
    };
  }, [isAuthenticated, token, initSocket, disconnectSocket]);

  return { isConnected, isReconnecting, socket };
}

export default useSocket;

