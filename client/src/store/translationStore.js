import { create } from 'zustand';
import { translateMessageApi, translateBatchApi } from '../api/ai.api.js';

export const useTranslationStore = create((set, get) => ({
  // Map of messageId -> { translatedText, detectedSourceLang, alreadyInTargetLang, showOriginal, targetLang }
  translations: {},
  // Map of messageId -> boolean
  loadingIds: {},
  // Map of messageId -> errorMessage
  errors: {},

  getTranslation: (messageId) => {
    return get().translations[messageId] || null;
  },

  isTranslating: (messageId) => {
    return Boolean(get().loadingIds[messageId]);
  },

  getError: (messageId) => {
    return get().errors[messageId] || null;
  },

  toggleShowOriginal: (messageId) => {
    const existing = get().translations[messageId];
    if (!existing) return;
    set((state) => ({
      translations: {
        ...state.translations,
        [messageId]: {
          ...existing,
          showOriginal: !existing.showOriginal,
        },
      },
    }));
  },

  translateMessage: async ({ messageId, targetLang }) => {
    if (!messageId || !targetLang) return;

    // Check if already in store for this targetLang
    const existing = get().translations[messageId];
    if (existing && existing.targetLang === targetLang && !existing.error) {
      return existing;
    }

    set((state) => ({
      loadingIds: { ...state.loadingIds, [messageId]: true },
      errors: { ...state.errors, [messageId]: null },
    }));

    try {
      const res = await translateMessageApi({ messageId, targetLang });
      if (res.success && res.data) {
        const translationData = {
          translatedText: res.data.translatedText,
          detectedSourceLang: res.data.detectedSourceLang,
          alreadyInTargetLang: res.data.alreadyInTargetLang,
          targetLang: res.data.targetLang || targetLang,
          showOriginal: false,
        };

        set((state) => ({
          translations: {
            ...state.translations,
            [messageId]: translationData,
          },
          loadingIds: { ...state.loadingIds, [messageId]: false },
        }));
        return translationData;
      }
      throw new Error(res.message || 'Failed to translate message');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Translation failed';
      set((state) => ({
        loadingIds: { ...state.loadingIds, [messageId]: false },
        errors: { ...state.errors, [messageId]: errMsg },
      }));
      return null;
    }
  },

  translateBatch: async ({ messageIds, targetLang }) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0 || !targetLang) return;

    // Filter out messages that already have translation for this targetLang
    const existingTranslations = get().translations;
    const idsToFetch = messageIds.filter((id) => {
      const ex = existingTranslations[id];
      return !(ex && ex.targetLang === targetLang);
    });

    if (idsToFetch.length === 0) return;

    const newLoading = {};
    idsToFetch.forEach((id) => {
      newLoading[id] = true;
    });

    set((state) => ({
      loadingIds: { ...state.loadingIds, ...newLoading },
    }));

    try {
      const res = await translateBatchApi({ messageIds: idsToFetch, targetLang });
      if (res.success && res.data?.translations) {
        const newTranslations = {};
        const newErrors = {};

        Object.entries(res.data.translations).forEach(([id, item]) => {
          if (item.failed) {
            newErrors[id] = item.error;
          } else {
            newTranslations[id] = {
              translatedText: item.translatedText,
              detectedSourceLang: item.detectedSourceLang,
              alreadyInTargetLang: item.alreadyInTargetLang,
              targetLang: item.targetLang || targetLang,
              showOriginal: false,
            };
          }
        });

        const updatedLoading = { ...get().loadingIds };
        idsToFetch.forEach((id) => {
          delete updatedLoading[id];
        });

        set((state) => ({
          translations: { ...state.translations, ...newTranslations },
          errors: { ...state.errors, ...newErrors },
          loadingIds: updatedLoading,
        }));
      }
    } catch (err) {
      const updatedLoading = { ...get().loadingIds };
      idsToFetch.forEach((id) => {
        delete updatedLoading[id];
      });
      set({ loadingIds: updatedLoading });
    }
  },

  clearTranslation: (messageId) => {
    set((state) => {
      const nextTranslations = { ...state.translations };
      const nextLoading = { ...state.loadingIds };
      const nextErrors = { ...state.errors };
      delete nextTranslations[messageId];
      delete nextLoading[messageId];
      delete nextErrors[messageId];
      return {
        translations: nextTranslations,
        loadingIds: nextLoading,
        errors: nextErrors,
      };
    });
  },
}));
