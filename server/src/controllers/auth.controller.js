import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { generateToken } from '../utils/token.js';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin.js';
import { generateUniqueUsername } from '../services/usernameService.js';
import { TokenService } from '../services/token.service.js';
import { emailService } from '../services/emailService.js';
import sessionService from '../services/session.service.js';
import { env } from '../config/env.js';
import {
  validatePassword,
  isDisposableEmail,
  verifyTurnstileToken,
} from '../utils/passwordPolicy.js';
import logger from '../utils/logger.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, username, email, password, turnstileToken } = req.body;

    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Optional Cloudflare Turnstile CAPTCHA check
    const isCaptchaValid = await verifyTurnstileToken(turnstileToken, req.ip);
    if (!isCaptchaValid) {
      return res.status(400).json({
        success: false,
        message: 'Security verification failed. Please refresh and try again.',
        data: null,
      });
    }

    // 2. Disposable Email Blocklist
    if (isDisposableEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Disposable or temporary email addresses are not permitted. Please use a permanent email address.',
        data: null,
      });
    }

    // 3. Password Policy Validation (8-72 bytes, not common, not matching email/username)
    const pwdValidation = validatePassword(password, {
      username: normalizedUsername,
      email: normalizedEmail,
    });
    if (!pwdValidation.valid) {
      return res.status(400).json({
        success: false,
        message: pwdValidation.message,
        data: null,
      });
    }

    // 4. Check if email already registered
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
        data: null,
      });
    }

    // 5. Check if username already taken
    const existingUsername = await User.findOne({ username: normalizedUsername });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'This username is already taken. Please choose another one.',
        data: null,
      });
    }

    // 6. Create user
    const user = await User.create({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      isOnline: true,
      lastSeen: new Date(),
      authProviders: [{ provider: 'local', providerId: normalizedEmail, linkedAt: new Date() }],
      emailVerified: false,
      tokenVersion: 0,
      avatarSource: 'generated',
    });

    // 7. Enqueue verification email in background (valid 24 hours)
    try {
      const { token: verifyToken } = await TokenService.generateToken(user._id, 'verify', {}, 24 * 60);
      const verifyUrl = `${env.clientUrl}/verify-email?token=${verifyToken}`;
      await emailService.queueEmail({
        to: user.email,
        template: 'verifyEmail',
        data: { name: user.name, verifyUrl },
      });
    } catch (emailErr) {
      logger.warn({ err: emailErr.message }, 'Could not enqueue registration verification email');
    }

    // 8. Create active device session
    let sid = null;
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      const sessionResult = await sessionService.createSession({ user, userAgent, ip });
      sid = sessionResult.sid;
    } catch (sessionErr) {
      logger.warn({ err: sessionErr.message }, 'Could not create initial session record');
    }

    const token = generateToken(user._id, user.tokenVersion, sid);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to ConnectX.',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user via email or username + password
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { identifier, password, turnstileToken } = req.body;

    const normalizedIdentifier = identifier.toLowerCase().trim();

    // 1. Optional Cloudflare Turnstile check
    const isCaptchaValid = await verifyTurnstileToken(turnstileToken, req.ip);
    if (!isCaptchaValid) {
      return res.status(400).json({
        success: false,
        message: 'Security verification failed. Please refresh and try again.',
        data: null,
      });
    }

    // 2. Query user by email OR username (case-insensitive) and explicitly include password
    const user = await User.findOne({
      $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
    }).select('+password');

    // Timing-attack safe handling for non-existent users
    if (!user) {
      await bcrypt.compare(password, '$2a$10$e7mZ5a12345678901234567890123456789012345678901234567');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username/email and password.',
        data: null,
      });
    }

    // 3. Progressive Lockout Check
    if (user.failedLogin?.lockUntil && new Date(user.failedLogin.lockUntil) > new Date()) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((new Date(user.failedLogin.lockUntil) - new Date()) / (60 * 1000))
      );
      return res.status(429).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again after ${remainingMinutes} minute(s) or reset your password.`,
        data: null,
      });
    }

    // 4. If user has no password set (Google-only account)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google sign-in. Continue with Google or set a password in Settings.',
        data: null,
      });
    }

    // 5. Verify password hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const nextCount = (user.failedLogin?.count || 0) + 1;
      const isLocked = nextCount >= 5;

      user.failedLogin = {
        count: isLocked ? 0 : nextCount,
        lockUntil: isLocked ? new Date(Date.now() + 15 * 60 * 1000) : null,
      };
      await user.save({ validateBeforeSave: false });

      if (isLocked) {
        return res.status(429).json({
          success: false,
          message: 'Too many failed login attempts. Your account has been temporarily locked for 15 minutes. Please try again later or reset your password.',
          data: null,
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username/email and password.',
        data: null,
      });
    }

    // 6. Reset failed login counter on success
    if (user.failedLogin?.count > 0 || user.failedLogin?.lockUntil) {
      user.failedLogin = { count: 0, lockUntil: null };
    }

    // Update presence
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    // 8. Create active device session
    let sid = null;
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      const sessionResult = await sessionService.createSession({ user, userAgent, ip });
      sid = sessionResult.sid;
    } catch (sessionErr) {
      logger.warn({ err: sessionErr.message }, 'Could not create initial session record');
    }

    const token = generateToken(user._id, user.tokenVersion, sid);

    return res.status(200).json({
      success: true,
      message: 'Welcome back!',
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sign in or sign up using Firebase Google ID Token
 * POST /api/auth/google
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== 'string' || idToken.length > 8192) {
      return res.status(400).json({
        success: false,
        message: 'A valid Google ID token is required.',
        data: null,
      });
    }

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(idToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Invalid or expired Google ID token.',
        data: null,
      });
    }

    const email = decoded.email ? decoded.email.toLowerCase().trim() : null;
    const isEmailVerified = decoded.email_verified === true;
    const provider = decoded.firebase?.sign_in_provider;

    if (!email || !isEmailVerified || provider !== 'google.com') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Google account must have a verified email address.',
        data: null,
      });
    }

    const googleUid = decoded.uid;
    const googlePicture = decoded.picture || '';
    const googleName = decoded.name?.trim() || email.split('@')[0];

    // Lookup 1: By googleUid
    let user = await User.findOne({ googleUid }).select('+password');

    if (user) {
      user.isOnline = true;
      user.lastSeen = new Date();

      if (user.avatarSource === 'google' && googlePicture && user.avatar !== googlePicture) {
        user.avatar = googlePicture;
      }

      await user.save({ validateBeforeSave: false });

      // 8. Create active device session
    let sid = null;
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      const sessionResult = await sessionService.createSession({ user, userAgent, ip });
      sid = sessionResult.sid;
    } catch (sessionErr) {
      logger.warn({ err: sessionErr.message }, 'Could not create initial session record');
    }

    const token = generateToken(user._id, user.tokenVersion, sid);
      return res.status(200).json({
        success: true,
        message: 'Welcome back!',
        data: {
          user: user.toJSON(),
          token,
          isNewUser: false,
        },
      });
    }

    // Lookup 2: By email (Safe Linking Rule)
    user = await User.findOne({ email }).select('+password');

    if (user) {
      if (!user.emailVerified) {
        // PRE-REGISTRATION TAKEOVER DEFENSE:
        // Existing local account with unverified email must have password wiped
        // and tokenVersion incremented to revoke attacker sessions.
        user.googleUid = googleUid;
        user.emailVerified = true;
        user.password = undefined; // Deletes password hash
        user.tokenVersion = (user.tokenVersion || 0) + 1;

        user.authProviders = [
          ...user.authProviders.filter((p) => p.provider !== 'google' && p.provider !== 'local'),
          { provider: 'google', providerId: googleUid, linkedAt: new Date() },
        ];

        if (!user.avatar && googlePicture) {
          user.avatar = googlePicture;
          user.avatarSource = 'google';
        }
      } else {
        // Account was previously verified: safe to link without wiping password
        user.googleUid = googleUid;
        const hasGoogle = user.authProviders.some((p) => p.provider === 'google');
        if (!hasGoogle) {
          user.authProviders.push({
            provider: 'google',
            providerId: googleUid,
            linkedAt: new Date(),
          });
        }
        if (!user.avatar && googlePicture) {
          user.avatar = googlePicture;
          user.avatarSource = 'google';
        }
      }

      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save({ validateBeforeSave: false });

      // 8. Create active device session
    let sid = null;
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      const sessionResult = await sessionService.createSession({ user, userAgent, ip });
      sid = sessionResult.sid;
    } catch (sessionErr) {
      logger.warn({ err: sessionErr.message }, 'Could not create initial session record');
    }

    const token = generateToken(user._id, user.tokenVersion, sid);
      return res.status(200).json({
        success: true,
        message: 'Google account linked and signed in successfully.',
        data: {
          user: user.toJSON(),
          token,
          isNewUser: false,
        },
      });
    }

    // Lookup 3: No match -> create new user
    const username = await generateUniqueUsername(email);
    const newUserData = {
      name: googleName,
      username,
      email,
      emailVerified: true,
      googleUid,
      avatar: googlePicture,
      avatarSource: googlePicture ? 'google' : 'generated',
      authProviders: [{ provider: 'google', providerId: googleUid, linkedAt: new Date() }],
      tokenVersion: 0,
      isOnline: true,
      lastSeen: new Date(),
    };

    let newUser;
    try {
      newUser = await User.create(newUserData);
    } catch (createErr) {
      if (createErr.code === 11000 && createErr.keyPattern?.username) {
        const retryUsername = await generateUniqueUsername(email);
        newUserData.username = retryUsername;
        newUser = await User.create(newUserData);
      } else {
        throw createErr;
      }
    }

    const token = generateToken(newUser._id, newUser.tokenVersion);
    return res.status(201).json({
      success: true,
      message: 'Account created with Google successfully! Welcome to ConnectX.',
      data: {
        user: newUser.toJSON(),
        token,
        isNewUser: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify user's email using token
 * POST /api/auth/verify-email
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
        data: null,
      });
    }

    const verification = await TokenService.verifyToken(token, 'verify');
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: 'This verification link is invalid or has expired. Please request a new one.',
        data: null,
      });
    }

    const user = verification.tokenDoc.user;
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
        data: null,
      });
    }

    user.emailVerified = true;
    await user.save();

    // Consume single-use token
    await TokenService.consumeToken(verification.tokenDoc._id);

    // Enqueue warm welcome email
    try {
      await emailService.queueEmail({
        to: user.email,
        template: 'welcome',
        data: { name: user.name },
      });
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You now have full access to ConnectX.',
      data: {
        user: user.toJSON ? user.toJSON() : user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification email (Enumeration-safe)
 * POST /api/auth/resend-verification
 */
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Generic enumeration-safe message
    const genericSuccess = {
      success: true,
      message: "If an account with this email exists and is not yet verified, we've sent a verification link.",
      data: null,
    };

    if (!email || typeof email !== 'string') {
      return res.status(200).json(genericSuccess);
    }

    if (mongoose.connection.readyState === 1) {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail });

      if (user && !user.emailVerified) {
        try {
          const { token: verifyToken } = await TokenService.generateToken(user._id, 'verify', {}, 24 * 60);
          const verifyUrl = `${env.clientUrl}/verify-email?token=${verifyToken}`;
          await emailService.queueEmail({
            to: user.email,
            template: 'verifyEmail',
            data: { name: user.name, verifyUrl },
          });
        } catch (err) {
          logger.error({ err: err.message }, 'Failed to resend verification email');
        }
      }
    }

    return res.status(200).json(genericSuccess);
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset (Enumeration-safe)
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email, turnstileToken } = req.body;

    const genericSuccess = {
      success: true,
      message: "If an account with this email exists, we've sent a password reset link.",
      data: null,
    };

    if (!email || typeof email !== 'string') {
      return res.status(200).json(genericSuccess);
    }

    // Optional turnstile check
    const isCaptchaValid = await verifyTurnstileToken(turnstileToken, req.ip);
    if (!isCaptchaValid) {
      return res.status(400).json({
        success: false,
        message: 'Security verification failed. Please refresh and try again.',
        data: null,
      });
    }

    if (mongoose.connection.readyState === 1) {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail }).select('+password');

      if (user) {
        try {
          // Valid for 30 minutes
          const { token: resetToken } = await TokenService.generateToken(user._id, 'reset', {}, 30);
          const resetUrl = `${env.clientUrl}/reset-password?token=${resetToken}`;
          await emailService.queueEmail({
            to: user.email,
            template: 'resetPassword',
            data: { name: user.name, resetUrl },
          });
        } catch (err) {
          logger.error({ err: err.message }, 'Failed to enqueue password reset email');
        }
      }
    }

    return res.status(200).json(genericSuccess);
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using token
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is required.',
        data: null,
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
        data: null,
      });
    }

    const verification = await TokenService.verifyToken(token, 'reset');
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: 'This password reset link is invalid or has expired. Please request a new one.',
        data: null,
      });
    }

    const user = verification.tokenDoc.user;
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
        data: null,
      });
    }

    // Validate password policy
    const pwdValidation = validatePassword(password, {
      username: user.username,
      email: user.email,
    });
    if (!pwdValidation.valid) {
      return res.status(400).json({
        success: false,
        message: pwdValidation.message,
        data: null,
      });
    }

    user.password = password; // Hashed by userSchema.pre('save')
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Revoke all existing sessions
    user.failedLogin = { count: 0, lockUntil: null };

    const hasLocal = user.authProviders.some((p) => p.provider === 'local');
    if (!hasLocal) {
      user.authProviders.push({
        provider: 'local',
        providerId: user.email,
        linkedAt: new Date(),
      });
    }

    await user.save();
    await TokenService.consumeToken(verification.tokenDoc._id);

    // Send notice that password changed
    try {
      await emailService.queueEmail({
        to: user.email,
        template: 'passwordChanged',
        data: { name: user.name, timestamp: new Date().toUTCString() },
      });
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. Please sign in with your new password.',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password for logged-in user
 * POST /api/auth/change-password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword, logoutOtherDevices = true } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
        data: null,
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
        data: null,
      });
    }

    // If user already had a password, verify current password
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required.',
          data: null,
        });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect current password.',
          data: null,
        });
      }
    }

    // Validate new password policy
    const pwdValidation = validatePassword(newPassword, {
      username: user.username,
      email: user.email,
    });
    if (!pwdValidation.valid) {
      return res.status(400).json({
        success: false,
        message: pwdValidation.message,
        data: null,
      });
    }

    user.password = newPassword;

    if (logoutOtherDevices) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    const hasLocal = user.authProviders.some((p) => p.provider === 'local');
    if (!hasLocal) {
      user.authProviders.push({
        provider: 'local',
        providerId: user.email,
        linkedAt: new Date(),
      });
    }

    await user.save();

    // Enqueue password changed security notice
    try {
      await emailService.queueEmail({
        to: user.email,
        template: 'passwordChanged',
        data: { name: user.name, timestamp: new Date().toUTCString() },
      });
    } catch (e) {}

    // Issue updated token for current session so user remains logged in
    // 8. Create active device session
    let sid = null;
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      const sessionResult = await sessionService.createSession({ user, userAgent, ip });
      sid = sessionResult.sid;
    } catch (sessionErr) {
      logger.warn({ err: sessionErr.message }, 'Could not create initial session record');
    }

    const token = generateToken(user._id, user.tokenVersion, sid);

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
      data: {
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request email change (Authenticated)
 * POST /api/auth/change-email
 */
export const changeEmail = async (req, res, next) => {
  try {
    const { newEmail, currentPassword, googleIdToken } = req.body;

    if (!newEmail || typeof newEmail !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid new email address is required.',
        data: null,
      });
    }

    const normalizedNewEmail = newEmail.toLowerCase().trim();

    if (isDisposableEmail(normalizedNewEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Disposable email addresses are not permitted.',
        data: null,
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
        data: null,
      });
    }

    if (user.email === normalizedNewEmail) {
      return res.status(400).json({
        success: false,
        message: 'The new email address cannot be the same as your current email.',
        data: null,
      });
    }

    // Check uniqueness
    const emailInUse = await User.findOne({ email: normalizedNewEmail });
    if (emailInUse) {
      return res.status(400).json({
        success: false,
        message: 'This email address is already in use by another account.',
        data: null,
      });
    }

    // Re-authenticate user
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change your email address.',
          data: null,
        });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect current password.',
          data: null,
        });
      }
    } else if (googleIdToken) {
      // Google-only account fresh re-auth check
      const decoded = await verifyFirebaseIdToken(googleIdToken);
      if (decoded.email !== user.email) {
        return res.status(401).json({
          success: false,
          message: 'Google re-authentication failed.',
          data: null,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide your current password or Google re-authentication.',
        data: null,
      });
    }

    // Generate single-use emailChange token (valid 1 hour)
    const { token: changeToken } = await TokenService.generateToken(
      user._id,
      'emailChange',
      { newEmail: normalizedNewEmail },
      60
    );

    const confirmUrl = `${env.clientUrl}/verify-email?token=${changeToken}&action=change`;

    // 1. Send confirmation link to NEW email address
    await emailService.queueEmail({
      to: normalizedNewEmail,
      template: 'emailChangeVerification',
      data: { name: user.name, newEmail: normalizedNewEmail, confirmUrl },
    });

    // 2. Send security notice to OLD email address
    await emailService.queueEmail({
      to: user.email,
      template: 'emailChangeNotice',
      data: { name: user.name, newEmail: normalizedNewEmail, timestamp: new Date().toUTCString() },
    });

    return res.status(200).json({
      success: true,
      message: 'A confirmation link has been sent to your new email address. Please click it within 1 hour to complete the change.',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm email change using token
 * POST /api/auth/confirm-email-change
 */
export const confirmEmailChange = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation token is required.',
        data: null,
      });
    }

    const verification = await TokenService.verifyToken(token, 'emailChange');
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: 'This email change link is invalid or has expired. Please submit a new request.',
        data: null,
      });
    }

    const newEmail = verification.tokenDoc.payload?.newEmail;
    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email change payload.',
        data: null,
      });
    }

    // Verify newEmail is still available
    const existing = await User.findOne({ email: newEmail });
    if (existing && existing._id.toString() !== verification.tokenDoc.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'This email address is now in use by another account.',
        data: null,
      });
    }

    const user = await User.findById(verification.tokenDoc.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
        data: null,
      });
    }

    user.email = newEmail;
    user.emailVerified = true;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Revoke other sessions
    await user.save();

    await TokenService.consumeToken(verification.tokenDoc._id);

    return res.status(200).json({
      success: true,
      message: 'Your email address has been updated successfully! Please sign in with your new email.',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set a password for an account (allows Google users to also log in with email/password)
 * POST /api/auth/set-password
 */
export const setPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
        data: null,
      });
    }

    const pwdValidation = validatePassword(password, {
      username: user.username,
      email: user.email,
    });
    if (!pwdValidation.valid) {
      return res.status(400).json({
        success: false,
        message: pwdValidation.message,
        data: null,
      });
    }

    user.password = password; // Hashed by pre('save') hook

    const hasLocal = user.authProviders.some((p) => p.provider === 'local');
    if (!hasLocal) {
      user.authProviders.push({
        provider: 'local',
        providerId: user.email,
        linkedAt: new Date(),
      });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password set successfully! You can now sign in using either email/password or Google.',
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get linked authentication providers for current user
 * GET /api/auth/providers
 */
export const getAuthProviders = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Authentication providers retrieved successfully.',
      data: {
        hasPassword: Boolean(user.password),
        hasGoogle: Boolean(user.googleUid),
        authProviders: user.authProviders || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unlink Google account (Only allowed if user has a password set)
 * POST /api/auth/unlink-google
 */
export const unlinkGoogle = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
        data: null,
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Cannot disconnect Google without setting a password first. Please set a password in Settings to prevent being locked out.',
        data: null,
      });
    }

    user.googleUid = undefined;
    user.authProviders = user.authProviders.filter((p) => p.provider !== 'google');

    if (user.avatarSource === 'google') {
      user.avatarSource = 'generated';
      user.avatar = '';
    }

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // 8. Create active device session
    let sid = null;
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      const sessionResult = await sessionService.createSession({ user, userAgent, ip });
      sid = sessionResult.sid;
    } catch (sessionErr) {
      logger.warn({ err: sessionErr.message }, 'Could not create initial session record');
    }

    const token = generateToken(user._id, user.tokenVersion, sid);

    return res.status(200).json({
      success: true,
      message: 'Google account disconnected successfully.',
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'User profile retrieved successfully',
    data: {
      user: req.user,
    },
  });
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });

      if (req.sid) {
        const io = req.app.get('io');
        await sessionService.revokeSession(req.sid, req.user._id, io);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Signed out successfully.',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active sessions for current user
 * GET /api/auth/sessions
 */
export const getSessions = async (req, res, next) => {
  try {
    const sessions = await sessionService.getUserSessions(req.user._id, req.sid);
    return res.status(200).json({
      success: true,
      message: 'Active sessions retrieved successfully.',
      data: {
        sessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke specific session by sid
 * DELETE /api/auth/sessions/:sid
 */
export const revokeSession = async (req, res, next) => {
  try {
    const { sid } = req.params;
    const io = req.app.get('io');
    const success = await sessionService.revokeSession(sid, req.user._id, io);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or already revoked.',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Session logged out successfully.',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke all other sessions except the current one
 * POST /api/auth/sessions/revoke-others
 */
export const revokeAllOtherSessions = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const count = await sessionService.revokeAllOtherSessions(req.sid, req.user._id, io);

    return res.status(200).json({
      success: true,
      message: `Successfully logged out of ${count} other device(s).`,
      data: {
        revokedCount: count,
      },
    });
  } catch (error) {
    next(error);
  }
};
