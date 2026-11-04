import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getBlockedUsers,
  blockUser,
  unblockUser,
} from '../controllers/block.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getBlockedUsers);
router.post('/:userId', blockUser);
router.delete('/:userId', unblockUser);

export default router;
