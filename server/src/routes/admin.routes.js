import express from 'express';
import { handleResetAndSeedDatabase } from '../controllers/admin.controller.js';

const router = express.Router();

router.post('/reset-database', handleResetAndSeedDatabase);

export default router;
