import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/user.model.js';

export const socketAuthMiddleware = async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('Authentication error: User account not found'));
    }

    // Verify tokenVersion to reject revoked/invalidated sessions
    const tokenVersionInToken = decoded.tokenVersion ?? 0;
    const userTokenVersion = user.tokenVersion ?? 0;
    if (tokenVersionInToken !== userTokenVersion) {
      return next(new Error('Authentication error: Session revoked. Please log in again'));
    }

    socket.user = user;
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid or expired token'));
  }
};

export default socketAuthMiddleware;
