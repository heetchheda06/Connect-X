import mongoose from 'mongoose';

const scheduledMessageSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    content: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'voice', 'sticker'],
      default: 'text',
    },
    attachment: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

scheduledMessageSchema.index({ status: 1, scheduledFor: 1 });

export default mongoose.model('ScheduledMessage', scheduledMessageSchema);

