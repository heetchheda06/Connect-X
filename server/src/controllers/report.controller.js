import Report from '../models/report.model.js';

/**
 * Submit a report against a user, conversation, or messages
 * POST /api/reports
 */
export const createReport = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const {
      reportedUser = null,
      reportedConversation = null,
      reportedMessages = [],
      reason,
      details = '',
    } = req.body;

    if (!reason || !['spam', 'harassment', 'inappropriate', 'fraud', 'other'].includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Valid report reason is required (spam, harassment, inappropriate, fraud, other)',
        data: null,
      });
    }

    if (!reportedUser && !reportedConversation && reportedMessages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Must specify a reported user, conversation, or messages',
        data: null,
      });
    }

    const report = await Report.create({
      reporter: currentUserId,
      reportedUser: reportedUser || null,
      reportedConversation: reportedConversation || null,
      reportedMessages: Array.isArray(reportedMessages) ? reportedMessages : [],
      reason,
      details: details.trim(),
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our team will review it.',
      data: {
        reportId: report._id,
      },
    });
  } catch (error) {
    next(error);
  }
};
