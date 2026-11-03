import { reminderService } from '../services/ai/reminderService.js';

export const parseReminder = async (req, res, next) => {
  try {
    const { text, messageId } = req.body;
    const result = await reminderService.parseReminder({
      text,
      messageId,
      userId: req.user._id,
    });
    return res.status(200).json({
      success: true,
      message: 'Reminder parsed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const createReminder = async (req, res, next) => {
  try {
    const { conversationId, messageId, note, remindAt, timezone } = req.body;
    const reminder = await reminderService.createReminder({
      userId: req.user._id,
      conversationId,
      messageId,
      note,
      remindAt,
      timezone,
    });
    return res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: { reminder },
    });
  } catch (err) {
    next(err);
  }
};

export const listReminders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const reminders = await reminderService.listReminders({
      userId: req.user._id,
      status,
    });
    return res.status(200).json({
      success: true,
      message: 'Reminders retrieved successfully',
      data: { reminders },
    });
  } catch (err) {
    next(err);
  }
};

export const updateReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, minutes, hours, untilTomorrow } = req.body;

    let updated;
    if (action === 'snooze') {
      updated = await reminderService.snoozeReminder({
        reminderId: id,
        userId: req.user._id,
        minutes: Number(minutes) || 10,
        hours: Number(hours) || 0,
        untilTomorrow: Boolean(untilTomorrow),
      });
    } else if (action === 'done') {
      updated = await reminderService.markDone({
        reminderId: id,
        userId: req.user._id,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Supported: "snooze", "done"',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Reminder marked as ${action}`,
      data: { reminder: updated },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    await reminderService.deleteReminder({
      reminderId: id,
      userId: req.user._id,
    });
    return res.status(200).json({
      success: true,
      message: 'Reminder deleted successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
