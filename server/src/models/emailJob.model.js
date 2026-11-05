import mongoose from 'mongoose';

const emailJobSchema = new mongoose.Schema(
  {
    to: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
    },
    template: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    nextRunAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastError: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance index for atomic worker claims
emailJobSchema.index({ status: 1, nextRunAt: 1 });

export const EmailJob = mongoose.model('EmailJob', emailJobSchema);
export default EmailJob;

