import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastReadMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  { _id: false }
);

const pinnedMessageSchema = new mongoose.Schema(
  {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pinnedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group', 'room'],
      required: true,
      default: 'direct',
    },
    name: {
      type: String,
      trim: true,
      maxlength: [60, 'Conversation name cannot exceed 60 characters'],
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    members: {
      type: [memberSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Deterministic key for direct chats (e.g. "minUserId_maxUserId") to guarantee database-level uniqueness
    directKey: {
      type: String,
      sparse: true,
      unique: true,
    },
    // Disappearing messages per conversation (null = off, 86400 = 24h, 604800 = 7d, 7776000 = 90d)
    disappearing: {
      durationSec: {
        type: Number,
        default: null,
      },
      setBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      setAt: {
        type: Date,
        default: null,
      },
    },
    // Group invite link token
    inviteToken: {
      type: String,
      sparse: true,
      index: true,
      default: null,
    },
    // Group permissions
    onlyAdminsCanSend: {
      type: Boolean,
      default: false,
    },
    onlyAdminsCanEditInfo: {
      type: Boolean,
      default: false,
    },
    // Pinned messages in this conversation (max 3)
    pinnedMessages: {
      type: [pinnedMessageSchema],
      default: [],
      validate: [
        (val) => val.length <= 3,
        'Cannot pin more than 3 messages per conversation',
      ],
    },
    // AI Conversation Mode & Consent (Section 6)
    ai: {
      mode: {
        type: String,
        enum: ['off', 'on_demand', 'auto'],
        default: 'on_demand',
      },
      setBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      setAt: {
        type: Date,
        default: null,
      },
    },
    // Members who have opted out their messages from AI processing
    optOutMembers: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
conversationSchema.index({ 'members.user': 1, updatedAt: -1 });
conversationSchema.index({ isPublic: 1, type: 1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
