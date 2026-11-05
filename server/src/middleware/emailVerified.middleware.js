import { env } from '../config/env.js';

/**
 * Middleware that checks if email verification is required.
 * When enabled, unverified users cannot search users, start new chats, or create groups/rooms.
 */
export const requireEmailVerified = (req, res, next) => {
  if (!env.requireEmailVerification) {
    return next();
  }

  if (!req.user || !req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address to unlock this feature.',
      data: null,
      code: 'EMAIL_UNVERIFIED',
    });
  }

  next();
};

export default requireEmailVerified;

