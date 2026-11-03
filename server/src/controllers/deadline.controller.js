import Deadline from '../models/deadline.model.js';
import Reminder from '../models/reminder.model.js';

export const listDeadlines = async (req, res, next) => {
  try {
    const { conversationId, status } = req.query;
    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'conversationId is required', data: null });
    }

    const query = { conversation: conversationId };
    if (status) query.status = status;

    const deadlines = await Deadline.find(query)
      .sort({ dueAt: 1 })
      .populate('sourceMessage', 'content sender')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Deadlines retrieved successfully',
      data: { deadlines },
    });
  } catch (err) {
    next(err);
  }
};

export const acceptDeadline = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { syncReminder = true } = req.body;

    const deadline = await Deadline.findById(id);
    if (!deadline) {
      return res.status(404).json({ success: false, message: 'Deadline not found', data: null });
    }

    deadline.status = 'accepted';

    // If syncReminder is true, automatically create a linked reminder for this deadline
    if (syncReminder && !deadline.syncedReminder) {
      const reminder = await Reminder.create({
        user: req.user._id,
        conversation: deadline.conversation,
        message: deadline.sourceMessage,
        note: `Deadline: ${deadline.title}`,
        remindAt: deadline.dueAt,
        status: 'pending',
      });
      deadline.syncedReminder = reminder._id;
    }

    await deadline.save();

    return res.status(200).json({
      success: true,
      message: 'Deadline accepted',
      data: { deadline },
    });
  } catch (err) {
    next(err);
  }
};
