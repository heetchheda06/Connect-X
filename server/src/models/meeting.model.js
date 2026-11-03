import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const minutesSchema = new mongoose.Schema(
  {
    summary: {
      type: String,
      default: '',
    },
    topics: {
      type: [String],
      default: [],
    },
    decisions: {
      type: [String],
      default: [],
    },
    actionItems: [
      {
        task: { type: String, required: true },
        owner: { type: String, default: null },
        dueAt: { type: Date, default: null },
      },
    ],
    openQuestions: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    agenda: {
      type: String,
      default: '',
      trim: true,
    },
    mode: {
      type: String,
      enum: ['chat', 'audio', 'upload'],
      default: 'chat',
    },
    participants: [participantSchema],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['live', 'processing', 'ready', 'failed'],
      default: 'live',
      index: true,
    },
    minutes: {
      type: minutesSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

export const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
