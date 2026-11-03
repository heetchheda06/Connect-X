import express from 'express';
import {
  listDecisions,
  updateDecision,
  exportDecisionsMarkdown,
} from '../controllers/decision.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.get('/', listDecisions);
router.put('/:id', updateDecision);
router.get('/export', exportDecisionsMarkdown);

export default router;
