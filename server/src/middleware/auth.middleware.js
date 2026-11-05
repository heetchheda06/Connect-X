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
export default protect;
