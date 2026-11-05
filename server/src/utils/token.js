import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Signs a JWT with standard claims:
 * - sub / id: User ID
 * - sid: Session ID
 * - tv / tokenVersion: Token version
 *
 * @param {string} userId
 * @param {number} [tokenVersion=0]
 * @param {string} [sid=null]
 * @returns {string} JWT Token
 */
export const generateToken = (userId, tokenVersion = 0, sid = null) => {
  const payload = {
    sub: userId,
    id: userId,
    tv: tokenVersion ?? 0,
    tokenVersion: tokenVersion ?? 0,
  };

  if (sid) {
    payload.sid = sid;
  }

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};

export default generateToken;
