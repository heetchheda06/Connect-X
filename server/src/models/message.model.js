import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: '',
    },
    size: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: '',
    },
    width: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
    provider: {
      type: String,
      default: null, // e.g. 'giphy', 'tenor'
    },
    providerId: {
      type: String,
      default: null,
    },
    posterUrl: {
      type: String,
      default: null, // video thumbnail poster
    },
    durationSec: {
      type: Number,
      default: 0,
    },
    waveform: {
      type: [Number],
      default: [],
    },
  },
  { _id: false }
);

const readReceiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const pollOptionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    voters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { _id: false }
);

const pollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: [300, 'Poll question cannot exceed 300 characters'],
    },
    options: {
      type: [pollOptionSchema],
      validate: [
        (opts) => opts.length >= 2 && opts.length <= 12,
        'Poll must have between 2 and 12 options',
      ],
    },
    allowMultiple: {
      type: Boolean,
      default: false,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { _id: false }
);

const callMetadataSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['voice', 'video'],
      required: true,
    },
    status: {
      type: String,
      enum: ['missed', 'ended', 'rejected', 'busy', 'failed'],
      default: 'ended',
    },
    durationSec: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const linkPreviewSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    siteName: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'text',
        'image',
        'video',
        'file',
        'voice',
        'ai_card',
        'system',
        'sticker',
        'gif',
        'poll',
        'call',
      ],
      default: 'text',
    },
    aiCard: {
      kind: {
        type: String,
        default: null,
      },
      payload: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },
    content: {
      type: String,
      default: '',
      trim: true,
      maxlength: [4000, 'Message content cannot exceed 4000 characters'],
    },
    attachment: {
      type: attachmentSchema,
      default: null,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    deliveredTo: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    readBy: {
      type: [readReceiptSchema],
      default: [],
    },
    deletedFor: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    // Message Actions & Extension properties
    edited: {
      at: {
        type: Date,
        default: null,
      },
    },
    forwarded: {
      type: Boolean,
      default: false,
    },
    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    reactions: {
      type: [reactionSchema],
      default: [],
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    expiresAt: {
      type: Date,
      default: null,
    },
    linkPreview: {
      type: linkPreviewSchema,
      default: null,
    },
    poll: {
      type: pollSchema,
      default: null,
    },
    call: {
      type: callMetadataSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for chat timelines
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, _id: -1 });
messageSchema.index({ starredBy: 1 });

// TTL Index: automatically removes messages when expiresAt is reached
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Message = mongoose.model('Message', messageSchema);
export default Message;
