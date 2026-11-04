import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getPrivacySettings,
  updatePrivacySettings,
  getNotificationSettings,
  updateNotificationSettings,
  getChatPreferences,
  updateChatPreferences,
} from '../controllers/settings.controller.js';

const router = express.Router();

router.use(authenticate);

// Privacy
router.get('/privacy', getPrivacySettings);
router.put('/privacy', updatePrivacySettings);

// Notifications
router.get('/notifications', getNotificationSettings);
router.put('/notifications', updateNotificationSettings);

// Chat preferences
router.get('/chat-preferences', getChatPreferences);
router.put('/chat-preferences', updateChatPreferences);

export default router;

