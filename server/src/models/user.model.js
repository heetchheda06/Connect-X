import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const authProviderSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['local', 'google'],
      required: true,
    },
    providerId: {
      type: String,
      default: '',
    },
    linkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9_.]+$/, 'Username can only contain lowercase letters, numbers, underscores, and dots'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    // Optional in schema; required only for local password registration
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
      default: null,
    },
    authProviders: {
      type: [authProviderSchema],
      default: () => [{ provider: 'local' }],
    },
    googleUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    avatarSource: {
      type: String,
      enum: ['upload', 'google', 'generated'],
      default: 'generated',
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
      maxlength: [250, 'Bio cannot exceed 250 characters'],
    },
    status: {
      type: String,
      default: 'Hey there! I am using ConnectX.',
      maxlength: [100, 'Status cannot exceed 100 characters'],
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    aiSettings: {
      enabled: {
        type: Boolean,
        default: false,
      },
      preferredLanguage: {
        type: String,
        default: 'en',
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
      smartReplies: {
        type: Boolean,
        default: true,
      },
      autoTranslateConversations: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Conversation',
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only if password is set and modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method (returns false if account has no password, e.g. Google-only)
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON serialization (strip password)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model('User', userSchema);
export default User;
