import mongoose from 'mongoose';

const stickerPackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      default: 'ConnectX',
      trim: true,
    },
    isOfficial: {
      type: Boolean,
      default: false,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    cover: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const StickerPack = mongoose.model('StickerPack', stickerPackSchema);

const stickerSchema = new mongoose.Schema(
  {
    pack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StickerPack',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    emojis: {
      type: [String],
      default: [],
      index: true,
    },
    width: {
      type: Number,
      default: 512,
    },
    height: {
      type: Number,
      default: 512,
    },
  },
  {
    timestamps: true,
  }
);

export const Sticker = mongoose.model('Sticker', stickerSchema);

const userStickerStateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sticker',
      },
    ],
    recents: [
      {
        sticker: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Sticker',
          required: true,
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    savedPacks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StickerPack',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const UserStickerState = mongoose.model(
  'UserStickerState',
  userStickerStateSchema
);

export default {
  StickerPack,
  Sticker,
  UserStickerState,
};

