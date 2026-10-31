import express from 'express';
import {
  getAiSettings,
  updateAiSettings,
  getSupportedLanguages,
  getAiProviders,
} from '../controllers/ai.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { generalAiLimiter } from '../middleware/aiRateLimiter.js';

const router = express.Router();

// Public metadata routes
router.get('/languages', getSupportedLanguages);
router.get('/providers', getAiProviders);

// Protected user AI settings
router.use(protect);
router.get('/settings', getAiSettings);
router.put('/settings', generalAiLimiter, updateAiSettings);

export default router;
