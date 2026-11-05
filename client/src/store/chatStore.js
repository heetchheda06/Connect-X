import { create } from 'zustand';
import { 
  getConversationsApi, 
  getMessagesApi, 
  markMessagesAsReadApi,
  deleteMessageApi,
  clearChatApi,
  deleteChatApi,
  archiveChatApi,
  pinChatApi,
  muteChatApi,
  markUnreadApi,
  setWallpaperApi
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
  archivedCount: 0,
  viewArchived: false,

  // Multi-select message mode
  selectedMessageIds: [],
  isMultiSelect: false,

  setViewArchived: (val) => {
    set({ viewArchived: val });
    get().fetchConversations();
  },

  // Toggle multi-select mode
  setIsMultiSelect: (val) => {
    set({ isMultiSelect: val, selectedMessageIds: val ? get().selectedMessageIds : [] });
  },

  toggleSelectMessage: (messageId) => {
    const { selectedMessageIds } = get();
    const exists = selectedMessageIds.includes(messageId);
    const updated = exists
      ? selectedMessageIds.filter((id) => id !== messageId)
      : [...selectedMessageIds, messageId];
    set({
      selectedMessageIds: updated,
      isMultiSelect: updated.length > 0,
    });
  },

  clearSelection: () => {
    set({ selectedMessageIds: [], isMultiSelect: false });
  },

  // Upsert conversation into conversations list immediately
  upsertConversation: (conversation) => {
    if (!conversation || !conversation._id) return;
    set((state) => {
      const existsIndex = state.conversations.findIndex(
        (c) => c._id?.toString() === conversation._id?.toString()
      );
      if (existsIndex !== -1) {
        const updated = [...state.conversations];
        updated[existsIndex] = { ...updated[existsIndex], ...conversation };
        return { conversations: updated };
      }
      return {
        conversations: [conversation, ...state.conversations],
      };
    });
  },

  // Instant reactive wallpaper update
  setConversationWallpaper: (conversationId, wallpaper) => {
    if (!conversationId) return;
    set((state) => {
      const idx = state.conversations.findIndex(
        (c) => c._id?.toString() === conversationId?.toString()
      );
      if (idx !== -1) {
        const updated = [...state.conversations];
        updated[idx] = { ...updated[idx], wallpaper };
        return { conversations: updated };
      }
      return state;
    });
  },

  // Fetch all conversations for current user
  fetchConversations: async () => {
    try {
      set({ loadingConversations: true });
      const { viewArchived, activeConversationId, conversations: currentList } = get();
      const res = await getConversationsApi({ archived: viewArchived });
      if (res.success && res.data) {
        const fetched = res.data.conversations || [];
        // Preserve currently active conversation if not yet returned by backend
        let merged = fetched;
        if (activeConversationId) {
          const activeConv = currentList.find(
            (c) => c._id?.toString() === activeConversationId?.toString()
          );
          if (activeConv && !fetched.some((c) => c._id?.toString() === activeConversationId?.toString())) {
            merged = [activeConv, ...fetched];
          }
        }

        set({
          conversations: merged,
          archivedCount: res.data.archivedCount || 0,
          loadingConversations: false,
        });
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

      // Move conversation to top (unless pinned)
      if (!conv.isPinned) {
        updatedConversations.splice(existingIndex, 1);
        // Find insert position after all pinned chats
        const firstUnpinnedIndex = updatedConversations.findIndex((c) => !c.isPinned);
        if (firstUnpinnedIndex === -1) {
          updatedConversations.push(conv);
        } else {
          updatedConversations.splice(firstUnpinnedIndex, 0, conv);
        }
      }
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

  // Handle live message edit
  handleMessageEdited: (conversationId, updatedMessage) => {
    set((state) => {
      const convMessages = state.messagesByConv[conversationId];
      if (!convMessages) return state;

      const updated = convMessages.map((msg) =>
        msg._id === updatedMessage._id ? updatedMessage : msg
      );

      return {
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: updated,
        },
      };
    });
  },

  // Handle live message reaction
  handleMessageReaction: (conversationId, messageId, reactions) => {
    set((state) => {
      const convMessages = state.messagesByConv[conversationId];
      if (!convMessages) return state;

      const updated = convMessages.map((msg) =>
        msg._id === messageId ? { ...msg, reactions } : msg
      );

      return {
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: updated,
        },
      };
    });
  },

  // Handle live poll vote update
  handleMessagePollVoted: (conversationId, messageId, poll) => {
    set((state) => {
      const convMessages = state.messagesByConv[conversationId];
      if (!convMessages) return state;

      const updated = convMessages.map((msg) =>
        msg._id === messageId ? { ...msg, poll } : msg
      );

      return {
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: updated,
        },
      };
    });
  },

  // Handle chat cleared real-time
  handleConversationCleared: (conversationId, clearedAt, keepStarredOnClear) => {
    set((state) => {
      const convMessages = state.messagesByConv[conversationId] || [];
      const filtered = keepStarredOnClear
        ? convMessages.filter((m) => m.starredBy && m.starredBy.length > 0)
        : [];

      return {
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: filtered,
        },
        conversations: state.conversations.map((c) =>
          c._id === conversationId ? { ...c, lastMessage: null, unreadCount: 0 } : c
        ),
      };
    });
  },

  // Handle chat pinned real-time
  handleConversationPinned: (conversationId, isPinned, pinnedAt) => {
    set((state) => {
      const updated = state.conversations.map((c) =>
        c._id === conversationId ? { ...c, isPinned, pinnedAt } : c
      );
      // Re-sort
      updated.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.isPinned && b.isPinned) {
          return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime();
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      return { conversations: updated };
    });
  },

  // Handle chat archived real-time
  handleConversationArchived: (conversationId, isArchived) => {
    set((state) => {
      const { viewArchived } = state;
      // If we are on active list, remove the archived chat; if on archived list, keep
      const updated = state.conversations.filter((c) =>
        viewArchived ? c._id !== conversationId || isArchived : c._id !== conversationId || !isArchived
      );
      const newArchivedCount = isArchived
        ? state.archivedCount + 1
        : Math.max(0, state.archivedCount - 1);

      return {
        conversations: updated,
        archivedCount: newArchivedCount,
      };
    });
  },

  // Handle chat muted real-time
  handleConversationMuted: (conversationId, mutedUntil) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, isMuted: !!mutedUntil, mutedUntil } : c
      ),
    }));
  },

  // Handle chat unread real-time
  handleConversationUnread: (conversationId, markedUnread) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, markedUnread } : c
      ),
    }));
  },

  // Handle pinned messages in conversation
  handleConversationPinnedMessages: (conversationId, pinnedMessages) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, pinnedMessages } : c
      ),
    }));
  },

  // Mark conversation read
  markConversationRead: async (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, unreadCount: 0, markedUnread: false } : c
      ),
    }));
    await markMessagesAsReadApi(conversationId).catch(() => {});
  },

  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleInfoDrawer: () => set((state) => ({ infoDrawerOpen: !state.infoDrawerOpen })),
  setInfoDrawerOpen: (open) => set({ infoDrawerOpen: open }),
  setReplyingTo: (message) => set({ replyingTo: message }),
}));
