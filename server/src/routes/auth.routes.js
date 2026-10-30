import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  googleLogin,
  setPassword,
  getAuthProviders,
  unlinkGoogle,
  getMe,
  logout,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

const registerRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Display name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-z0-9_.]+$/i)
    .withMessage('Username can only contain letters, numbers, underscores, and dots'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const loginRules = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Please enter your email or username'),
  body('password')
    .notEmpty()
    .withMessage('Please enter your password'),
];

const googleLoginRules = [
  body('idToken')
    .isString()
    .notEmpty()
    .withMessage('Firebase ID token is required')
    .isLength({ max: 8192 })
    .withMessage('Invalid token length'),
];

const setPasswordRules = [
  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

// Public Auth routes
router.post('/register', authLimiter, validate(registerRules), register);
router.post('/login', authLimiter, validate(loginRules), login);
router.post('/google', authLimiter, validate(googleLoginRules), googleLogin);

// Protected Auth & Session routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.get('/providers', protect, getAuthProviders);
router.post('/set-password', protect, authLimiter, validate(setPasswordRules), setPassword);
router.post('/unlink-google', protect, authLimiter, unlinkGoogle);

export default router;
