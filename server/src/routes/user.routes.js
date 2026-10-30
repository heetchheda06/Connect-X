import express from 'express';
import {
  searchUsers,
  getUserById,
  updateProfile,
  uploadAvatar,
  checkUsernameAvailable,
  updateUsername,
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { avatarUpload } from '../config/multer.js';
import { authLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// Public / Debounced check for username availability
router.get('/username-available', authLimiter, checkUsernameAvailable);

// Protected routes (require valid JWT session)
router.use(protect);

router.get('/search', searchUsers);
router.get('/:id', getUserById);
router.put('/profile', updateProfile);
router.put('/username', updateUsername);

// Multer error handling wrapper for avatar upload
router.post(
  '/avatar',
  (req, res, next) => {
    avatarUpload.single('avatar')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Error uploading avatar image',
          data: null,
        });
      }
      next();
    });
  },
  uploadAvatar
);

export default router;
