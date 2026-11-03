import mongoose from 'mongoose';

const threadMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'model', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    citations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const aiThreadSchema = new mongoose.Schema(
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
    title: {
      type: String,
      default: 'New Chat Thread',
    },
    messages: [threadMessageSchema],
  },
  {
    timestamps: true,
  }
);

export const AiThread = mongoose.model('AiThread', aiThreadSchema);
export default AiThread;
