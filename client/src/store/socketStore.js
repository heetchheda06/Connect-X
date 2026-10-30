import { create } from 'zustand';
import { io } from 'socket.io-client';

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  isReconnecting: false,
  // typingUsers: { [conversationId]: { [userId]: { name, username } } }
  typingUsers: {},
  // onlineUsers: Set or array of online userIds
  onlineUsers: new Set(),

  initSocket: (token) => {
    // If already initialized and connected, return existing socket
    const existingSocket = get().socket;
    if (existingSocket && existingSocket.connected) {
      return existingSocket;
    }

    if (existingSocket) {
      existingSocket.disconnect();
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket.IO] Connected to real-time server:', socket.id);
      set({ isConnected: true, isReconnecting: false });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [Socket.IO] Disconnected:', reason);
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.warn('⚠️ [Socket.IO] Connection error:', error.message);
      set({ isConnected: false, isReconnecting: true });
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      set({ isReconnecting: true });
    });

    socket.io.on('reconnect', () => {
      set({ isConnected: true, isReconnecting: false });
    });

    // Handle incoming typing status
    socket.on('typing:update', ({ conversationId, userId, name, username, isTyping }) => {
      set((state) => {
        const currentConvTyping = { ...(state.typingUsers[conversationId] || {}) };
        if (isTyping) {
          currentConvTyping[userId] = { name, username };
        } else {
          delete currentConvTyping[userId];
        }

        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: currentConvTyping,
          },
        };
      });
    });

    // Handle global presence status
    socket.on('presence:update', ({ userId, isOnline }) => {
      set((state) => {
        const updatedOnline = new Set(state.onlineUsers);
        if (isOnline) {
          updatedOnline.add(userId);
        } else {
          updatedOnline.delete(userId);
        }
        return { onlineUsers: updatedOnline };
      });
    });

    set({ socket });
    return socket;
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, isReconnecting: false, typingUsers: {} });
    }
  },

  joinConversation: (conversationId) => {
    const { socket } = get();
    if (socket && conversationId) {
      socket.emit('conversation:join', conversationId);
    }
  },

  leaveConversation: (conversationId) => {
    const { socket } = get();
    if (socket && conversationId) {
      socket.emit('conversation:leave', conversationId);
    }
  },

  emitTypingStart: (conversationId) => {
    const { socket } = get();
    if (socket && conversationId) {
      socket.emit('typing:start', { conversationId });
    }
  },

  emitTypingStop: (conversationId) => {
    const { socket } = get();
    if (socket && conversationId) {
      socket.emit('typing:stop', { conversationId });
    }
  },

  emitMessageRead: (conversationId) => {
    const { socket } = get();
    if (socket && conversationId) {
      socket.emit('message:read', { conversationId });
    }
  },
}));

