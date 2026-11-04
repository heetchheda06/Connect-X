import mongoose from 'mongoose';
import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';
import Translation from '../models/translation.model.js';
import ConversationUserState from '../models/conversationUserState.model.js';
import Block from '../models/block.model.js';
import { assistantService } from '../services/ai/assistantService.js';
import { voiceService } from '../services/ai/voiceService.js';

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

    // 1. Fetch user state for clearedAt and starred messages
    const userState = await ConversationUserState.findOne({
      user: currentUserId,
      conversation: conversationId,
    }).lean();

    // 2. Fetch blocked users to exclude or collapse
    const blockedRecords = await Block.find({ blocker: currentUserId }).select('blocked').lean();
    const blockedSet = new Set(blockedRecords.map((b) => b.blocked.toString()));

    // 3. Build query: not deleted for current user
    const query = {
      conversation: conversationId,
      deletedFor: { $ne: currentUserId },
    };

    if (cursor) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    if (userState?.clearedAt) {
      if (userState.keepStarredOnClear) {
        query.$or = [
          { createdAt: { $gt: userState.clearedAt } },
          { starredBy: currentUserId },
        ];
      } else {
        query.createdAt = { $gt: userState.clearedAt };
      }
    }

    // Exclude expired disappearing messages
    query.$and = [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
    ];

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

    // Mask deleted-for-everyone messages, handle blocked sender filtering, and order chronologically
    const formattedMessages = messagesToReturn
      .filter((msg) => {
        // In direct chat, if current user blocked the sender, do not show messages sent by the blocked person
        if (conversation.type === 'direct' && blockedSet.has(msg.sender?._id?.toString())) {
          return false;
        }
        return true;
      })
      .map((msg) => {
        const isBlocked = blockedSet.has(msg.sender?._id?.toString());
        if (msg.isDeletedForEveryone) {
          return {
            ...msg,
            content: '🚫 This message was deleted',
            attachment: null,
            blockedSender: isBlocked,
          };
        }
        return {
          ...msg,
          blockedSender: isBlocked,
        };
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

    // Check group permissions (only admins can send)
    if (
      (conversation.type === 'group' || conversation.type === 'room') &&
      conversation.onlyAdminsCanSend
    ) {
      const currentMember = conversation.members.find(
        (m) => m.user.toString() === currentUserId.toString()
      );
      if (!currentMember || currentMember.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can send messages in this group',
          data: null,
        });
      }
    }

    const {
      aiCard = null,
      poll = null,
      call = null,
      linkPreview = null,
      mentions = [],
    } = req.body;

    if (!content.trim() && !attachment && !poll && !call) {
      return res.status(400).json({
        success: false,
        message: 'Message must contain either text content, attachment, poll, or call event',
        data: null,
      });
    }

    // Determine message type
    let determinedType = type;
    if (attachment && type === 'text') {
      if (attachment.mimeType?.startsWith('image/')) determinedType = 'image';
      else if (attachment.mimeType?.startsWith('video/')) determinedType = 'video';
      else if (attachment.mimeType?.startsWith('audio/')) determinedType = 'voice';
      else determinedType = 'file';
    } else if (poll) {
      determinedType = 'poll';
    } else if (call) {
      determinedType = 'call';
    }

    // Check block status for direct conversations
    let isRecipientBlocked = false;
    let recipientId = null;
    if (conversation.type === 'direct') {
      const otherMember = conversation.members.find(
        (m) => m.user.toString() !== currentUserId.toString()
      );
      if (otherMember) {
        recipientId = otherMember.user.toString();
        // Check if the other person has blocked current user
        const blockedExists = await Block.exists({
          blocker: recipientId,
          blocked: currentUserId,
        });
        if (blockedExists) {
          isRecipientBlocked = true;
        }
      }
    }

    // Calculate disappearing message expiration
    let expiresAt = null;
    if (conversation.disappearing?.durationSec) {
      expiresAt = new Date(Date.now() + conversation.disappearing.durationSec * 1000);
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: currentUserId,
      type: determinedType,
      content: content.trim(),
      attachment,
      aiCard: aiCard || null,
      poll: poll
        ? {
            ...poll,
            createdBy: currentUserId,
          }
        : null,
      call: call || null,
      linkPreview: linkPreview || null,
      mentions: mentions || [],
      expiresAt,
      replyTo: replyTo || null,
      deliveredTo: [currentUserId],
      readBy: [{ user: currentUserId, readAt: new Date() }],
    });

    // Update conversation lastMessage & member's lastReadMessage (only if not blocked by recipient)
    if (!isRecipientBlocked) {
      conversation.lastMessage = message._id;
    }
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
      if (isRecipientBlocked) {
        // If blocked, deliver socket event ONLY to sender's own devices (shows 1 tick sent)
        io.to(`user:${currentUserId.toString()}`).emit('message:new', {
          conversationId,
          message: populated,
        });
      } else {
        // Standard delivery to conversation room and members
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

        // Un-hide conversation for recipient members whose state was hidden
        const recipientUserIds = conversation.members
          .map((m) => m.user.toString())
          .filter((uid) => uid !== currentUserId.toString());

        if (recipientUserIds.length > 0) {
          ConversationUserState.updateMany(
            {
              conversation: conversationId,
              user: { $in: recipientUserIds },
              hidden: true,
            },
            { $set: { hidden: false } }
          ).catch(() => {});
        }
      }

      // In-chat AI Assistant trigger: Check for @connectx mention
      if (
        message.content?.toLowerCase().includes('@connectx') &&
        conversation.ai?.mode !== 'off'
      ) {
        setTimeout(() => {
          assistantService
            .handleInChatMention({
              message: populated,
              conversationId,
              senderId: currentUserId,
              socketIo: io,
            })
            .catch((err) => console.error('[Assistant Mention Error]:', err.message));
        }, 300);
      }

      // Automatic Voice Note Transcription trigger
      if (
        determinedType === 'voice' ||
        (attachment && attachment.mimeType?.startsWith('audio/'))
      ) {
        setTimeout(() => {
          voiceService
            .transcribeMessage({
              messageId: message._id,
              userId: currentUserId,
              socketIo: io,
            })
            .catch((err) => console.log('[Voice STT Background]:', err.message));
        }, 300);
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

      // Clean up any cached translations for deleted message
      await Translation.deleteMany({ message: message._id }).catch(() => {});

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

/**
 * Edit a message (sender only, within 15 minutes, text messages only)
 * PUT /api/messages/:id
 */
export const editMessage = async (req, res, next) => {
  try {
    const { id: messageId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty',
        data: null,
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        data: null,
      });
    }

    if (message.sender.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages',
        data: null,
      });
    }

    if (message.type !== 'text') {
      return res.status(400).json({
        success: false,
        message: 'Only text messages can be edited',
        data: null,
      });
    }

    if (message.isDeletedForEveryone) {
      return res.status(400).json({
        success: false,
        message: 'Deleted messages cannot be edited',
        data: null,
      });
    }

    // 15-minute edit window check
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > FIFTEEN_MINUTES_MS) {
      return res.status(400).json({
        success: false,
        message: 'Messages can only be edited within 15 minutes of sending',
        data: null,
      });
    }

    message.content = content.trim();
    message.edited = { at: new Date() };
    await message.save();

    // Invalidate cached translations
    await Translation.deleteMany({ message: message._id }).catch(() => {});

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

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${message.conversation}`).emit('message:edited', {
        conversationId: message.conversation,
        message: populated,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Message edited successfully',
      data: { message: populated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forward messages to up to 5 target conversations
 * POST /api/messages/forward
 */
export const forwardMessages = async (req, res, next) => {
  try {
    const { messageIds = [], targetConversationIds = [] } = req.body;
    const currentUserId = req.user._id;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one message ID is required',
        data: null,
      });
    }

    if (!Array.isArray(targetConversationIds) || targetConversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one target conversation ID is required',
        data: null,
      });
    }

    if (targetConversationIds.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'You can only forward messages to up to 5 conversations at once',
        data: null,
      });
    }

    const messages = await Message.find({
      _id: { $in: messageIds },
      isDeletedForEveryone: false,
    }).lean();

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid messages found to forward',
        data: null,
      });
    }

    const io = req.app.get('io');
    const forwardedResults = [];

    for (const targetConvId of targetConversationIds) {
      const conv = await Conversation.findById(targetConvId);
      if (!conv) continue;

      const isMember = conv.members.some(
        (m) => m.user.toString() === currentUserId.toString()
      );
      if (!isMember) continue;

      for (const srcMsg of messages) {
        let expiresAt = null;
        if (conv.disappearing?.durationSec) {
          expiresAt = new Date(Date.now() + conv.disappearing.durationSec * 1000);
        }

        const newMsg = await Message.create({
          conversation: targetConvId,
          sender: currentUserId,
          type: srcMsg.type,
          content: srcMsg.content || '',
          attachment: srcMsg.attachment || null,
          poll: srcMsg.poll
            ? {
                question: srcMsg.poll.question,
                options: srcMsg.poll.options.map((o) => ({
                  id: o.id,
                  text: o.text,
                  voters: [],
                })),
                allowMultiple: srcMsg.poll.allowMultiple,
                createdBy: currentUserId,
              }
            : null,
          forwarded: true,
          expiresAt,
          deliveredTo: [currentUserId],
          readBy: [{ user: currentUserId, readAt: new Date() }],
        });

        conv.lastMessage = newMsg._id;
        await conv.save();

        const populated = await Message.findById(newMsg._id).populate(
          'sender',
          '_id name username avatar isOnline lastSeen'
        );

        if (io) {
          io.to(`conversation:${targetConvId}`).emit('message:new', {
            conversationId: targetConvId,
            message: populated,
          });
          for (const member of conv.members) {
            io.to(`user:${member.user.toString()}`).emit('conversation:updated', {
              conversationId: targetConvId,
              lastMessage: populated,
              senderId: currentUserId.toString(),
            });
          }
        }

        forwardedResults.push(populated);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Forwarded ${messages.length} message(s) to ${targetConversationIds.length} chat(s)`,
      data: { count: forwardedResults.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Star or unstar a message
 * POST /api/messages/:id/star
 * DELETE /api/messages/:id/star
 */
export const starMessage = async (req, res, next) => {
  try {
    const { id: messageId } = req.params;
    const currentUserId = req.user._id;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { starredBy: currentUserId } },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Message starred',
      data: { messageId, isStarred: true },
    });
  } catch (error) {
    next(error);
  }
};

export const unstarMessage = async (req, res, next) => {
  try {
    const { id: messageId } = req.params;
    const currentUserId = req.user._id;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { $pull: { starredBy: currentUserId } },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Message unstarred',
      data: { messageId, isStarred: false },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all starred messages for current user
 * GET /api/messages/starred?conversationId=
 */
export const getStarredMessages = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { conversationId } = req.query;

    const query = {
      starredBy: currentUserId,
      deletedFor: { $ne: currentUserId },
      isDeletedForEveryone: false,
    };

    if (conversationId) {
      query.conversation = conversationId;
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .populate('sender', '_id name username avatar')
      .populate('conversation', '_id name type avatar')
      .lean();

    return res.status(200).json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add or toggle a reaction on a message
 * POST /api/messages/:id/reactions
 */
export const reactToMessage = async (req, res, next) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const currentUserId = req.user._id;

    if (!emoji || !emoji.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required',
        data: null,
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === currentUserId.toString()
    );

    if (existingIndex !== -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        // Same emoji toggles it off
        message.reactions.splice(existingIndex, 1);
      } else {
        // Different emoji replaces previous reaction
        message.reactions[existingIndex].emoji = emoji;
        message.reactions[existingIndex].at = new Date();
      }
    } else {
      // Add new reaction
      message.reactions.push({
        user: currentUserId,
        emoji,
        at: new Date(),
      });
    }

    await message.save();

    const populated = await Message.findById(messageId)
      .populate('reactions.user', '_id name username avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${message.conversation}`).emit('message:reaction', {
        messageId: message._id,
        conversationId: message.conversation,
        reactions: populated.reactions,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Reaction updated',
      data: {
        messageId: message._id,
        reactions: populated.reactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Pin or unpin a message inside a conversation (max 3 pinned messages)
 * POST /api/conversations/:id/pin-message
 * DELETE /api/conversations/:id/pin-message/:messageId
 */
export const pinMessageInConversation = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { messageId } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isMember = conversation.members.some(
      (m) => m.user.toString() === currentUserId.toString()
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const message = await Message.findById(messageId);
    if (!message || message.conversation.toString() !== conversationId) {
      return res.status(404).json({ success: false, message: 'Message not found in this chat' });
    }

    // Check already pinned
    const alreadyPinned = conversation.pinnedMessages.some(
      (p) => p.message.toString() === messageId.toString()
    );
    if (alreadyPinned) {
      return res.status(400).json({
        success: false,
        message: 'Message is already pinned in this conversation',
      });
    }

    if (conversation.pinnedMessages.length >= 3) {
      // Unpin oldest to maintain max 3
      conversation.pinnedMessages.shift();
    }

    conversation.pinnedMessages.push({
      message: messageId,
      pinnedBy: currentUserId,
      pinnedAt: new Date(),
    });
    await conversation.save();

    const populatedConv = await Conversation.findById(conversationId)
      .populate('pinnedMessages.message')
      .populate('pinnedMessages.pinnedBy', '_id name username avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('conversation:pinned-messages', {
        conversationId,
        pinnedMessages: populatedConv.pinnedMessages,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Message pinned',
      data: { pinnedMessages: populatedConv.pinnedMessages },
    });
  } catch (error) {
    next(error);
  }
};

export const unpinMessageInConversation = async (req, res, next) => {
  try {
    const { id: conversationId, messageId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    conversation.pinnedMessages = conversation.pinnedMessages.filter(
      (p) => p.message.toString() !== messageId.toString()
    );
    await conversation.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('conversation:pinned-messages', {
        conversationId,
        pinnedMessages: conversation.pinnedMessages,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Message unpinned',
      data: { pinnedMessages: conversation.pinnedMessages },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Vote in a poll
 * POST /api/messages/:id/vote
 */
export const votePoll = async (req, res, next) => {
  try {
    const { id: messageId } = req.params;
    const { optionId } = req.body;
    const currentUserId = req.user._id;

    if (!optionId) {
      return res.status(400).json({
        success: false,
        message: 'Option ID is required',
        data: null,
      });
    }

    const message = await Message.findById(messageId);
    if (!message || !message.poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll message not found',
        data: null,
      });
    }

    if (message.poll.closedAt) {
      return res.status(400).json({
        success: false,
        message: 'This poll is closed',
        data: null,
      });
    }

    const targetOpt = message.poll.options.find((o) => o.id === optionId);
    if (!targetOpt) {
      return res.status(404).json({
        success: false,
        message: 'Poll option not found',
        data: null,
      });
    }

    const uidStr = currentUserId.toString();
    const alreadyVotedTarget = targetOpt.voters.some((v) => v.toString() === uidStr);

    if (message.poll.allowMultiple) {
      if (alreadyVotedTarget) {
        // Toggle off
        targetOpt.voters = targetOpt.voters.filter((v) => v.toString() !== uidStr);
      } else {
        targetOpt.voters.push(currentUserId);
      }
    } else {
      // Single vote: remove from all options, then toggle selected
      for (const opt of message.poll.options) {
        opt.voters = opt.voters.filter((v) => v.toString() !== uidStr);
      }
      if (!alreadyVotedTarget) {
        targetOpt.voters.push(currentUserId);
      }
    }

    await message.save();

    const populated = await Message.findById(messageId).populate(
      'poll.options.voters',
      '_id name username avatar'
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${message.conversation}`).emit('message:poll-voted', {
        messageId: message._id,
        conversationId: message.conversation,
        poll: populated.poll,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Vote recorded',
      data: { poll: populated.poll },
    });
  } catch (error) {
    next(error);
  }
};

