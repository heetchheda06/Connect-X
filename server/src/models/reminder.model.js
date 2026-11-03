import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
      index: true,
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    note: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    remindAt: {
      type: Date,
      required: true,
      index: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    status: {
      type: String,
      enum: ['pending', 'fired', 'done', 'snoozed'],
      default: 'pending',
      index: true,
    },
    snoozedUntil: {
      type: Date,
      default: null,
    },
    firedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for scheduler queries
reminderSchema.index({ status: 1, remindAt: 1 });

export const Reminder = mongoose.model('Reminder', reminderSchema);
export default Reminder;
