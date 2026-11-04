import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getStickerPacks,
  getStickersInPack,
  getRecentsAndFavorites,
  favoriteSticker,
  unfavoriteSticker,
  recordStickerUsed,
} from '../controllers/sticker.controller.js';
import { getTrendingGifs, searchGifs } from '../services/gifService.js';
import { getLinkPreview } from '../services/linkPreviewService.js';

const router = express.Router();

router.use(authenticate);

// Sticker routes
router.get('/packs', getStickerPacks);
router.get('/packs/:id', getStickersInPack);
router.get('/recents', getRecentsAndFavorites);
router.post('/:id/favorite', favoriteSticker);
router.delete('/:id/favorite', unfavoriteSticker);
router.post('/:id/used', recordStickerUsed);

// GIF routes
router.get('/gifs/trending', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const gifs = await getTrendingGifs(limit, offset);
    return res.status(200).json({ success: true, data: { gifs } });
  } catch (err) {
    next(err);
  }
});

router.get('/gifs/search', async (req, res, next) => {
  try {
    const { q = '', limit = 20, offset = 0 } = req.query;
    const gifs = await searchGifs(q, limit, offset);
    return res.status(200).json({ success: true, data: { gifs } });
  } catch (err) {
    next(err);
  }
});

// Link preview route
router.get('/link-preview', async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }
    const preview = await getLinkPreview(url);
    return res.status(200).json({ success: true, data: { preview } });
  } catch (err) {
    next(err);
  }
});

export default router;
