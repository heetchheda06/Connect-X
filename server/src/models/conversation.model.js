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

