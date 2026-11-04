import express from 'express';
import { getHealth, getReady } from '../controllers/health.controller.js';

const router = express.Router();

router.get('/health', getHealth);
router.get('/ready', getReady);

export default router;
