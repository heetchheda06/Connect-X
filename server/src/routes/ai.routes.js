import express from 'express';
import {
  getAiSettings,
  updateAiSettings,
  getSupportedLanguages,
  getAiProviders,
  translateMessage,
  translateBatch,
} from '../controllers/ai.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { generalAiLimiter, translateLimiter } from '../middleware/aiRateLimiter.js';

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

export default router;

