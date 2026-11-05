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
  getOrCreateInviteLink,
  revokeInviteLink,
  getGroupInfoByInviteToken,
  joinGroupByInviteToken,
  updateGroupPermissions,
  deleteGroupForEveryone,
} from '../controllers/conversation.controller.js';
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  pinMessageInConversation,
  unpinMessageInConversation,
} from '../controllers/message.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireEmailVerified } from '../middleware/emailVerified.middleware.js';

const router = express.Router();

// All conversation routes require authentication
router.use(protect);

// Conversation discovery and listings
router.get('/', getConversations);
router.get('/rooms/discover', discoverRooms);

// Direct & Group creation (Blocked if email verification is enforced and user is unverified)
router.post('/direct', requireEmailVerified, createOrGetDirectConversation);
router.post('/group', requireEmailVerified, createGroupConversation);

// Single conversation actions
router.get('/:id', getConversationById);
router.put('/:id', updateConversation);
router.post('/:id/join', requireEmailVerified, joinRoom);
router.post('/:id/leave', leaveConversation);

// Membership management
router.post('/:id/members', addMembers);
router.delete('/:id/members/:userId', removeMember);
router.post('/:id/promote', promoteMemberToAdmin);

// Group invite links & public preview
router.post('/:id/invite-link', getOrCreateInviteLink);
router.post('/:id/revoke-invite-link', revokeInviteLink);
router.get('/join/:token', getGroupInfoByInviteToken);
router.post('/join/:token', joinGroupByInviteToken);

// Group permissions & deletion
router.put('/:id/permissions', updateGroupPermissions);
router.delete('/:id/delete-group', deleteGroupForEveryone);

// Messages sub-routes for this conversation
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.post('/:id/read', markMessagesAsRead);
router.post('/:id/pin-message', pinMessageInConversation);
router.delete('/:id/pin-message/:messageId', unpinMessageInConversation);

export default router;

