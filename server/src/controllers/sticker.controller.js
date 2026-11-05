import { StickerPack, Sticker, UserStickerState } from '../models/sticker.model.js';

// Pre-defined official sticker assets (Self-hosted high-resolution local vector SVGs)
const OFFICIAL_PACKS_SEED = [
  {
    name: 'ConnectX Ocean Crew',
    author: 'ConnectX Official',
    isOfficial: true,
    cover: '/stickers/dolphin.svg',
    stickers: [
      {
        url: '/stickers/dolphin.svg',
        emojis: ['🐬', 'dolphin', 'happy', 'ocean'],
      },
      {
        url: '/stickers/whale.svg',
        emojis: ['🐳', 'whale', 'big', 'sea'],
      },
      {
        url: '/stickers/seal.svg',
        emojis: ['🦭', 'seal', 'cute', 'clap'],
      },
      {
        url: '/stickers/octopus.svg',
        emojis: ['🐙', 'octopus', 'tentacles', 'wave'],
      },
      {
        url: '/stickers/fish.svg',
        emojis: ['🐠', 'fish', 'color', 'swim'],
      },
      {
        url: '/stickers/crab.svg',
        emojis: ['🦀', 'crab', 'pinch', 'beach'],
      },
      {
        url: '/stickers/shark.svg',
        emojis: ['🦈', 'shark', 'swim', 'ocean'],
      },
      {
        url: '/stickers/wave.svg',
        emojis: ['🌊', 'wave', 'cool', 'surf'],
      },
      {
        url: '/stickers/turtle.svg',
        emojis: ['🐢', 'turtle', 'chill', 'sea'],
      },
      {
        url: '/stickers/sparkles.svg',
        emojis: ['✨', 'sparkles', 'magic', 'clean'],
      },
    ],
  },
  {
    name: 'Everyday Moods',
    author: 'ConnectX Official',
    isOfficial: true,
    cover: '/stickers/party.svg',
    stickers: [
      {
        url: '/stickers/party.svg',
        emojis: ['🎉', 'party', 'celebrate', 'woohoo'],
      },
      {
        url: '/stickers/fire.svg',
        emojis: ['🔥', 'fire', 'lit', 'awesome'],
      },
      {
        url: '/stickers/rocket.svg',
        emojis: ['🚀', 'rocket', 'launch', 'fast'],
      },
      {
        url: '/stickers/check.svg',
        emojis: ['✅', 'done', 'yes', 'approved'],
      },
      {
        url: '/stickers/hundred.svg',
        emojis: ['💯', '100', 'perfect', 'agree'],
      },
      {
        url: '/stickers/star.svg',
        emojis: ['🌟', 'star', 'shine', 'best'],
      },
      {
        url: '/stickers/thumbsup.svg',
        emojis: ['👍', 'thumbsup', 'ok', 'good'],
      },
      {
        url: '/stickers/clap.svg',
        emojis: ['👏', 'clap', 'bravo', 'congrats'],
      },
      {
        url: '/stickers/cool.svg',
        emojis: ['😎', 'cool', 'sunglasses'],
      },
      {
        url: '/stickers/joy.svg',
        emojis: ['😂', 'joy', 'lol', 'laugh'],
      },
      {
        url: '/stickers/mindblown.svg',
        emojis: ['🤯', 'mindblown', 'shock'],
      },
      {
        url: '/stickers/cat.svg',
        emojis: ['😻', 'cat', 'love', 'heart'],
      },
    ],
  },
];

/**
 * Ensures official sticker packs exist in the database with working local assets
 */
export async function ensureOfficialPacks() {
  const existing = await StickerPack.find({ isOfficial: true });
  const hasBrokenUrls = existing.some(
    (p) => (p.cover || '').includes('iconify') || (p.cover || '').includes('jsdelivr')
  );

  if (existing.length === 0 || hasBrokenUrls) {
    const oldPackIds = existing.map((p) => p._id);
    if (oldPackIds.length > 0) {
      await Sticker.deleteMany({ pack: { $in: oldPackIds } });
      await StickerPack.deleteMany({ _id: { $in: oldPackIds } });
    }

    for (const packData of OFFICIAL_PACKS_SEED) {
      const pack = await StickerPack.create({
        name: packData.name,
        author: packData.author,
        isOfficial: true,
        cover: packData.cover,
      });

      for (const st of packData.stickers) {
        await Sticker.create({
          pack: pack._id,
          url: st.url,
          emojis: st.emojis,
          width: 512,
          height: 512,
        });
      }
    }
  }
}

/**
 * Get all available sticker packs (official + user's saved packs)
 * GET /api/stickers/packs
 */
export const getStickerPacks = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    await ensureOfficialPacks();

    const officialPacks = await StickerPack.find({ isOfficial: true }).lean();
    const userPacks = await StickerPack.find({ owner: currentUserId }).lean();

    return res.status(200).json({
      success: true,
      data: {
        packs: [...officialPacks, ...userPacks],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all stickers inside a specific pack
 * GET /api/stickers/packs/:id
 */
export const getStickersInPack = async (req, res, next) => {
  try {
    const { id: packId } = req.params;

    const pack = await StickerPack.findById(packId).lean();
    if (!pack) {
      return res.status(404).json({ success: false, message: 'Sticker pack not found' });
    }

    const stickers = await Sticker.find({ pack: packId }).lean();

    return res.status(200).json({
      success: true,
      data: {
        pack,
        stickers,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's favorites and recent stickers
 * GET /api/stickers/recents
 */
export const getRecentsAndFavorites = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    let userState = await UserStickerState.findOne({ user: currentUserId })
      .populate('favorites')
      .populate('recents.sticker')
      .lean();

    if (!userState) {
      userState = {
        favorites: [],
        recents: [],
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        favorites: userState.favorites || [],
        recents: (userState.recents || []).map((r) => r.sticker).filter(Boolean),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Star / Favorite a sticker
 * POST /api/stickers/:id/favorite
 * DELETE /api/stickers/:id/favorite
 */
export const favoriteSticker = async (req, res, next) => {
  try {
    const { id: stickerId } = req.params;
    const currentUserId = req.user._id;

    await UserStickerState.findOneAndUpdate(
      { user: currentUserId },
      { $addToSet: { favorites: stickerId } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Sticker added to favorites',
      data: { stickerId, isFavorite: true },
    });
  } catch (error) {
    next(error);
  }
};

export const unfavoriteSticker = async (req, res, next) => {
  try {
    const { id: stickerId } = req.params;
    const currentUserId = req.user._id;

    await UserStickerState.findOneAndUpdate(
      { user: currentUserId },
      { $pull: { favorites: stickerId } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Sticker removed from favorites',
      data: { stickerId, isFavorite: false },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record a sticker used in chat to recents
 * POST /api/stickers/:id/used
 */
export const recordStickerUsed = async (req, res, next) => {
  try {
    const { id: stickerId } = req.params;
    const currentUserId = req.user._id;

    let state = await UserStickerState.findOne({ user: currentUserId });
    if (!state) {
      state = await UserStickerState.create({
        user: currentUserId,
        recents: [],
      });
    }

    // Remove if already in recents, then add to front
    state.recents = state.recents.filter(
      (r) => r.sticker?.toString() !== stickerId.toString()
    );
    state.recents.unshift({ sticker: stickerId, usedAt: new Date() });

    // Keep max 30 recents
    if (state.recents.length > 30) {
      state.recents = state.recents.slice(0, 30);
    }

    await state.save();

    return res.status(200).json({
      success: true,
      data: { recorded: true },
    });
  } catch (error) {
    next(error);
  }
};

