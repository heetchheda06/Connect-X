import mongoose from 'mongoose';

const aiConsentSchema = new mongoose.Schema(
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
    scope: {
      type: String,
      enum: ['mode_change', 'opt_out', 'opt_in', 'master_toggle'],
      required: true,
    },
    previousValue: {
      type: String,
      default: null,
    },
    newValue: {
      type: String,
      default: null,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const AiConsent = mongoose.model('AiConsent', aiConsentSchema);
export default AiConsent;
