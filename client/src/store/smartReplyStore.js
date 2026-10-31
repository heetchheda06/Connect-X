import { create } from 'zustand';
import { getSmartRepliesApi, rewriteDraftApi } from '../api/ai.api.js';
import { toast } from 'react-hot-toast';

export const useSmartReplyStore = create((set, get) => ({
  suggestions: [],
  isLoadingSuggestions: false,
  activeConversationId: null,

  // Tone Assist state
  tonePreview: null, // { original, rewritten, explanation, tone }
  isRewriting: false,
  toneError: null,

  /**
   * Fetch smart replies for the active direct conversation
   */
  fetchSmartReplies: async (conversationId) => {
    if (!conversationId) {
      set({ suggestions: [], activeConversationId: null });
      return;
    }

    try {
      set({ isLoadingSuggestions: true, activeConversationId: conversationId });
      const res = await getSmartRepliesApi({ conversationId });
      if (res.success && res.data?.suggestions) {
        set({ suggestions: res.data.suggestions, isLoadingSuggestions: false });
      } else {
        set({ suggestions: [], isLoadingSuggestions: false });
      }
    } catch (err) {
      // Quietly fail for suggestions to avoid intruding on normal chat
      set({ suggestions: [], isLoadingSuggestions: false });
    }
  },

  /**
   * Clear active suggestions (e.g. when user types or changes chat)
   */
  clearSuggestions: () => {
    set({ suggestions: [], isLoadingSuggestions: false });
  },

  /**
   * Rewrite draft text with tone assist
   */
  rewriteDraft: async ({ text, tone, isRetry = false }) => {
    if (!text || !text.trim()) {
      toast.error('Type a message in the composer first to use Tone Assist');
      return null;
    }

    try {
      set({ isRewriting: true, toneError: null });
      const res = await rewriteDraftApi({ text, tone, isRetry });
      if (res.success && res.data) {
        set({
          tonePreview: res.data,
          isRewriting: false,
          toneError: null,
        });
        return res.data;
      } else {
        throw new Error(res.message || 'Failed to rewrite text');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Tone assist unavailable';
      set({ isRewriting: false, toneError: msg });
      toast.error(msg);
      return null;
    }
  },

  /**
   * Clear tone preview card
   */
  clearTonePreview: () => {
    set({ tonePreview: null, isRewriting: false, toneError: null });
  },
}));
