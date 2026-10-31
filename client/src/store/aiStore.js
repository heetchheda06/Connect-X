import { create } from 'zustand';
import {
  getAiSettingsApi,
  updateAiSettingsApi,
  getAiLanguagesApi,
  getAiProvidersApi,
} from '../api/ai.api.js';

const DEFAULT_AI_SETTINGS = {
  enabled: false,
  preferredLanguage: 'en',
  timezone: 'Asia/Kolkata',
  smartReplies: true,
  autoTranslateConversations: [],
};

export const useAiStore = create((set, get) => ({
  settings: DEFAULT_AI_SETTINGS,
  languages: [],
  providers: null,
  isLoading: false,
  isUpdating: false,
  error: null,
  showOnboardingModal: false,

  setShowOnboardingModal: (show) => set({ showOnboardingModal: Boolean(show) }),

  /**
   * Sync settings from user object in authStore
   */
  syncFromUser: (user) => {
    if (user?.aiSettings) {
      set({
        settings: {
          ...DEFAULT_AI_SETTINGS,
          ...user.aiSettings,
        },
      });
    }
  },

  /**
   * Fetch latest settings from server
   */
  fetchSettings: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await getAiSettingsApi();
      if (res.success && res.data?.settings) {
        set({ settings: res.data.settings, isLoading: false });
        return res.data.settings;
      }
    } catch (err) {
      set({
        isLoading: false,
        error: err.response?.data?.message || err.message,
      });
    }
  },

  /**
   * Update AI settings
   */
  updateSettings: async (newValues) => {
    try {
      set({ isUpdating: true, error: null });
      const res = await updateAiSettingsApi(newValues);
      if (res.success && res.data?.settings) {
        set({ settings: res.data.settings, isUpdating: false });
        return { success: true, settings: res.data.settings };
      }
      throw new Error(res.message || 'Failed to update AI settings');
    } catch (err) {
      set({
        isUpdating: false,
        error: err.response?.data?.message || err.message,
      });
      return {
        success: false,
        error: err.response?.data?.message || err.message,
      };
    }
  },

  /**
   * Fetch supported languages
   */
  fetchLanguages: async () => {
    if (get().languages.length > 0) return get().languages;
    try {
      const res = await getAiLanguagesApi();
      if (res.success && res.data?.languages) {
        set({ languages: res.data.languages });
        return res.data.languages;
      }
    } catch (err) {
      console.warn('[AiStore] Could not load supported languages:', err.message);
    }
  },

  /**
   * Fetch AI provider transparency data
   */
  fetchProviders: async () => {
    if (get().providers) return get().providers;
    try {
      const res = await getAiProvidersApi();
      if (res.success && res.data) {
        set({ providers: res.data });
        return res.data;
      }
    } catch (err) {
      console.warn('[AiStore] Could not load provider policies:', err.message);
    }
  },
}));

