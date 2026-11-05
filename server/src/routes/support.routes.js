import express from 'express';
import { createTicket, getMyTickets } from '../controllers/support.controller.js';
import { optionalAuth, protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/tickets', optionalAuth, createTicket);
router.get('/my-tickets', protect, getMyTickets);

export default router;
