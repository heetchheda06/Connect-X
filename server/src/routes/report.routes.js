import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { createReport } from '../controllers/report.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createReport);

export default router;
