import Reminder from '../models/reminder.model.js';

class ReminderScheduler {
  constructor() {
    this.intervalId = null;
    this.io = null;
    this.isProcessing = false;
  }

  /**
   * Start the reminder scheduler polling loop
   * @param {Object} socketIo Socket.IO server instance
   */
  start(socketIo) {
    this.io = socketIo;
    if (this.intervalId) return;

    // Check due reminders every 30 seconds
    this.intervalId = setInterval(() => {
      this.checkDueReminders();
    }, 30 * 1000);

    // Initial check on start
    setTimeout(() => {
      this.checkDueReminders();
    }, 3000);

    console.log('[ReminderScheduler] Started background scheduler (polling every 30s)');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[ReminderScheduler] Stopped');
    }
  }

  async checkDueReminders() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      // Find reminders ready to fire
      const dueReminders = await Reminder.find({
        status: { $in: ['pending', 'snoozed'] },
        remindAt: { $lte: now },
      })
        .limit(50)
        .populate('message', 'content isDeletedForEveryone')
        .populate('conversation', 'name type')
        .lean();

      for (const item of dueReminders) {
        // Atomic claim: only one server/process will succeed
        const claimed = await Reminder.findOneAndUpdate(
          {
            _id: item._id,
            status: { $in: ['pending', 'snoozed'] },
          },
          {
            $set: {
              status: 'fired',
              firedAt: new Date(),
            },
          },
          { new: true }
        )
          .populate('message', 'content')
          .populate('conversation', 'name type');

        if (claimed && this.io) {
          const userIdStr = claimed.user.toString();
          // Emit socket event to the user's personal room
          this.io.to(`user:${userIdStr}`).emit('reminder:due', {
            reminder: claimed,
          });
        }
      }
    } catch (err) {
      console.error('[ReminderScheduler Error]:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const reminderScheduler = new ReminderScheduler();
export default reminderScheduler;
