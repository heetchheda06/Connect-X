import express from 'express';
import {
  handleResetAndSeedDatabase,
  getOverviewStats,
  listUsers,
  toggleBanUser,
  updateUserRole,
  listReports,
  updateReportStatus,
  listTickets,
  updateTicketStatus,
} from '../controllers/admin.controller.js';
import { protect, requireAdmin, requireModerator } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public / Service Key Maintenance Route
router.post('/reset-database', handleResetAndSeedDatabase);

// Protected Admin Overview
router.get('/overview', protect, requireAdmin, getOverviewStats);

// User Management
router.get('/users', protect, requireAdmin, listUsers);
router.patch('/users/:id/ban', protect, requireAdmin, toggleBanUser);
router.patch('/users/:id/role', protect, requireAdmin, updateUserRole);

// Moderation & Reports (accessible by moderators and admins)
router.get('/reports', protect, requireModerator, listReports);
router.patch('/reports/:id', protect, requireModerator, updateReportStatus);

// Support Desk
router.get('/tickets', protect, requireModerator, listTickets);
router.patch('/tickets/:id', protect, requireModerator, updateTicketStatus);

export default router;
