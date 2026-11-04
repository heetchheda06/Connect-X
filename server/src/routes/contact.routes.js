import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getContacts,
  addContact,
  updateContact,
  deleteContact,
  getSharedMedia,
  getGroupsInCommon,
} from '../controllers/contact.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getContacts);
router.post('/', addContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);
router.get('/:userId/shared-media', getSharedMedia);
router.get('/:userId/groups-in-common', getGroupsInCommon);

export default router;

