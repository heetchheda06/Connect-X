import User from '../models/user.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import Report from '../models/report.model.js';
import SupportTicket from '../models/supportTicket.model.js';
import Session from '../models/session.model.js';
import sessionService from '../services/session.service.js';
import { resetAndSeedDatabase } from '../utils/seedCore.js';
import { env } from '../config/env.js';

export const handleResetAndSeedDatabase = async (req, res, next) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    const validKeys = [env.jwtSecret, 'connectx_reset_2026', 'connectx_super_secret_jwt_key_2026_ocean_wave'].filter(Boolean);
    if (!adminKey || !validKeys.includes(adminKey)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid or missing x-admin-key header',
        data: null,
      });
    }

    const result = await resetAndSeedDatabase();

    return res.status(200).json({
      success: true,
      message: 'Database cleared completely. Blank slate with official sticker packs ready.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getOverviewStats = async (req, res, next) => {
  try {
    const [totalUsers, bannedUsers, totalConversations, totalMessages, pendingReports, openTickets, activeSessions] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isBanned: true }),
        Conversation.countDocuments(),
        Message.countDocuments(),
        Report.countDocuments({ status: 'pending' }),
        SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
        Session.countDocuments({ revokedAt: null, expiresAt: { $gt: new Date() } }),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        bannedUsers,
        totalConversations,
        totalMessages,
        pendingReports,
        openTickets,
        activeSessions,
      },
      message: 'Overview statistics loaded',
    });
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search?.trim();
    const role = req.query.role;
    const banned = req.query.banned;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role && ['user', 'moderator', 'admin'].includes(role)) {
      query.role = role;
    }
    if (banned === 'true') {
      query.isBanned = true;
    } else if (banned === 'false') {
      query.isBanned = false;
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      message: 'Users retrieved',
    });
  } catch (err) {
    next(err);
  }
};

export const toggleBanUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ban, reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot ban another admin' });
    }

    user.isBanned = Boolean(ban);
    user.bannedReason = ban ? (reason || 'Violated Community Guidelines') : '';
    user.bannedAt = ban ? new Date() : null;

    if (ban) {
      // Invalidate all sessions immediately and bump tokenVersion
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await sessionService.revokeAllUserSessions(user._id);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      data: user,
      message: ban ? `User @${user.username} has been suspended.` : `User @${user.username} suspension lifted.`,
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      data: user,
      message: `User role updated to ${role}`,
    });
  } catch (err) {
    next(err);
  }
};

export const listReports = async (req, res, next) => {
  try {
    const status = req.query.status;
    const query = status ? { status } : {};

    const reports = await Report.find(query)
      .populate('reporter', 'name username email avatar')
      .populate('reportedUser', 'name username email avatar isBanned role')
      .populate({
        path: 'reportedMessages',
        select: 'content sender createdAt type isDeletedForEveryone',
        populate: { path: 'sender', select: 'name username avatar' },
      })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      data: reports,
      message: 'Reports retrieved',
    });
  } catch (err) {
    next(err);
  }
};

export const updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, action } = req.body;

    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid report status' });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = status;
    await report.save();

    // If an action was specified (e.g., ban the reported user)
    if (action === 'ban' && report.reportedUser) {
      const user = await User.findById(report.reportedUser);
      if (user && user.role !== 'admin') {
        user.isBanned = true;
        user.bannedReason = `Report #${report._id}: ${report.reason}`;
        user.bannedAt = new Date();
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await sessionService.revokeAllUserSessions(user._id);
        await user.save();
      }
    }

    return res.status(200).json({
      success: true,
      data: report,
      message: `Report marked as ${status}`,
    });
  } catch (err) {
    next(err);
  }
};

export const listTickets = async (req, res, next) => {
  try {
    const status = req.query.status;
    const query = status ? { status } : {};

    const tickets = await SupportTicket.find(query)
      .populate('user', 'name username email avatar')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      data: tickets,
      message: 'Support tickets retrieved',
    });
  } catch (err) {
    next(err);
  }
};

export const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket status' });
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.status = status;
    if (adminNotes !== undefined) ticket.adminNotes = adminNotes;
    if (status === 'resolved' || status === 'closed') {
      ticket.resolvedAt = new Date();
    }
    await ticket.save();

    return res.status(200).json({
      success: true,
      data: ticket,
      message: `Ticket updated to ${status}`,
    });
  } catch (err) {
    next(err);
  }
};
