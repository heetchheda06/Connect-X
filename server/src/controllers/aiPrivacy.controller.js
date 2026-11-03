import User from '../models/user.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import AiActivity from '../models/aiActivity.model.js';
import AiConsent from '../models/aiConsent.model.js';
import Translation from '../models/translation.model.js';
import Transcript from '../models/transcript.model.js';
import Reminder from '../models/reminder.model.js';

/**
 * Get user AI privacy settings and audit history
 * GET /api/ai/privacy
 */
export const getAiPrivacySettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('aiSettings');
    return res.status(200).json({
      success: true,
      message: 'AI privacy settings retrieved',
      data: {
        settings: user?.aiSettings,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update user AI privacy settings
 * PUT /api/ai/privacy
 */
export const updateAiPrivacySettings = async (req, res, next) => {
  try {
    const {
      excludeMyMessages,
      redactionEnabled,
      retentionDays,
      summaries,
      taskExtraction,
      deadlineDetection,
      decisionExtraction,
      askChat,
      assistant,
      documentAnalysis,
      meetingMode,
      semanticSearch,
      studyMode,
      analytics,
    } = req.body;

    const updates = {};
    if (typeof excludeMyMessages === 'boolean') updates['aiSettings.excludeMyMessages'] = excludeMyMessages;
    if (typeof redactionEnabled === 'boolean') updates['aiSettings.redactionEnabled'] = redactionEnabled;
    if (typeof retentionDays === 'number') updates['aiSettings.retentionDays'] = retentionDays;
    if (typeof summaries === 'boolean') updates['aiSettings.summaries'] = summaries;
    if (typeof taskExtraction === 'boolean') updates['aiSettings.taskExtraction'] = taskExtraction;
    if (typeof deadlineDetection === 'boolean') updates['aiSettings.deadlineDetection'] = deadlineDetection;
    if (typeof decisionExtraction === 'boolean') updates['aiSettings.decisionExtraction'] = decisionExtraction;
    if (typeof askChat === 'boolean') updates['aiSettings.askChat'] = askChat;
    if (typeof assistant === 'boolean') updates['aiSettings.assistant'] = assistant;
    if (typeof documentAnalysis === 'boolean') updates['aiSettings.documentAnalysis'] = documentAnalysis;
    if (typeof meetingMode === 'boolean') updates['aiSettings.meetingMode'] = meetingMode;
    if (typeof semanticSearch === 'boolean') updates['aiSettings.semanticSearch'] = semanticSearch;
    if (typeof studyMode === 'boolean') updates['aiSettings.studyMode'] = studyMode;
    if (typeof analytics === 'boolean') updates['aiSettings.analytics'] = analytics;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select('aiSettings');

    // Record consent log
    await AiConsent.create({
      user: req.user._id,
      scope: 'opt_out',
      newValue: String(excludeMyMessages),
    });

    return res.status(200).json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: { settings: updatedUser.aiSettings },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update conversation AI mode
 * PUT /api/ai/conversations/:id/mode
 */
export const updateConversationAiMode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mode } = req.body; // 'off' | 'on_demand' | 'auto'

    if (!['off', 'on_demand', 'auto'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid AI mode. Allowed: "off", "on_demand", "auto"',
        data: null,
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const userId = req.user._id.toString();
    const isMember = conversation.members?.some((m) => m.user?.toString() === userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this conversation',
        data: null,
      });
    }

    // Permissions: In group/room, require admin role; in direct, either member can switch off, but both must agree to turn on
    if (conversation.type !== 'direct') {
      const memberObj = conversation.members.find((m) => m.user?.toString() === userId);
      const isCreator = conversation.createdBy?.toString() === userId;
      if (memberObj?.role !== 'admin' && !isCreator) {
        return res.status(403).json({
          success: false,
          message: 'Only group admins can change the AI mode',
          data: null,
        });
      }
    }

    const prevMode = conversation.ai?.mode || 'off';
    conversation.ai = {
      mode,
      setBy: req.user._id,
      setAt: new Date(),
    };
    await conversation.save();

    // Log consent
    await AiConsent.create({
      user: req.user._id,
      conversation: conversation._id,
      scope: 'mode_change',
      previousValue: prevMode,
      newValue: mode,
    });

    // Create system message announcing AI mode change
    const userName = req.user.name || req.user.username || 'A member';
    const modeLabel = mode === 'off' ? 'turned off' : mode === 'on_demand' ? 'set to on-demand' : 'set to auto';
    await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      type: 'system',
      content: `🤖 ${userName} ${modeLabel} ConnectX AI for this conversation.`,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(conversation._id.toString()).emit('conversation:ai-mode', {
        conversationId: conversation._id.toString(),
        ai: conversation.ai,
        changedBy: req.user._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: `AI mode updated to "${mode}"`,
      data: { ai: conversation.ai },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle member opt-out for a specific conversation
 * PUT /api/ai/conversations/:id/opt-out
 */
export const toggleConversationOptOut = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { optOut } = req.body; // boolean

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const userIdStr = req.user._id.toString();
    const optOutList = (conversation.optOutMembers || []).map((m) => m.toString());

    if (optOut && !optOutList.includes(userIdStr)) {
      conversation.optOutMembers.push(req.user._id);
    } else if (!optOut && optOutList.includes(userIdStr)) {
      conversation.optOutMembers = conversation.optOutMembers.filter(
        (m) => m.toString() !== userIdStr
      );
    }

    await conversation.save();

    return res.status(200).json({
      success: true,
      message: optOut
        ? 'Your messages are now excluded from AI in this conversation'
        : 'Your messages are now included in AI for this conversation',
      data: {
        isOptedOut: Boolean(optOut),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get AI Activity Log for a conversation (never exposes message content)
 * GET /api/ai/conversations/:id/activity
 */
export const getConversationAiActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const activities = await AiActivity.find({ conversation: id })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('user', 'name username avatar')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'AI activity log retrieved',
      data: { activities },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Export user's AI-derived artifacts as JSON
 * GET /api/ai/data/export
 */
export const exportAiData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const reminders = await Reminder.find({ user: userId }).lean();
    const user = await User.findById(userId).select('aiSettings').lean();

    const exportBundle = {
      user: {
        id: userId,
        aiSettings: user?.aiSettings,
      },
      reminders,
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="connectx-ai-data.json"');
    return res.send(JSON.stringify(exportBundle, null, 2));
  } catch (err) {
    next(err);
  }
};

/**
 * Purge AI-derived data
 * DELETE /api/ai/data?conversationId=
 */
export const purgeAiData = async (req, res, next) => {
  try {
    const { conversationId } = req.query;
    const userId = req.user._id;

    if (conversationId) {
      // Purge reminders for this conversation
      await Reminder.deleteMany({ user: userId, conversation: conversationId });
      // Purge activities logged by this user for this conversation
      await AiActivity.deleteMany({ user: userId, conversation: conversationId });
    } else {
      // Purge all user's reminders and logs
      await Reminder.deleteMany({ user: userId });
      await AiActivity.deleteMany({ user: userId });
    }

    return res.status(200).json({
      success: true,
      message: 'AI data purged successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
