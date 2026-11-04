import { StickerPack, Sticker, UserStickerState } from '../models/sticker.model.js';

// Pre-defined official sticker assets (High-resolution, ultra-fast Cloudflare CDN Twemoji SVGs)
const OFFICIAL_PACKS_SEED = [
  {
    name: 'ConnectX Ocean Crew',
    author: 'ConnectX Official',
    isOfficial: true,
    cover: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f42c.svg',
    stickers: [
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f42c.svg',
        emojis: ['🐬', 'dolphin', 'happy', 'ocean'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f433.svg',
        emojis: ['🐳', 'whale', 'big', 'sea'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f9ad.svg',
        emojis: ['🦭', 'seal', 'cute', 'clap'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f419.svg',
        emojis: ['🐙', 'octopus', 'tentacles', 'wave'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f420.svg',
        emojis: ['🐠', 'fish', 'color', 'swim'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f980.svg',
        emojis: ['🦀', 'crab', 'pinch', 'beach'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f988.svg',
        emojis: ['🦈', 'shark', 'swim', 'ocean'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f30a.svg',
        emojis: ['🌊', 'wave', 'cool', 'surf'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f422.svg',
        emojis: ['🐢', 'turtle', 'chill', 'sea'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2728.svg',
        emojis: ['✨', 'sparkles', 'magic', 'clean'],
      },
    ],
  },
  {
    name: 'Everyday Moods',
    author: 'ConnectX Official',
    isOfficial: true,
    cover: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f389.svg',
    stickers: [
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f389.svg',
        emojis: ['🎉', 'party', 'celebrate', 'woohoo'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f525.svg',
        emojis: ['🔥', 'fire', 'lit', 'awesome'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f680.svg',
        emojis: ['🚀', 'rocket', 'launch', 'fast'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2705.svg',
        emojis: ['✅', 'done', 'yes', 'approved'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4af.svg',
        emojis: ['💯', '100', 'perfect', 'agree'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f31f.svg',
        emojis: ['🌟', 'star', 'shine', 'best'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f44d.svg',
        emojis: ['👍', 'thumbsup', 'ok', 'good'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f44f.svg',
        emojis: ['👏', 'clap', 'bravo', 'congrats'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f60e.svg',
        emojis: ['😎', 'cool', 'sunglasses'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f602.svg',
        emojis: ['😂', 'joy', 'lol', 'laugh'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f92f.svg',
        emojis: ['🤯', 'mindblown', 'shock'],
      },
      {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f63b.svg',
        emojis: ['😻', 'cat', 'love', 'heart'],
      },
    ],
  },
];

/**
 * Ensures official sticker packs exist in the database with working CDN assets
 */
export async function ensureOfficialPacks() {
  const existing = await StickerPack.find({ isOfficial: true });
  const hasBrokenUrls = existing.some((p) => (p.cover || '').includes('iconify'));

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

