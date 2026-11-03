import express from 'express';
import {
  extractInsights,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  exportTasksIcs,
} from '../controllers/task.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.post('/extract', extractInsights);
router.get('/', listTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.get('/export.ics', exportTasksIcs);

export default router;
