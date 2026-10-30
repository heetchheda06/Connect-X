import express from 'express';
import { deleteMessage } from '../controllers/message.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Delete message: /api/messages/:id?scope=me|everyone
router.delete('/:id', deleteMessage);

export default router;

