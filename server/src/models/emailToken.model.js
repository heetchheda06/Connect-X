import mongoose from 'mongoose';

const emailTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['verify', 'reset', 'emailChange', 'deleteConfirm'],
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index auto-deletes expired tokens
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active tokens for a specific user and type
emailTokenSchema.index({ user: 1, type: 1, usedAt: 1 });
emailTokenSchema.index({ tokenHash: 1, type: 1 });

export const EmailToken = mongoose.model('EmailToken', emailTokenSchema);
export default EmailToken;

