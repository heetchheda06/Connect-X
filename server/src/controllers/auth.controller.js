import User from '../models/user.model.js';
import { generateToken } from '../utils/token.js';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin.js';
import { generateUniqueUsername } from '../services/usernameService.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, username, email, password } = req.body;

    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
        data: null,
      });
    }

    // Check if username already taken
    const existingUsername = await User.findOne({ username: normalizedUsername });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'This username is already taken. Please choose another one.',
        data: null,
      });
    }

    // Create user
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

    const token = generateToken(user._id, user.tokenVersion);

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
    const { identifier, password } = req.body;

    const normalizedIdentifier = identifier.toLowerCase().trim();

    // Query user by email OR username (case-insensitive) and explicitly include password
    const user = await User.findOne({
      $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username/email and password.',
        data: null,
      });
    }

    // If user has no password set (Google-only account), instruct them safely
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google sign-in. Continue with Google or set a password in Settings.',
        data: null,
      });
    }

    // Verify password hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username/email and password.',
        data: null,
      });
    }

    // Update presence
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, user.tokenVersion);

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
      // 401 with generic message, never log raw tokens
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Invalid or expired Google ID token.',
        data: null,
      });
    }

    // Verify required token claims
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

    // Lookup 3a: By googleUid (existing Google-linked user)
    let user = await User.findOne({ googleUid }).select('+password');

    if (user) {
      user.isOnline = true;
      user.lastSeen = new Date();

      // Refresh avatar only if avatarSource is 'google'
      if (user.avatarSource === 'google' && googlePicture && user.avatar !== googlePicture) {
        user.avatar = googlePicture;
      }

      await user.save({ validateBeforeSave: false });

      const token = generateToken(user._id, user.tokenVersion);
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

    // Lookup 3b: By email (Safe Linking Rule 4.4)
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

      const token = generateToken(user._id, user.tokenVersion);
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

    // Lookup 3c: No match -> create new user
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
      // In case of rare race condition on username collision
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
 * Set a password for an account (allows Google users to also log in with email/password)
 * POST /api/auth/set-password
 */
export const setPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
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

    user.password = password; // Hashed by pre('save') hook

    // Ensure 'local' provider is registered in authProviders
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

    // Guard: Prevent lockout
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

    // Invalidate old tokens and issue new token with bumped tokenVersion
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const token = generateToken(user._id, user.tokenVersion);

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
