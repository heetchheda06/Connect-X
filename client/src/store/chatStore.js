import { create } from 'zustand';
import { 
  getConversationsApi, 
  getMessagesApi, 
  markMessagesAsReadApi,
  deleteMessageApi 
} from '../api/chat.api.js';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messagesByConv: {},
  cursorsByConv: {},
  hasMoreByConv: {},
  loadingConversations: false,
  loadingMessages: false,
  loadingMore: false,
  filter: 'all', // 'all' | 'unread' | 'groups'
  searchQuery: '',
  infoDrawerOpen: false,
  replyingTo: null,

  // Fetch all conversations for current user
  fetchConversations: async () => {
    try {
      set({ loadingConversations: true });
      const res = await getConversationsApi();
      if (res.success && res.data?.conversations) {
        set({ conversations: res.data.conversations, loadingConversations: false });
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      set({ loadingConversations: false });
    }
  },

  // Set active conversation and fetch initial messages if needed
  setActiveConversation: async (conversationId) => {
    set({ activeConversationId: conversationId });
    if (!conversationId) return;

    // Reset unread count locally for responsive UI
    get().markConversationRead(conversationId);

    // If messages aren't loaded yet, load them
    if (!get().messagesByConv[conversationId]) {
      await get().fetchMessages(conversationId);
    }
  },

  // Fetch initial message history (30 messages)
  fetchMessages: async (conversationId) => {
    if (!conversationId) return;
    try {
      set({ loadingMessages: true });
      const res = await getMessagesApi(conversationId, { limit: 30 });
      if (res.success && res.data) {
        const { messages, nextCursor, hasMore } = res.data;
        set((state) => ({
          messagesByConv: {
            ...state.messagesByConv,
            [conversationId]: messages,
          },
          cursorsByConv: {
            ...state.cursorsByConv,
            [conversationId]: nextCursor,
          },
          hasMoreByConv: {
            ...state.hasMoreByConv,
            [conversationId]: hasMore,
          },
          loadingMessages: false,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      set({ loadingMessages: false });
    }
  },

  // Infinite scroll upward: load older messages
  fetchMoreMessages: async (conversationId) => {
    const { cursorsByConv, hasMoreByConv, loadingMore, messagesByConv } = get();
    const cursor = cursorsByConv[conversationId];
    const hasMore = hasMoreByConv[conversationId];

    if (!cursor || !hasMore || loadingMore) return;

    try {
      set({ loadingMore: true });
      const res = await getMessagesApi(conversationId, { cursor, limit: 30 });
      if (res.success && res.data) {
        const { messages: olderMessages, nextCursor, hasMore: stillHasMore } = res.data;
        const currentMessages = messagesByConv[conversationId] || [];

        // Prepend older messages
        set((state) => ({
          messagesByConv: {
            ...state.messagesByConv,
            [conversationId]: [...olderMessages, ...currentMessages],
          },
          cursorsByConv: {
            ...state.cursorsByConv,
            [conversationId]: nextCursor,
          },
          hasMoreByConv: {
            ...state.hasMoreByConv,
            [conversationId]: stillHasMore,
          },
          loadingMore: false,
        }));
      }
    } catch (err) {
      console.error('Failed to load more messages:', err);
      set({ loadingMore: false });
    }
  },

  // Handle incoming live message from Socket.IO
  handleIncomingMessage: (conversationId, message, currentUserId) => {
    const { activeConversationId, messagesByConv, conversations } = get();

    // 1. Append message to chat if loaded
    const currentMessages = messagesByConv[conversationId] || [];
    const isDuplicate = currentMessages.some((m) => m._id === message._id);

    if (!isDuplicate) {
      set((state) => ({
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: [...(state.messagesByConv[conversationId] || []), message],
        },
      }));
    }

    // 2. Update conversation list & unread counters
    const existingIndex = conversations.findIndex((c) => c._id === conversationId);
    let updatedConversations = [...conversations];

    if (existingIndex !== -1) {
      const conv = { ...updatedConversations[existingIndex] };
      conv.lastMessage = message;
      conv.updatedAt = message.createdAt;

      // If this conversation is NOT currently open and message is from another user, increment unread count
      if (activeConversationId !== conversationId && message.sender?._id !== currentUserId) {
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      }

      // Move conversation to top
      updatedConversations.splice(existingIndex, 1);
      updatedConversations.unshift(conv);
    } else {
      // New conversation created out of band, trigger reload
      get().fetchConversations();
      return;
    }

    set({ conversations: updatedConversations });
  },

  // Handle live read receipt
  handleMessageRead: (conversationId, readerUserId, readAt) => {
    set((state) => {
      const convMessages = state.messagesByConv[conversationId];
      if (!convMessages) return state;

      const updatedMessages = convMessages.map((msg) => {
        const alreadyRead = msg.readBy?.some((r) => r.user === readerUserId);
        if (!alreadyRead) {
          return {
            ...msg,
            readBy: [...(msg.readBy || []), { user: readerUserId, readAt }],
          };
        }
        return msg;
      });

      return {
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: updatedMessages,
        },
      };
    });
  },

  // Handle live message delete
  handleMessageDeleted: (conversationId, messageId) => {
    set((state) => {
      const convMessages = state.messagesByConv[conversationId];
      if (!convMessages) return state;

      const updated = convMessages.map((msg) =>
        msg._id === messageId
          ? {
              ...msg,
              content: '🚫 This message was deleted',
              attachment: null,
              isDeletedForEveryone: true,
            }
          : msg
      );

      return {
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: updated,
        },
      };
    });
  },

  // Mark conversation read
  markConversationRead: async (conversationId) => {
    // 1. Optimistically clear unread badge in sidebar
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    }));

    // 2. Call backend
    await markMessagesAsReadApi(conversationId).catch(() => {});
  },

  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleInfoDrawer: () => set((state) => ({ infoDrawerOpen: !state.infoDrawerOpen })),
  setInfoDrawerOpen: (open) => set({ infoDrawerOpen: open }),
  setReplyingTo: (message) => set({ replyingTo: message }),
}));

