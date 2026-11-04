import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  clearChat,
  deleteChat,
  toggleArchiveChat,
  togglePinChat,
  muteChat,
  markUnread,
  setWallpaper,
  exportChat,
  updateDisappearingMessages,
  clearAllChats,
  deleteAllChats,
  archiveAllChats,
} from '../controllers/conversationState.controller.js';

const router = express.Router();

// All chat state routes require authentication
router.use(authenticate);

// Per-conversation state actions
router.post('/conversations/:id/clear', clearChat);
router.post('/conversations/:id/delete', deleteChat);
router.put('/conversations/:id/archive', toggleArchiveChat);
router.put('/conversations/:id/pin', togglePinChat);
router.put('/conversations/:id/mute', muteChat);
router.put('/conversations/:id/unread', markUnread);
router.put('/conversations/:id/wallpaper', setWallpaper);
router.get('/conversations/:id/export', exportChat);
router.put('/conversations/:id/disappearing', updateDisappearingMessages);

// Global settings actions
router.post('/settings/chats/clear-all', clearAllChats);
router.post('/settings/chats/delete-all', deleteAllChats);
router.post('/settings/chats/archive-all', archiveAllChats);

export default router;

