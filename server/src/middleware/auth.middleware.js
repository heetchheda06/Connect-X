import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/user.model.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in to continue.',
        data: null,
      });
    }

    // Verify token
    const decoded = jwt.verify(token, env.jwtSecret);

    // Find active user
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account associated with this token no longer exists.',
        data: null,
      });
    }

    // Check tokenVersion to invalidate sessions on security events (password change, unlinking, takeover protection)
    const tokenVersionInToken = decoded.tokenVersion ?? 0;
    const userTokenVersion = user.tokenVersion ?? 0;
    if (tokenVersionInToken !== userTokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired or was revoked. Please log in again.',
        data: null,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        data: null,
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token. Access denied.',
      data: null,
    });
  }
};
