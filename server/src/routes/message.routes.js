import express from 'express';
import {
  deleteMessage,
  editMessage,
  forwardMessages,
  starMessage,
  unstarMessage,
  getStarredMessages,
  reactToMessage,
  votePoll,
} from '../controllers/message.controller.js';
import {
  scheduleMessage,
  getScheduledMessages,
  cancelScheduledMessage,
} from '../controllers/scheduledMessage.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Scheduled messages
router.post('/schedule', scheduleMessage);
router.get('/schedule', getScheduledMessages);
router.delete('/schedule/:id', cancelScheduledMessage);

// Starred messages list
router.get('/starred', getStarredMessages);

// Forward messages to multiple conversations
router.post('/forward', forwardMessages);

// Single message operations
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);
router.post('/:id/star', starMessage);
router.delete('/:id/star', unstarMessage);
router.post('/:id/reactions', reactToMessage);
router.post('/:id/vote', votePoll);

export default router;
