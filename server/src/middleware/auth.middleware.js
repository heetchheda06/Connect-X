import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/user.model.js';
import sessionService from '../services/session.service.js';

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

    // 1. Verify token cryptographic signature
    const decoded = jwt.verify(token, env.jwtSecret);
    const userId = decoded.sub || decoded.id;

    // 2. Find active user
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account associated with this token no longer exists.',
        data: null,
      });
    }

    // Check if account is suspended/banned
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: user.bannedReason
          ? `Account suspended: ${user.bannedReason}`
          : 'Your account has been suspended for violating Community Guidelines.',
        data: null,
      });
    }

    // 3. Check tokenVersion
    const tokenVersionInToken = decoded.tv ?? decoded.tokenVersion ?? 0;
    const userTokenVersion = user.tokenVersion ?? 0;
    if (tokenVersionInToken !== userTokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired or was revoked. Please log in again.',
        data: null,
      });
    }

    // 4. Check session validity (if token has a sid)
    if (decoded.sid) {
      const sessionCheck = await sessionService.verifySession(decoded.sid, user._id);
      if (!sessionCheck.valid) {
        return res.status(401).json({
          success: false,
          message: 'Session has been revoked or expired. Please sign in again.',
          data: null,
        });
      }
      req.sid = decoded.sid;
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

export const authenticate = protect;

export const optionalAuth = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const userId = decoded.sub || decoded.id;
    const user = await User.findById(userId).select('-password');
    if (user && !user.isBanned) {
      req.user = user;
    }
  } catch (err) {
    // optional token invalid, ignore and proceed unauthenticated
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required to access this resource.',
      data: null,
    });
  }
  next();
};

export const requireModerator = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'moderator')) {
    return res.status(403).json({
      success: false,
      message: 'Moderator or Admin privileges required.',
      data: null,
    });
  }
  next();
};

export default protect;
