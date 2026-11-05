import ScheduledMessage from '../models/scheduledMessage.model.js';
import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';
import logger from '../utils/logger.js';

class MessageScheduler {
  constructor() {
    this.intervalId = null;
    this.io = null;
  }

  start(ioInstance) {
    this.io = ioInstance;
    if (this.intervalId) return;

    // Run every 20 seconds
    this.intervalId = setInterval(() => this.processPendingMessages(), 20000);
    logger.info('Scheduled messages processor started (20s interval)');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async processPendingMessages() {
    try {
      const now = new Date();
      const pending = await ScheduledMessage.find({
        status: 'pending',
        scheduledFor: { $lte: now },
      }).limit(50);

      if (!pending || pending.length === 0) return;

      for (const sm of pending) {
        try {
          const conversation = await Conversation.findById(sm.conversation);
          if (!conversation) {
            sm.status = 'failed';
            sm.failureReason = 'Conversation not found';
            await sm.save();
            continue;
          }

          // Create active message
          const msg = await Message.create({
            conversation: sm.conversation,
            sender: sm.user,
            type: sm.type,
            content: sm.content,
            attachment: sm.attachment,
            deliveredTo: [sm.user],
            readBy: [{ user: sm.user, readAt: new Date() }],
          });

          conversation.lastMessage = msg._id;
          await conversation.save();

          sm.status = 'sent';
          sm.sentAt = new Date();
          await sm.save();

          if (this.io) {
            const populated = await Message.findById(msg._id)
              .populate('sender', '_id name username avatar isOnline lastSeen')
              .populate('replyTo', '_id content type attachment sender isDeletedForEveryone');

            this.io.to(`conversation:${sm.conversation}`).emit('message:new', {
              conversationId: sm.conversation.toString(),
              message: populated,
            });

            for (const member of conversation.members) {
              this.io.to(`user:${member.user.toString()}`).emit('conversation:updated', {
                conversationId: sm.conversation.toString(),
                lastMessage: populated,
                senderId: sm.user.toString(),
              });
            }
          }
        } catch (err) {
          logger.error({ err, scheduledMessageId: sm._id }, 'Error dispatching scheduled message');
          sm.status = 'failed';
          sm.failureReason = err.message;
          await sm.save();
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Scheduled messages processor cycle error');
    }
  }
}

export const messageScheduler = new MessageScheduler();
export default messageScheduler;
