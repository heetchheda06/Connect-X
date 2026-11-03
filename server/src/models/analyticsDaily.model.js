import mongoose from 'mongoose';

const analyticsDailySchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    messagesCount: {
      type: Number,
      default: 0,
    },
    activeUsersCount: {
      type: Number,
      default: 0,
    },
    tasksCreated: {
      type: Number,
      default: 0,
    },
    tasksCompleted: {
      type: Number,
      default: 0,
    },
    decisionsMade: {
      type: Number,
      default: 0,
    },
    filesShared: {
      type: Number,
      default: 0,
    },
    medianResponseTimeSec: {
      type: Number,
      default: 0,
    },
    hourlyBuckets: {
      type: [Number],
      default: () => new Array(24).fill(0),
    },
  },
  {
    timestamps: true,
  }
);

analyticsDailySchema.index({ conversation: 1, date: 1 }, { unique: true });

export const AnalyticsDaily = mongoose.model('AnalyticsDaily', analyticsDailySchema);
export default AnalyticsDaily;
