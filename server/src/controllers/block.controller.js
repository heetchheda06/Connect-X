import Block from '../models/block.model.js';
import Report from '../models/report.model.js';
import Conversation from '../models/conversation.model.js';
import ConversationUserState from '../models/conversationUserState.model.js';
import User from '../models/user.model.js';

/**
 * Get list of blocked users for current user
 * GET /api/blocks
 */
export const getBlockedUsers = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const blocks = await Block.find({ blocker: currentUserId })
      .populate('blocked', '_id name username avatar bio status')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        blockedUsers: blocks.map((b) => ({
          blockId: b._id,
          user: b.blocked,
          blockedAt: b.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Block a user
 * POST /api/blocks/:userId
 * Optional body: { report: Boolean, deleteChat: Boolean, reason?: String, details?: String }
 */
export const blockUser = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { userId: targetUserId } = req.params;
    const { report = false, deleteChat = false, reason = 'other', details = '' } = req.body;

    if (targetUserId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself',
        data: null,
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User to block not found',
        data: null,
      });
    }

    // Upsert block record
    const block = await Block.findOneAndUpdate(
      { blocker: currentUserId, blocked: targetUserId },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true }
    );

    // If deleteChat is selected, hide and clear direct conversation for current user
    if (deleteChat) {
      const directKey = [currentUserId.toString(), targetUserId.toString()].sort().join('_');
      const directConv = await Conversation.findOne({ directKey });
      if (directConv) {
        await ConversationUserState.updateOne(
          { user: currentUserId, conversation: directConv._id },
          {
            $set: {
              hidden: true,
              clearedAt: new Date(),
              pinnedAt: null,
              archived: false,
            },
          },
          { upsert: true }
        );
      }
    }

    // If report is selected, create a report record
    if (report) {
      await Report.create({
        reporter: currentUserId,
        reportedUser: targetUserId,
        reason: ['spam', 'harassment', 'inappropriate', 'fraud', 'other'].includes(reason)
          ? reason
          : 'other',
        details: details.trim() || 'Reported upon blocking user',
      });
    }

    // Note: Do NOT emit block notifications to the blocked user (silent block)
    return res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      data: {
        blockId: block._id,
        blockedUserId: targetUserId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unblock a user
 * DELETE /api/blocks/:userId
 */
export const unblockUser = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { userId: targetUserId } = req.params;

    const result = await Block.deleteOne({
      blocker: currentUserId,
      blocked: targetUserId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User was not blocked',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User unblocked successfully',
      data: { unblockedUserId: targetUserId },
    });
  } catch (error) {
    next(error);
  }
};

