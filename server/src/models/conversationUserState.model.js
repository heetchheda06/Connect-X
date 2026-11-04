import mongoose from 'mongoose';

const conversationUserStateSchema = new mongoose.Schema(
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
    clearedAt: {
      type: Date,
      default: null,
    },
    keepStarredOnClear: {
      type: Boolean,
      default: false,
    },
    hidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
    mutedUntil: {
      type: mongoose.Schema.Types.Mixed, // null | Date | 'forever'
      default: null,
    },
    markedUnread: {
      type: Boolean,
      default: false,
    },
    wallpaper: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring 1 state document per user per conversation
conversationUserStateSchema.index({ user: 1, conversation: 1 }, { unique: true });

// Compound index for querying a user's active/archived/hidden chat list
conversationUserStateSchema.index({ user: 1, hidden: 1, archived: 1 });
conversationUserStateSchema.index({ user: 1, pinnedAt: -1 });

export const ConversationUserState = mongoose.model(
  'ConversationUserState',
  conversationUserStateSchema
);
export default ConversationUserState;

