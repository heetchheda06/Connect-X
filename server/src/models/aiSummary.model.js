import mongoose from 'mongoose';

const aiSummarySchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fromMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    toMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    style: {
      type: String,
      enum: ['brief', 'detailed'],
      default: 'brief',
    },
    headline: {
      type: String,
      default: '',
    },
    keyPoints: {
      type: [String],
      default: [],
    },
    decisions: {
      type: [String],
      default: [],
    },
    tasksForMe: {
      type: [String],
      default: [],
    },
    mentionsOfMe: {
      type: [String],
      default: [],
    },
    openQuestions: {
      type: [String],
      default: [],
    },
    sourceCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const AiSummary = mongoose.model('AiSummary', aiSummarySchema);
export default AiSummary;
