import User from '../models/user.model.js';
import storageService from '../services/storage.service.js';
import { isValidUsername } from '../services/usernameService.js';

/**
 * Search users by name or username
 * GET /api/users/search?q=
 */
export const searchUsers = async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const trimmedQuery = q.trim();

    if (!trimmedQuery) {
      return res.status(200).json({
        success: true,
        message: 'No query provided',
        data: { users: [] },
      });
    }

    // Escape special regex characters
    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ name: regex }, { username: regex }],
    })
      .select('_id name username avatar bio status isOnline lastSeen createdAt')
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      message: `Found ${users.length} user(s)`,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get public profile by User ID
 * GET /api/users/:id
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('_id name username avatar bio status isOnline lastSeen createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated user's profile
 * PUT /api/users/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, status, avatar } = req.body;
    const updates = {};

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Display name must be between 2 and 50 characters long',
          data: null,
        });
      }
      updates.name = trimmedName;
    }

    if (bio !== undefined) {
      if (bio.length > 250) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 250 characters',
          data: null,
        });
      }
      updates.bio = bio.trim();
    }

    if (status !== undefined) {
      if (status.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Status cannot exceed 100 characters',
          data: null,
        });
      }
      updates.status = status.trim();
    }

    if (avatar !== undefined) {
      updates.avatar = avatar;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload avatar image for authenticated user
 * POST /api/users/avatar
 */
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Please select an image.',
        data: null,
      });
    }

    const avatarUrl = storageService.getFileUrl(req.file.filename);

    // Persist to MongoDB GridFS so avatars survive Render restarts
    await storageService.persistToGridFS(req.file.filename, req.file.mimetype);

    // If user previously had a local avatar, delete it to keep storage clean
    if (req.user.avatar && req.user.avatar.startsWith('/uploads/')) {
      await storageService.deleteFile(req.user.avatar);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatar: avatarUrl } },
      { new: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Avatar image updated successfully!',
      data: {
        avatarUrl,
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check username availability
 * GET /api/users/username-available?u=
 */
export const checkUsernameAvailable = async (req, res, next) => {
  try {
    const { u = '' } = req.query;
    const username = u.toLowerCase().trim();

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username parameter "u" is required.',
        data: null,
      });
    }

    if (!isValidUsername(username)) {
      return res.status(200).json({
        success: true,
        message: 'Username format is invalid or name is reserved.',
        data: {
          available: false,
          username,
          reason: 'Must be 3-20 characters, lowercase letters, numbers, or underscores, and cannot be a reserved name.',
        },
      });
    }

    // Check collision in database
    const existing = await User.findOne({ username });
    if (existing) {
      const isCurrentUsers = req.user && existing._id.equals(req.user._id);
      return res.status(200).json({
        success: true,
        message: isCurrentUsers ? 'This is already your username' : 'Username is already taken',
        data: {
          available: Boolean(isCurrentUsers),
          username,
          reason: isCurrentUsers ? null : 'Username is already taken by another user',
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Username is available!',
      data: {
        available: true,
        username,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update username for authenticated user
 * PUT /api/users/username
 */
export const updateUsername = async (req, res, next) => {
  try {
    const { username } = req.body;
    const normalized = (username || '').toLowerCase().trim();

    if (!isValidUsername(normalized)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-20 characters long, lowercase letters, numbers, or underscores only, and cannot be a reserved name.',
        data: null,
      });
    }

    // Check if taken by another user
    const existing = await User.findOne({
      username: normalized,
      _id: { $ne: req.user._id },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This username is already taken. Please choose another one.',
        data: null,
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { username: normalized } },
      { new: true, runValidators: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Username updated successfully!',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};


