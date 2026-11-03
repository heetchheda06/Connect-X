import { z } from 'zod';
import Reminder from '../../models/reminder.model.js';
import Message from '../../models/message.model.js';
import User from '../../models/user.model.js';
import { llmService } from './llmService.js';
import { REMINDER_PARSE_PROMPT, wrapChatData } from './prompts.js';
import { env } from '../../config/env.js';

const reminderParseOutputSchema = z.object({
  remindAt: z.string().nullable().default(null),
  humanReadable: z.string().default(''),
  confidence: z.number().min(0).max(1).default(0.8),
  needsClarification: z.boolean().default(false),
  question: z.string().nullable().default(null),
});

export class ReminderService {
  /**
   * Parse natural language reminder query with message context and user timezone
   */
  async parseReminder({ text, messageId, userId }) {
    if (!text || !text.trim()) {
      const err = new Error('Reminder query text is required');
      err.status = 400;
      throw err;
    }

    const user = await User.findById(userId).select('aiSettings');
    const timezone = user?.aiSettings?.timezone || 'Asia/Kolkata';
    const now = new Date();

    let messageContext = '';
    if (messageId) {
      const msg = await Message.findById(messageId).select('content sender createdAt').populate('sender', 'name');
      if (msg && !msg.isDeletedForEveryone) {
        messageContext = `Referenced Message from ${msg.sender?.name || 'User'} (sent ${msg.createdAt}): "${msg.content}"`;
      }
    }

    const dataPayload = [
      `User Timezone: ${timezone}`,
      `Current Local Reference Time: ${now.toISOString()}`,
      `User Reminder Query: "${text.trim()}"`,
      messageContext,
    ]
      .filter(Boolean)
      .join('\n');

    const wrappedContext = wrapChatData(dataPayload, 'reminder_parse_request');
    const userPrompt = `Given the user query and context inside <chat_data>, calculate the exact target reminder time in ISO 8601 format.`;

    const result = await llmService.generateStructured({
      systemInstruction: REMINDER_PARSE_PROMPT,
      prompt: `${wrappedContext}\n\n${userPrompt}`,
      schema: reminderParseOutputSchema,
      modelTier: env.aiModelFast || env.aiModel,
      temperature: 0.2,
    });

    // Validate that the target date is valid, in the future, and under 1 year away
    if (result.remindAt) {
      const parsedDate = new Date(result.remindAt);
      if (isNaN(parsedDate.getTime())) {
        result.needsClarification = true;
        result.question = 'I could not determine a valid date. When would you like to be reminded?';
        result.remindAt = null;
      } else if (parsedDate < now) {
        result.needsClarification = true;
        result.question = 'That time appears to be in the past. Please specify a future time.';
        result.remindAt = null;
      } else {
        const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        if (parsedDate > oneYearFromNow) {
          result.needsClarification = true;
          result.question = 'Reminders cannot be scheduled more than 1 year in advance.';
          result.remindAt = null;
        }
      }
    }

    return {
      ...result,
      timezone,
    };
  }

  /**
   * Create a confirmed reminder
   */
  async createReminder({ userId, conversationId, messageId, note, remindAt, timezone }) {
    if (!remindAt) {
      const err = new Error('remindAt timestamp is required');
      err.status = 400;
      throw err;
    }

    const reminderDate = new Date(remindAt);
    if (isNaN(reminderDate.getTime())) {
      const err = new Error('Invalid remindAt timestamp');
      err.status = 400;
      throw err;
    }

    let resolvedNote = note?.trim() || '';
    if (!resolvedNote && messageId) {
      const msg = await Message.findById(messageId).select('content');
      if (msg?.content) {
        resolvedNote = msg.content.slice(0, 100);
      }
    }

    const reminder = await Reminder.create({
      user: userId,
      conversation: conversationId || null,
      message: messageId || null,
      note: resolvedNote,
      remindAt: reminderDate,
      timezone: timezone || 'Asia/Kolkata',
      status: 'pending',
    });

    return reminder;
  }

  /**
   * List user reminders with optional status filter
   */
  async listReminders({ userId, status }) {
    const query = { user: userId };
    if (status) {
      query.status = status;
    }
    const reminders = await Reminder.find(query)
      .sort({ remindAt: 1 })
      .populate('conversation', 'name type')
      .populate('message', 'content')
      .lean();

    return reminders;
  }

  /**
   * Snooze a reminder
   */
  async snoozeReminder({ reminderId, userId, minutes = 10, hours = 0, untilTomorrow = false }) {
    const reminder = await Reminder.findOne({ _id: reminderId, user: userId });
    if (!reminder) {
      const err = new Error('Reminder not found');
      err.status = 404;
      throw err;
    }

    let newRemindAt = new Date();
    if (untilTomorrow) {
      newRemindAt.setDate(newRemindAt.getDate() + 1);
      newRemindAt.setHours(9, 0, 0, 0);
    } else {
      const addedMs = (minutes * 60 + hours * 3600) * 1000;
      newRemindAt = new Date(Date.now() + (addedMs > 0 ? addedMs : 10 * 60 * 1000));
    }

    reminder.remindAt = newRemindAt;
    reminder.snoozedUntil = newRemindAt;
    reminder.status = 'snoozed';
    await reminder.save();

    return reminder;
  }

  /**
   * Mark reminder as done
   */
  async markDone({ reminderId, userId }) {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: reminderId, user: userId },
      { $set: { status: 'done' } },
      { new: true }
    );
    if (!reminder) {
      const err = new Error('Reminder not found');
      err.status = 404;
      throw err;
    }
    return reminder;
  }

  /**
   * Delete reminder
   */
  async deleteReminder({ reminderId, userId }) {
    const reminder = await Reminder.findOneAndDelete({ _id: reminderId, user: userId });
    if (!reminder) {
      const err = new Error('Reminder not found');
      err.status = 404;
      throw err;
    }
    return { success: true };
  }
}

export const reminderService = new ReminderService();
export default reminderService;
