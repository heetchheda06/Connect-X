import mongoose from 'mongoose';
import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';

/**
 * Get paginated messages for a conversation
 * GET /api/conversations/:id/messages?cursor=&limit=
 */
export const getMessages = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { cursor, limit = 30 } = req.query;
    const currentUserId = req.user._id;
    const pageSize = Math.min(parseInt(limit, 10) || 30, 50);

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const isMember = conversation.members.some(
      (m) => m.user.toString() === currentUserId.toString()
    );

    if (!isMember && !conversation.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this conversation.',
        data: null,
      });
    }

    // Build query: not deleted for current user
    const query = {
      conversation: conversationId,
      deletedFor: { $ne: currentUserId },
    };

    if (cursor) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const rawMessages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(pageSize + 1)
      .populate('sender', '_id name username avatar isOnline lastSeen')
      .populate({
        path: 'replyTo',
        select: '_id content type attachment sender isDeletedForEveryone',
        populate: {
          path: 'sender',
          select: '_id name username avatar',
        },
      })
      .lean();

    const hasMore = rawMessages.length > pageSize;
    const messagesToReturn = hasMore ? rawMessages.slice(0, pageSize) : rawMessages;
    const nextCursor = hasMore ? messagesToReturn[messagesToReturn.length - 1]._id : null;

    // Mask deleted-for-everyone messages and order chronologically (oldest -> newest)
    const formattedMessages = messagesToReturn
      .map((msg) => {
        if (msg.isDeletedForEveryone) {
          return {
            ...msg,
            content: '🚫 This message was deleted',
            attachment: null,
          };
        }
        return msg;
      })
      .reverse();

    return res.status(200).json({
      success: true,
      message: 'Messages fetched successfully',
      data: {
        messages: formattedMessages,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a new message
 * POST /api/conversations/:id/messages
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { content = '', type = 'text', attachment = null, replyTo = null } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    const isMember = conversation.members.some(
      (m) => m.user.toString() === currentUserId.toString()
    );

    if (!isMember) {
      // If it's a public room, auto-join
      if (conversation.isPublic) {
        conversation.members.push({
          user: currentUserId,
          role: 'member',
          joinedAt: new Date(),
        });
      } else {
        return res.status(403).json({
          success: false,
          message: 'You cannot send messages to a conversation you are not a member of',
          data: null,
        });
      }
    }

    if (!content.trim() && !attachment) {
      return res.status(400).json({
        success: false,
        message: 'Message must contain either text content or an attachment',
        data: null,
      });
    }

    // Determine message type
    let determinedType = type;
    if (attachment && type === 'text') {
      determinedType = attachment.mimeType?.startsWith('image/') ? 'image' : 'file';
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: currentUserId,
      type: determinedType,
      content: content.trim(),
      attachment,
      replyTo: replyTo || null,
      deliveredTo: [currentUserId],
      readBy: [{ user: currentUserId, readAt: new Date() }],
    });

    // Update conversation lastMessage & member's lastReadMessage
    conversation.lastMessage = message._id;
    const memberIndex = conversation.members.findIndex(
      (m) => m.user.toString() === currentUserId.toString()
    );
    if (memberIndex !== -1) {
      conversation.members[memberIndex].lastReadMessage = message._id;
    }
    await conversation.save();

    const populated = await Message.findById(message._id)
      .populate('sender', '_id name username avatar isOnline lastSeen')
      .populate({
        path: 'replyTo',
        select: '_id content type attachment sender isDeletedForEveryone',
        populate: {
          path: 'sender',
          select: '_id name username avatar',
        },
      });

    // Broadcast live to Socket.IO room & member inboxes
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message:new', {
        conversationId,
        message: populated,
      });
      for (const member of conversation.members) {
        io.to(`user:${member.user.toString()}`).emit('conversation:updated', {
          conversationId,
          lastMessage: populated,
          senderId: currentUserId.toString(),
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: populated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark messages in conversation as read
 * POST /api/conversations/:id/read
 */
export const markMessagesAsRead = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        data: null,
      });
    }

    // Update member's lastReadMessage in conversation
    const member = conversation.members.find(
      (m) => m.user.toString() === currentUserId.toString()
    );

    if (member && conversation.lastMessage) {
      member.lastReadMessage = conversation.lastMessage;
      await conversation.save();
    }

    // Push current user to readBy for all unread messages
    const updateResult = await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: currentUserId },
        'readBy.user': { $ne: currentUserId },
      },
      {
        $addToSet: {
          readBy: { user: currentUserId, readAt: new Date() },
          deliveredTo: currentUserId,
        },
      }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message:read', {
        conversationId,
        userId: currentUserId.toString(),
        readAt: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      data: {
        readCount: updateResult.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a message (delete for me / delete for everyone)
 * DELETE /api/messages/:id?scope=me|everyone
 */
export const deleteMessage = async (req, res, next) => {
  try {
    const { id: messageId } = req.params;
    const { scope = 'me' } = req.query;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        data: null,
      });
    }

    if (scope === 'everyone') {
      // Only the sender can delete for everyone
      if (message.sender.toString() !== currentUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own messages for everyone',
          data: null,
        });
      }

      // Check 1-hour window limit
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const messageAge = Date.now() - new Date(message.createdAt).getTime();
      if (messageAge > ONE_HOUR_MS) {
        return res.status(400).json({
          success: false,
          message: 'Messages can only be deleted for everyone within 1 hour of sending',
          data: null,
        });
      }

      message.isDeletedForEveryone = true;
      message.deletedAt = new Date();
      message.content = '🚫 This message was deleted';
      message.attachment = null;
      await message.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`conversation:${message.conversation}`).emit('message:deleted', {
          messageId: message._id,
          conversationId: message.conversation,
          scope: 'everyone',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Message deleted for everyone',
        data: {
          messageId: message._id,
          conversationId: message.conversation,
          scope: 'everyone',
        },
      });
    }

    // Default: Delete for me
    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: currentUserId },
    });

    return res.status(200).json({
      success: true,
      message: 'Message deleted for you',
      data: {
        messageId: message._id,
        conversationId: message.conversation,
        scope: 'me',
      },
    });
  } catch (error) {
    next(error);
  }
};

