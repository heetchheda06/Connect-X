import mongoose from 'mongoose';

const deadlineSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sourceMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    dueAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['suggested', 'accepted', 'dismissed'],
      default: 'suggested',
      index: true,
    },
    confidence: {
      type: Number,
      default: 0.8,
    },
    syncedReminder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reminder',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Deadline = mongoose.model('Deadline', deadlineSchema);
export default Deadline;
