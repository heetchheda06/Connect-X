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

/**
 * Fetch contextual smart replies for direct conversation
 */
export const getSmartRepliesApi = async ({ conversationId }) => {
  const response = await api.post('/ai/smart-replies', { conversationId });
  return response.data;
};

/**
 * Rewrite a draft message with Tone Assist
 */
export const rewriteDraftApi = async ({ text, tone, isRetry = false }) => {
  const response = await api.post('/ai/rewrite', { text, tone, isRetry });
  return response.data;
};

/**
 * Transcribe a voice note and generate summary
 */
export const transcribeVoiceApi = async ({ messageId }) => {
  const response = await api.post('/ai/transcribe', { messageId });
  return response.data;
};

// ==================== REMINDERS (Section 5) ====================

export const parseReminderApi = async ({ text, messageId }) => {
  const response = await api.post('/reminders/parse', { text, messageId });
  return response.data;
};

export const createReminderApi = async (data) => {
  const response = await api.post('/reminders', data);
  return response.data;
};

export const listRemindersApi = async (status = '') => {
  const response = await api.get('/reminders', { params: { status } });
  return response.data;
};

export const updateReminderApi = async (id, data) => {
  const response = await api.put(`/reminders/${id}`, data);
  return response.data;
};

export const deleteReminderApi = async (id) => {
  const response = await api.delete(`/reminders/${id}`);
  return response.data;
};

// ==================== TASKS & DEADLINES (Sections 7, 9, 10) ====================

export const extractInsightsApi = async ({ conversationId, range = 50 }) => {
  const response = await api.post('/tasks/extract', { conversationId, range });
  return response.data;
};

export const listTasksApi = async ({ conversationId, scope = 'conversation', status = '' } = {}) => {
  const response = await api.get('/tasks', { params: { conversationId, scope, status } });
  return response.data;
};

export const createTaskApi = async (data) => {
  const response = await api.post('/tasks', data);
  return response.data;
};

export const updateTaskApi = async (id, data) => {
  const response = await api.put(`/tasks/${id}`, data);
  return response.data;
};

export const listDeadlinesApi = async (conversationId) => {
  const response = await api.get('/deadlines', { params: { conversationId } });
  return response.data;
};

export const acceptDeadlineApi = async (id, syncReminder = true) => {
  const response = await api.post(`/deadlines/${id}/accept`, { syncReminder });
  return response.data;
};

// ==================== DECISIONS (Section 12) ====================

export const listDecisionsApi = async (conversationId) => {
  const response = await api.get('/decisions', { params: { conversationId } });
  return response.data;
};

export const updateDecisionApi = async (id, data) => {
  const response = await api.put(`/decisions/${id}`, data);
  return response.data;
};

// ==================== SUMMARIES (Section 8) ====================

export const generateSummaryApi = async ({ conversationId, style = 'brief', range = 50 }) => {
  const response = await api.post('/ai/summary', { conversationId, style, range });
  return response.data;
};

export const shareSummaryApi = async (summaryId) => {
  const response = await api.post(`/ai/summary/${summaryId}/share`);
  return response.data;
};

// ==================== ASK THIS CHAT (Section 11) ====================

export const askThisChatApi = async ({ conversationId, question, threadId }) => {
  const response = await api.post('/ai/ask', { conversationId, question, threadId });
  return response.data;
};

// ==================== ASSISTANT (Section 13) ====================

export const chatAssistantApi = async ({ message, threadId }) => {
  const response = await api.post('/ai/assistant', { message, threadId });
  return response.data;
};

// ==================== DOCUMENT ANALYSIS (Section 14) ====================

export const analyzeDocumentApi = async ({ messageId }) => {
  const response = await api.post('/ai/documents/analyze', { messageId });
  return response.data;
};

export const askDocumentApi = async ({ messageId, question }) => {
  const response = await api.post('/ai/documents/ask', { messageId, question });
  return response.data;
};

// ==================== MEETINGS (Section 15) ====================

export const startMeetingApi = async (data) => {
  const response = await api.post('/meetings', data);
  return response.data;
};

export const joinMeetingApi = async (id) => {
  const response = await api.post(`/meetings/${id}/join`);
  return response.data;
};

export const endMeetingApi = async (id) => {
  const response = await api.post(`/meetings/${id}/end`);
  return response.data;
};

// ==================== SEMANTIC SEARCH (Section 16) ====================

export const searchMessagesApi = async ({ q, conversationId, mode = 'hybrid' }) => {
  const response = await api.get('/ai/search', { params: { q, conversationId, mode } });
  return response.data;
};

export const askAllChatsApi = async ({ question }) => {
  const response = await api.post('/ai/ask-all', { question });
  return response.data;
};

// ==================== STUDY MODE (Section 17) ====================

export const generateFlashcardsApi = async (data) => {
  const response = await api.post('/study/decks/generate', data);
  return response.data;
};

export const listStudyDecksApi = async (conversationId) => {
  const response = await api.get('/study/decks', { params: { conversationId } });
  return response.data;
};

export const submitCardReviewApi = async (cardId, { deckId, rating }) => {
  const response = await api.post(`/study/review/${cardId}`, { deckId, rating });
  return response.data;
};

export const generateQuizApi = async (data) => {
  const response = await api.post('/study/quizzes/generate', data);
  return response.data;
};

export const explainConceptApi = async ({ text, targetLang }) => {
  const response = await api.post('/study/explain', { text, targetLang });
  return response.data;
};

// ==================== ANALYTICS (Section 18) ====================

export const getAnalyticsApi = async (conversationId, range = '30d') => {
  const response = await api.get(`/analytics/conversations/${conversationId}`, { params: { range } });
  return response.data;
};

export const getWeeklyInsightApi = async (conversationId) => {
  const response = await api.get(`/analytics/conversations/${conversationId}/insight`);
  return response.data;
};

// ==================== PRIVACY & AUDIT (Section 6) ====================

export const getPrivacySettingsApi = async () => {
  const response = await api.get('/ai/privacy');
  return response.data;
};

export const updatePrivacySettingsApi = async (settings) => {
  const response = await api.put('/ai/privacy', settings);
  return response.data;
};

export const updateConversationAiModeApi = async (conversationId, mode) => {
  const response = await api.put(`/ai/conversations/${conversationId}/mode`, { mode });
  return response.data;
};

export const toggleConversationOptOutApi = async (conversationId, optOut) => {
  const response = await api.put(`/ai/conversations/${conversationId}/opt-out`, { optOut });
  return response.data;
};

export const getConversationActivityApi = async (conversationId) => {
  const response = await api.get(`/ai/conversations/${conversationId}/activity`);
  return response.data;
};

export const purgeAiDataApi = async (conversationId = '') => {
  const response = await api.delete('/ai/data', { params: { conversationId } });
  return response.data;
};




