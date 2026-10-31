import api from './axios.js';

/**
 * Fetch the authenticated user's AI settings
 */
export const getAiSettingsApi = async () => {
  const response = await api.get('/ai/settings');
  return response.data;
};

/**
 * Update the authenticated user's AI settings
 * @param {Object} settings 
 */
export const updateAiSettingsApi = async (settings) => {
  const response = await api.put('/ai/settings', settings);
  return response.data;
};

/**
 * Fetch list of supported languages
 */
export const getAiLanguagesApi = async () => {
  const response = await api.get('/ai/languages');
  return response.data;
};

/**
 * Fetch AI provider policies and configuration
 */
export const getAiProvidersApi = async () => {
  const response = await api.get('/ai/providers');
  return response.data;
};

/**
 * Translate a single message to target language
 */
export const translateMessageApi = async ({ messageId, targetLang }) => {
  const response = await api.post('/ai/translate', { messageId, targetLang });
  return response.data;
};

/**
 * Batch translate multiple messages in a conversation
 */
export const translateBatchApi = async ({ messageIds, targetLang }) => {
  const response = await api.post('/ai/translate/batch', { messageIds, targetLang });
  return response.data;
};

