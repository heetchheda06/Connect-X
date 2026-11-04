import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getCallHistory,
  deleteCallRecord,
  getIceServers,
} from '../controllers/call.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getCallHistory);
router.delete('/:id', deleteCallRecord);
router.get('/ice-servers', getIceServers);

export default router;

