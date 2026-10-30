import presenceService from '../services/presence.service.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';

export const registerSocketHandlers = (io) => {
  // Store typing auto-stop timers in memory: Map<`${socketId}_${convId}`, NodeJS.Timeout>
  const typingTimers = new Map();

  io.on('connection', async (socket) => {
    const user = socket.user;
    const userId = user._id.toString();

    // 1. Join personal room for targeted alerts (e.g. conversation list updates)
    socket.join(`user:${userId}`);

    // 2. Register multi-device socket presence
    const { isFirstConnection } = await presenceService.addSocket(userId, socket.id);
    if (isFirstConnection) {
      io.emit('presence:update', {
        userId,
        isOnline: true,
      });
    }

    // 3. Automatically join all conversation rooms user belongs to
    try {
      const userConversations = await Conversation.find({
        'members.user': user._id,
      }).select('_id');

      for (const conv of userConversations) {
        socket.join(`conversation:${conv._id}`);
      }
    } catch (err) {
      console.error(`[Socket Error] Failed to join conversation rooms: ${err.message}`);
    }

    // ==================== EVENT: conversation:join ====================
    socket.on('conversation:join', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    // ==================== EVENT: conversation:leave ====================
    socket.on('conversation:leave', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // ==================== EVENT: typing:start ====================
    socket.on('typing:start', ({ conversationId }) => {
      if (!conversationId) return;

      const timerKey = `${socket.id}_${conversationId}`;
      if (typingTimers.has(timerKey)) {
        clearTimeout(typingTimers.get(timerKey));
      }

      socket.to(`conversation:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        name: user.name,
        username: user.username,
        isTyping: true,
      });

      // Automatically stop typing indicator after 3 seconds of inactivity
      const timer = setTimeout(() => {
        socket.to(`conversation:${conversationId}`).emit('typing:update', {
          conversationId,
          userId,
          isTyping: false,
        });
        typingTimers.delete(timerKey);
      }, 3000);

      typingTimers.set(timerKey, timer);
    });

    // ==================== EVENT: typing:stop ====================
    socket.on('typing:stop', ({ conversationId }) => {
      if (!conversationId) return;

      const timerKey = `${socket.id}_${conversationId}`;
      if (typingTimers.has(timerKey)) {
        clearTimeout(typingTimers.get(timerKey));
        typingTimers.delete(timerKey);
      }

      socket.to(`conversation:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        isTyping: false,
      });
    });

    // ==================== EVENT: message:send ====================
    socket.on('message:send', async (payload, callback) => {
      try {
        const { conversationId, content = '', type = 'text', attachment = null, replyTo = null } = payload;

        if (!conversationId || (!content.trim() && !attachment)) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Message content or attachment is required' });
          }
          return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Conversation not found' });
          }
          return;
        }

        // Determine online recipients for instant delivery status
        const onlineRecipientIds = [];
        for (const member of conversation.members) {
          const mId = member.user.toString();
          if (mId !== userId && presenceService.isUserOnline(mId)) {
            onlineRecipientIds.push(member.user);
          }
        }

        const deliveredTo = [user._id, ...onlineRecipientIds];
        const readBy = [{ user: user._id, readAt: new Date() }];

        // Create message in database
        const message = await Message.create({
          conversation: conversationId,
          sender: user._id,
          type: attachment && type === 'text'
            ? (attachment.mimeType?.startsWith('image/') ? 'image' : 'file')
            : type,
          content: content.trim(),
          attachment,
          replyTo: replyTo || null,
          deliveredTo,
          readBy,
        });

        // Update conversation lastMessage & member lastReadMessage
        conversation.lastMessage = message._id;
        const memberIdx = conversation.members.findIndex((m) => m.user.toString() === userId);
        if (memberIdx !== -1) {
          conversation.members[memberIdx].lastReadMessage = message._id;
        }
        await conversation.save();

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', '_id name username avatar isOnline lastSeen')
          .populate({
            path: 'replyTo',
            select: '_id content type attachment sender isDeletedForEveryone',
            populate: { path: 'sender', select: '_id name username avatar' },
          });

        // 1. Broadcast new message to conversation room
        io.to(`conversation:${conversationId}`).emit('message:new', {
          conversationId,
          message: populatedMessage,
        });

        // 2. Notify all conversation members' personal rooms to update conversation preview and unread counters
        for (const member of conversation.members) {
          const mId = member.user.toString();
          io.to(`user:${mId}`).emit('conversation:updated', {
            conversationId,
            lastMessage: populatedMessage,
            senderId: userId,
          });
        }

        // 3. Acknowledge sender
        if (typeof callback === 'function') {
          callback({ success: true, data: { message: populatedMessage } });
        }
      } catch (err) {
        console.error(`[Socket Error] message:send: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // ==================== EVENT: message:read ====================
    socket.on('message:read', async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const member = conversation.members.find((m) => m.user.toString() === userId);
        if (member && conversation.lastMessage) {
          member.lastReadMessage = conversation.lastMessage;
          await conversation.save();
        }

        const readAt = new Date();
        await Message.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: user._id },
            'readBy.user': { $ne: user._id },
          },
          {
            $addToSet: {
              readBy: { user: user._id, readAt },
              deliveredTo: user._id,
            },
          }
        );

        // Broadcast to conversation that user has read the messages
        io.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId,
          userId,
          readAt,
        });
      } catch (err) {
        console.error(`[Socket Error] message:read: ${err.message}`);
      }
    });

    // ==================== DISCONNECT ====================
    socket.on('disconnect', async () => {
      // Clear typing timeouts for this socket
      for (const [key, timer] of typingTimers.entries()) {
        if (key.startsWith(`${socket.id}_`)) {
          clearTimeout(timer);
          const convId = key.split('_')[1];
          socket.to(`conversation:${convId}`).emit('typing:update', {
            conversationId: convId,
            userId,
            isTyping: false,
          });
          typingTimers.delete(key);
        }
      }

      // Decrement presence socket counter
      const { isLastDisconnect, lastSeen } = await presenceService.removeSocket(userId, socket.id);
      if (isLastDisconnect) {
        io.emit('presence:update', {
          userId,
          isOnline: false,
          lastSeen,
        });
      }
    });
  });
};

export default registerSocketHandlers;

