import express from 'express';
import {
  getAiSettings,
  updateAiSettings,
  getSupportedLanguages,
  getAiProviders,
  translateMessage,
  translateBatch,
  getSmartReplies,
  rewriteDraft,
  transcribeVoiceMessage,
  generateCatchUpSummary,
  shareSummaryCard,
  askThisChat,
  chatAssistant,
  analyzeDocument,
  askDocument,
  searchAiMessages,
  askAllMyChats,
} from '../controllers/ai.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import {
  generalAiLimiter,
  translateLimiter,
  smartRepliesLimiter,
  toneLimiter,
  transcribeLimiter,
} from '../middleware/aiRateLimiter.js';

import {
  getAiPrivacySettings,
  updateAiPrivacySettings,
  updateConversationAiMode,
  toggleConversationOptOut,
  getConversationAiActivity,
  exportAiData,
  purgeAiData,
} from '../controllers/aiPrivacy.controller.js';

const router = express.Router();

// Public metadata routes
router.get('/languages', getSupportedLanguages);
router.get('/providers', getAiProviders);

// Protected routes
router.use(protect);
router.get('/settings', getAiSettings);
router.put('/settings', generalAiLimiter, updateAiSettings);

// Privacy & Consent routes (Section 6)
router.get('/privacy', getAiPrivacySettings);
router.put('/privacy', updateAiPrivacySettings);
router.put('/conversations/:id/mode', updateConversationAiMode);
router.put('/conversations/:id/opt-out', toggleConversationOptOut);
router.get('/conversations/:id/activity', getConversationAiActivity);
router.get('/data/export', exportAiData);
router.delete('/data', purgeAiData);

// Translation routes
router.post('/translate', translateLimiter, translateMessage);
router.post('/translate/batch', translateLimiter, translateBatch);

// Smart replies & Tone assist routes
router.post('/smart-replies', smartRepliesLimiter, getSmartReplies);
router.post('/rewrite', toneLimiter, rewriteDraft);

// Voice transcription route
router.post('/transcribe', transcribeLimiter, transcribeVoiceMessage);

// Catch-Up summary routes (Section 8)
router.post('/summary', generalAiLimiter, generateCatchUpSummary);
router.post('/summary/:id/share', shareSummaryCard);

// Ask This Chat route (Section 11)
router.post('/ask', generalAiLimiter, askThisChat);

// Assistant route (Section 13)
router.post('/assistant', generalAiLimiter, chatAssistant);

// Document Analysis routes (Section 14)
router.post('/documents/analyze', generalAiLimiter, analyzeDocument);
router.post('/documents/ask', generalAiLimiter, askDocument);

// Semantic Search & Ask All (Section 16)
router.get('/search', generalAiLimiter, searchAiMessages);
router.post('/ask-all', generalAiLimiter, askAllMyChats);

export default router;

