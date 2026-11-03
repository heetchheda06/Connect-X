import express from 'express';
import {
  parseReminder,
  createReminder,
  listReminders,
  updateReminder,
  deleteReminder,
} from '../controllers/reminder.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { reminderParseLimiter } from '../middleware/aiRateLimiter.js';

const router = express.Router();

router.use(protect);

router.post('/parse', reminderParseLimiter, parseReminder);
router.post('/', createReminder);
router.get('/', listReminders);
router.put('/:id', updateReminder);
router.delete('/:id', deleteReminder);

export default router;
