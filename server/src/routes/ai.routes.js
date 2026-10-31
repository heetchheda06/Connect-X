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
} from '../controllers/ai.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import {
  generalAiLimiter,
  translateLimiter,
  smartRepliesLimiter,
  toneLimiter,
} from '../middleware/aiRateLimiter.js';

const router = express.Router();

// Public metadata routes
router.get('/languages', getSupportedLanguages);
router.get('/providers', getAiProviders);

// Protected routes
router.use(protect);
router.get('/settings', getAiSettings);
router.put('/settings', generalAiLimiter, updateAiSettings);

// Translation routes
router.post('/translate', translateLimiter, translateMessage);
router.post('/translate/batch', translateLimiter, translateBatch);

// Smart replies & Tone assist routes
router.post('/smart-replies', smartRepliesLimiter, getSmartReplies);
router.post('/rewrite', toneLimiter, rewriteDraft);

export default router;

