import mongoose from 'mongoose';

const decisionSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [300, 'Decision text cannot exceed 300 characters'],
    },
    context: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Context cannot exceed 500 characters'],
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    agreedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    sourceMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    decidedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['proposed', 'confirmed', 'superseded', 'reversed'],
      default: 'proposed',
      index: true,
    },
    supersedes: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Decision',
      default: null,
    },
    supersededBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Decision',
      default: null,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    confidence: {
      type: Number,
      default: 0.8,
    },
    fingerprint: {
      type: String,
      index: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Decision = mongoose.model('Decision', decisionSchema);
export default Decision;
