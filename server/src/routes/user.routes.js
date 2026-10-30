import express from 'express';
import {
  searchUsers,
  getUserById,
  updateProfile,
  uploadAvatar,
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { avatarUpload } from '../config/multer.js';

const router = express.Router();

// All user routes require authentication
router.use(protect);

router.get('/search', searchUsers);
router.get('/:id', getUserById);
router.put('/profile', updateProfile);

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

