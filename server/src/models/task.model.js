import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sourceMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueAt: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['suggested', 'open', 'done', 'dismissed'],
      default: 'suggested',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    confidence: {
      type: Number,
      default: 0.8,
    },
    origin: {
      type: String,
      enum: ['ai', 'manual'],
      default: 'ai',
    },
    completedAt: {
      type: Date,
      default: null,
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

export const Task = mongoose.model('Task', taskSchema);
export default Task;
