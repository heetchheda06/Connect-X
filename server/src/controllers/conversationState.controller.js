import mongoose from 'mongoose';
import ConversationUserState from '../models/conversationUserState.model.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';

/**
 * Helper to ensure a ConversationUserState document exists for user & conversation
 */
async function getOrCreateUserState(userId, conversationId) {
  let state = await ConversationUserState.findOne({
    user: userId,
    conversation: conversationId,
  });
  if (!state) {
    state = await ConversationUserState.create({
      user: userId,
      conversation: conversationId,
    });
  }
  return state;
}

/**
 * Clear chat messages for the current user view
 * POST /api/conversations/:id/clear
 */
export const clearChat = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { keepStarred = false } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const state = await getOrCreateUserState(currentUserId, conversationId);
    state.clearedAt = new Date();
    state.keepStarredOnClear = !!keepStarred;
    state.markedUnread = false;
    await state.save();

    // Emit real-time sync to user's other devices
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${currentUserId.toString()}`).emit('conversation:cleared', {
        conversationId,
        clearedAt: state.clearedAt,
        keepStarredOnClear: state.keepStarredOnClear,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chat cleared successfully for your account',
      data: {
        conversationId,
        clearedAt: state.clearedAt,
        keepStarredOnClear: state.keepStarredOnClear,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete chat from current user's list
 * POST /api/conversations/:id/delete
 */
export const deleteChat = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { exitGroup = false } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    // For groups, if member is still in group and didn't confirm exit
    if (conversation.type === 'group' || conversation.type === 'room') {
      const isMember = conversation.members.some(
        (m) => m.user.toString() === currentUserId.toString()
      );
      if (isMember) {
        if (!exitGroup) {
          return res.status(400).json({
            success: false,
            message: 'You must exit the group before deleting it from your list',
            data: { requiresExit: true },
          });
        }
        // Remove user from group members
        conversation.members = conversation.members.filter(
          (m) => m.user.toString() !== currentUserId.toString()
        );
        await conversation.save();
      }
    }

    const state = await getOrCreateUserState(currentUserId, conversationId);
    state.hidden = true;
    state.clearedAt = new Date();
    state.pinnedAt = null;
    state.archived = false;
    state.markedUnread = false;
    await state.save();

    // Emit real-time sync to user's devices
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${currentUserId.toString()}`).emit('conversation:deleted', {
        conversationId,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chat deleted from your conversation list',
      data: { conversationId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive or unarchive chat
 * PUT /api/conversations/:id/archive
 */
export const toggleArchiveChat = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { archived } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const state = await getOrCreateUserState(currentUserId, conversationId);
    const newArchived = typeof archived === 'boolean' ? archived : !state.archived;
    state.archived = newArchived;
    if (newArchived) {
      // Archiving unpins a chat
      state.pinnedAt = null;
    }
    await state.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${currentUserId.toString()}`).emit('conversation:archived', {
        conversationId,
        archived: newArchived,
      });
    }

    return res.status(200).json({
      success: true,
      message: newArchived ? 'Chat archived' : 'Chat unarchived',
      data: {
        conversationId,
        archived: newArchived,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Pin or unpin chat (max 3 pinned chats per user)
 * PUT /api/conversations/:id/pin
 */
export const togglePinChat = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { pinned } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const state = await getOrCreateUserState(currentUserId, conversationId);
    const shouldPin = typeof pinned === 'boolean' ? pinned : !state.pinnedAt;

    if (shouldPin) {
      const pinnedCount = await ConversationUserState.countDocuments({
        user: currentUserId,
        pinnedAt: { $ne: null },
      });

      if (pinnedCount >= 3) {
        return res.status(400).json({
          success: false,
          message: 'You can only pin up to 3 chats. Unpin a chat to pin this one.',
          data: { limit: 3, currentCount: pinnedCount },
        });
      }

      state.pinnedAt = new Date();
      state.archived = false; // Cannot be pinned and archived simultaneously
    } else {
      state.pinnedAt = null;
    }

    await state.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${currentUserId.toString()}`).emit('conversation:pinned', {
        conversationId,
        pinned: shouldPin,
        pinnedAt: state.pinnedAt,
      });
    }

    return res.status(200).json({
      success: true,
      message: shouldPin ? 'Chat pinned to top' : 'Chat unpinned',
      data: {
        conversationId,
        pinned: shouldPin,
        pinnedAt: state.pinnedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mute chat notifications (8 hours, 1 week, forever, unmute)
 * PUT /api/conversations/:id/mute
 */
export const muteChat = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { duration } = req.body; // '8h' | '1w' | 'forever' | 'unmute'
    const currentUserId = req.user._id;

    const state = await getOrCreateUserState(currentUserId, conversationId);

    let mutedUntil = null;
    if (duration === '8h') {
      mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000);
    } else if (duration === '1w') {
      mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (duration === 'forever') {
      mutedUntil = 'forever';
    } else if (duration === 'unmute') {
      mutedUntil = null;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid mute duration. Choose 8h, 1w, forever, or unmute.',
        data: null,
      });
    }

    state.mutedUntil = mutedUntil;
    await state.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${currentUserId.toString()}`).emit('conversation:muted', {
        conversationId,
        mutedUntil,
      });
    }

    return res.status(200).json({
      success: true,
      message: mutedUntil ? 'Chat muted' : 'Chat unmuted',
      data: {
        conversationId,
        mutedUntil,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark chat as read or unread
 * PUT /api/conversations/:id/unread
 */
export const markUnread = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { unread = true } = req.body;
    const currentUserId = req.user._id;

    const state = await getOrCreateUserState(currentUserId, conversationId);
    state.markedUnread = !!unread;
    await state.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${currentUserId.toString()}`).emit('conversation:unread', {
        conversationId,
        markedUnread: state.markedUnread,
      });
    }

    return res.status(200).json({
      success: true,
      message: unread ? 'Marked as unread' : 'Marked as read',
      data: {
        conversationId,
        markedUnread: state.markedUnread,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set custom wallpaper for a conversation
 * PUT /api/conversations/:id/wallpaper
 */
export const setWallpaper = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { wallpaper = '' } = req.body;
    const currentUserId = req.user._id;

    const state = await getOrCreateUserState(currentUserId, conversationId);
    state.wallpaper = wallpaper;
    await state.save();

    return res.status(200).json({
      success: true,
      message: 'Wallpaper updated successfully',
      data: {
        conversationId,
        wallpaper: state.wallpaper,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export chat messages as formatted .txt file
 * GET /api/conversations/:id/export
 */
export const exportChat = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId)
      .populate('members.user', 'name username')
      .lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const state = await ConversationUserState.findOne({
      user: currentUserId,
      conversation: conversationId,
    }).lean();

    const query = {
      conversation: conversationId,
      deletedFor: { $ne: currentUserId },
      isDeletedForEveryone: false,
    };

    if (state?.clearedAt) {
      if (state.keepStarredOnClear) {
        query.$or = [{ createdAt: { $gt: state.clearedAt } }, { starredBy: currentUserId }];
      } else {
        query.createdAt = { $gt: state.clearedAt };
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(20000)
      .populate('sender', 'name username')
      .lean();

    const title =
      conversation.name ||
      conversation.members
        .map((m) => m.user?.name || m.user?.username)
        .filter(Boolean)
        .join(', ') ||
      'Chat';

    let txtContent = `========================================================\n`;
    txtContent += `ConnectX Chat Export: ${title}\n`;
    txtContent += `Exported on: ${new Date().toISOString()}\n`;
    txtContent += `Messages count: ${messages.length}\n`;
    txtContent += `========================================================\n\n`;

    for (const msg of messages) {
      const timestamp = new Date(msg.createdAt).toLocaleString();
      const senderName = msg.sender?.name || msg.sender?.username || 'Unknown';
      let content = msg.content || '';
      if (msg.attachment) {
        content = content ? `${content} <attachment: ${msg.attachment.name || msg.attachment.mimeType || 'file'}>` : `<attachment: ${msg.attachment.name || msg.attachment.mimeType || 'file'}>`;
      }
      if (msg.type === 'sticker') content = `<sticker>`;
      if (msg.type === 'gif') content = `<gif>`;
      if (msg.type === 'call') content = `<call: ${msg.call?.type || 'call'}>`;
      if (msg.type === 'poll') content = `<poll: ${msg.poll?.question || 'poll'}>`;

      txtContent += `[${timestamp}] ${senderName}: ${content}\n`;
    }

    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ConnectX_Chat_${safeTitle}_${Date.now()}.txt"`
    );
    return res.status(200).send(txtContent);
  } catch (error) {
    next(error);
  }
};

/**
 * Configure Disappearing Messages for a conversation
 * PUT /api/conversations/:id/disappearing
 */
export const updateDisappearingMessages = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { durationSec } = req.body; // null | 86400 (24h) | 604800 (7d) | 7776000 (90d)
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    // In groups, only admins can change disappearing messages
    if (conversation.type === 'group' || conversation.type === 'room') {
      const member = conversation.members.find(
        (m) => m.user.toString() === currentUserId.toString()
      );
      if (!member || member.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only group admins can change disappearing messages settings',
          data: null,
        });
      }
    }

    const validDurations = [null, 86400, 604800, 7776000];
    if (!validDurations.includes(durationSec)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid duration. Choose Off (null), 24 hours, 7 days, or 90 days.',
        data: null,
      });
    }

    conversation.disappearing = {
      durationSec,
      setBy: currentUserId,
      setAt: new Date(),
    };
    await conversation.save();

    // Human readable duration
    let durationLabel = 'Off';
    if (durationSec === 86400) durationLabel = '24 hours';
    if (durationSec === 604800) durationLabel = '7 days';
    if (durationSec === 7776000) durationLabel = '90 days';

    const currentUser = await User.findById(currentUserId).select('name username');
    const senderName = currentUser?.name || currentUser?.username || 'A member';

    const systemText = durationSec
      ? `${senderName} turned on disappearing messages: ${durationLabel}. New messages will disappear from this chat after ${durationLabel}.`
      : `${senderName} turned off disappearing messages.`;

    const systemMsg = await Message.create({
      conversation: conversationId,
      sender: currentUserId,
      type: 'system',
      content: systemText,
      deliveredTo: [currentUserId],
      readBy: [{ user: currentUserId, readAt: new Date() }],
    });

    const populatedMsg = await Message.findById(systemMsg._id).populate(
      'sender',
      '_id name username avatar'
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('conversation:disappearing', {
        conversationId,
        disappearing: conversation.disappearing,
        systemMessage: populatedMsg,
      });
      io.to(`conversation:${conversationId}`).emit('message:new', {
        conversationId,
        message: populatedMsg,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Disappearing messages set to ${durationLabel}`,
      data: {
        disappearing: conversation.disappearing,
        systemMessage: populatedMsg,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Global Chat Settings: Clear All Chats, Delete All Chats, Archive All Chats
 * POST /api/settings/chats/clear-all
 * POST /api/settings/chats/delete-all
 * POST /api/settings/chats/archive-all
 */
export const clearAllChats = async (req, res, next) => {
  try {
    const { keepStarred = false } = req.body;
    const currentUserId = req.user._id;

    // Find all conversations where current user is a member
    const userConvs = await Conversation.find({ 'members.user': currentUserId }).select('_id');
    const convIds = userConvs.map((c) => c._id);

    const now = new Date();
    await ConversationUserState.bulkWrite(
      convIds.map((cId) => ({
        updateOne: {
          filter: { user: currentUserId, conversation: cId },
          update: {
            $set: {
              clearedAt: now,
              keepStarredOnClear: !!keepStarred,
              markedUnread: false,
            },
          },
          upsert: true,
        },
      }))
    );

    return res.status(200).json({
      success: true,
      message: 'All chats cleared successfully',
      data: { clearedAt: now, count: convIds.length },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllChats = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const userConvs = await Conversation.find({ 'members.user': currentUserId }).select('_id');
    const convIds = userConvs.map((c) => c._id);

    const now = new Date();
    await ConversationUserState.bulkWrite(
      convIds.map((cId) => ({
        updateOne: {
          filter: { user: currentUserId, conversation: cId },
          update: {
            $set: {
              hidden: true,
              clearedAt: now,
              pinnedAt: null,
              archived: false,
              markedUnread: false,
            },
          },
          upsert: true,
        },
      }))
    );

    return res.status(200).json({
      success: true,
      message: 'All chats removed from your conversation list',
      data: { count: convIds.length },
    });
  } catch (error) {
    next(error);
  }
};

export const archiveAllChats = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const userConvs = await Conversation.find({ 'members.user': currentUserId }).select('_id');
    const convIds = userConvs.map((c) => c._id);

    await ConversationUserState.bulkWrite(
      convIds.map((cId) => ({
        updateOne: {
          filter: { user: currentUserId, conversation: cId },
          update: {
            $set: {
              archived: true,
              pinnedAt: null,
            },
          },
          upsert: true,
        },
      }))
    );

    return res.status(200).json({
      success: true,
      message: 'All chats moved to Archive',
      data: { count: convIds.length },
    });
  } catch (error) {
    next(error);
  }
};
