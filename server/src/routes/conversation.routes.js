import express from 'express';
import {
  getConversations,
  createOrGetDirectConversation,
  createGroupConversation,
  getConversationById,
  updateConversation,
  addMembers,
  removeMember,
  leaveConversation,
  discoverRooms,
  joinRoom,
  promoteMemberToAdmin,
} from '../controllers/conversation.controller.js';
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
} from '../controllers/message.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// All conversation routes require authentication
router.use(protect);

// Conversation discovery and listings
router.get('/', getConversations);
router.get('/rooms/discover', discoverRooms);

// Direct & Group creation
router.post('/direct', createOrGetDirectConversation);
router.post('/group', createGroupConversation);

// Single conversation actions
router.get('/:id', getConversationById);
router.put('/:id', updateConversation);
router.post('/:id/join', joinRoom);
router.post('/:id/leave', leaveConversation);

// Membership management
router.post('/:id/members', addMembers);
router.delete('/:id/members/:userId', removeMember);
router.post('/:id/promote', promoteMemberToAdmin);

// Messages sub-routes for this conversation
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.post('/:id/read', markMessagesAsRead);

export default router;

