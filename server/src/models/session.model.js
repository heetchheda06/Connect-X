import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceLabel: {
      type: String,
      required: true,
      trim: true,
    },
    ipTruncated: {
      type: String,
      default: 'Unknown IP',
      trim: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// High-speed compound queries for active user sessions
sessionSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });
sessionSchema.index({ sid: 1, revokedAt: 1 });

export const Session = mongoose.model('Session', sessionSchema);
export default Session;

