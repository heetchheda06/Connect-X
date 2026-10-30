import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const generateToken = (userId, tokenVersion = 0) => {
  return jwt.sign(
    {
      id: userId,
      tokenVersion: tokenVersion ?? 0,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
};
