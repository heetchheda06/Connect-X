import { create } from 'zustand';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { useChatStore } from './chatStore.js';
import { useAuthStore } from './authStore.js';
import { useCallStore } from './callStore.js';

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

    // Remote session revocation handler
    socket.on('session:revoked', ({ message }) => {
      console.warn('⚠️ [Session] Current session was revoked from another device.');
      toast.error(message || 'You have been signed out from this device.');
      localStorage.removeItem('connectx_token');
      localStorage.removeItem('connectx_user');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
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

    // ==================== REAL-TIME CHAT EVENTS ====================
    socket.on('message:new', ({ conversationId, message }) => {
      const authUser = useAuthStore.getState().user;
      useChatStore.getState().handleIncomingMessage(conversationId, message, authUser?._id);
    });

    socket.on('message:read', ({ conversationId, userId, readAt }) => {
      useChatStore.getState().handleMessageRead(conversationId, userId, readAt);
    });

    socket.on('message:deleted', ({ conversationId, messageId }) => {
      useChatStore.getState().handleMessageDeleted(conversationId, messageId);
    });

    socket.on('message:edited', ({ conversationId, message }) => {
      useChatStore.getState().handleMessageEdited(conversationId, message);
    });

    socket.on('message:reaction', ({ conversationId, messageId, reactions }) => {
      useChatStore.getState().handleMessageReaction(conversationId, messageId, reactions);
    });

    socket.on('message:poll-voted', ({ conversationId, messageId, poll }) => {
      useChatStore.getState().handleMessagePollVoted(conversationId, messageId, poll);
    });

    socket.on('conversation:cleared', ({ conversationId, clearedAt, keepStarredOnClear }) => {
      useChatStore.getState().handleConversationCleared(conversationId, clearedAt, keepStarredOnClear);
    });

    socket.on('conversation:pinned', ({ conversationId, pinned, pinnedAt }) => {
      useChatStore.getState().handleConversationPinned(conversationId, pinned, pinnedAt);
    });

    socket.on('conversation:archived', ({ conversationId, archived }) => {
      useChatStore.getState().handleConversationArchived(conversationId, archived);
    });

    socket.on('conversation:muted', ({ conversationId, mutedUntil }) => {
      useChatStore.getState().handleConversationMuted(conversationId, mutedUntil);
    });

    socket.on('conversation:unread', ({ conversationId, markedUnread }) => {
      useChatStore.getState().handleConversationUnread(conversationId, markedUnread);
    });

    socket.on('conversation:pinned-messages', ({ conversationId, pinnedMessages }) => {
      useChatStore.getState().handleConversationPinnedMessages(conversationId, pinnedMessages);
    });

    // ==================== REAL-TIME WEBRTC CALL EVENTS ====================
    socket.on('call:incoming', (incoming) => {
      useCallStore.getState().setIncomingCall(incoming);
    });

    socket.on('call:ringing', ({ callId }) => {
      useCallStore.setState((state) => ({
        activeCall: state.activeCall ? { ...state.activeCall, callId, status: 'ringing' } : null,
      }));
    });

    socket.on('call:accepted', async ({ callId, calleeId, callerId }) => {
      const callStore = useCallStore.getState();
      useCallStore.setState((state) => ({
        activeCall: state.activeCall ? { ...state.activeCall, callId, status: 'connected' } : null,
      }));
      callStore.startCallTimer();
      // If caller, send SDP Offer
      if (calleeId) {
        await callStore.createOffer(calleeId);
      }
    });

    socket.on('call:rejected', ({ callId, reason }) => {
      useCallStore.getState().cleanUpCall();
    });

    socket.on('call:cancelled', ({ callId }) => {
      useCallStore.getState().cleanUpCall();
    });

    socket.on('call:busy', ({ callId }) => {
      useCallStore.getState().cleanUpCall();
    });

    socket.on('call:ended', ({ callId, durationSec }) => {
      useCallStore.getState().cleanUpCall();
    });

    socket.on('call:offer', async ({ callId, sdp, senderId }) => {
      await useCallStore.getState().handleOffer(sdp, senderId);
    });

    socket.on('call:answer', async ({ callId, sdp }) => {
      await useCallStore.getState().handleAnswer(sdp);
    });

    socket.on('call:ice-candidate', async ({ candidate }) => {
      await useCallStore.getState().handleIceCandidate(candidate);
    });

    socket.on('call:media-state', ({ isMuted, isCameraOff, isScreenSharing }) => {
      // Remote peer updated their media controls
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

