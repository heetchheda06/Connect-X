import ScheduledMessage from '../models/scheduledMessage.model.js';
import Conversation from '../models/conversation.model.js';

export const scheduleMessage = async (req, res, next) => {
  try {
    const { conversationId, content, scheduledFor, attachment, type = 'text' } = req.body;

    if (!conversationId || (!content?.trim() && !attachment) || !scheduledFor) {
      return res.status(400).json({
        success: false,
        message: 'conversationId, content or attachment, and scheduledFor date are required',
      });
    }

    const targetDate = new Date(scheduledFor);
    if (isNaN(targetDate.getTime()) || targetDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'scheduledFor must be a valid future date/time',
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const scheduled = await ScheduledMessage.create({
      user: req.user._id,
      conversation: conversationId,
      content: content ? content.trim() : '',
      attachment: attachment || null,
      type,
      scheduledFor: targetDate,
    });

    return res.status(201).json({
      success: true,
      data: scheduled,
      message: 'Message scheduled successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getScheduledMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.query;
    const query = { user: req.user._id, status: 'pending' };
    if (conversationId) query.conversation = conversationId;

    const messages = await ScheduledMessage.find(query).sort({ scheduledFor: 1 });

    return res.status(200).json({
      success: true,
      data: messages,
      message: 'Scheduled messages retrieved',
    });
  } catch (err) {
    next(err);
  }
};

export const cancelScheduledMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const msg = await ScheduledMessage.findOneAndUpdate(
      { _id: id, user: req.user._id, status: 'pending' },
      { status: 'cancelled' },
      { new: true }
    );

    if (!msg) {
      return res.status(404).json({ success: false, message: 'Scheduled message not found or already dispatched' });
    }

    return res.status(200).json({
      success: true,
      message: 'Scheduled message cancelled',
    });
  } catch (err) {
    next(err);
  }
};

