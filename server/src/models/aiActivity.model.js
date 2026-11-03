import mongoose from 'mongoose';

const aiActivitySchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    feature: {
      type: String,
      required: true,
      enum: [
        'translation',
        'smart_replies',
        'tone_assist',
        'voice_transcription',
        'reminder_parse',
        'summary',
        'task_extraction',
        'deadline_detection',
        'decision_extraction',
        'ask_chat',
        'assistant',
        'document_analysis',
        'meeting_mode',
        'semantic_search',
        'study_mode',
        'analytics',
      ],
      index: true,
    },
    trigger: {
      type: String,
      enum: ['manual', 'auto'],
      default: 'manual',
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index for automatic retention (default 90 days, or configured in env)
aiActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AiActivity = mongoose.model('AiActivity', aiActivitySchema);
export default AiActivity;
