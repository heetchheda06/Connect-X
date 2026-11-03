import express from 'express';
import {
  listDeadlines,
  acceptDeadline,
} from '../controllers/deadline.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.get('/', listDeadlines);
router.post('/:id/accept', acceptDeadline);

export default router;
