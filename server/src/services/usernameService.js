import crypto from 'crypto';
import User from '../models/user.model.js';

export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'support',
  'help',
  'connectx',
  'connectxai',
  'official',
  'system',
  'moderator',
  'mod',
  'security',
  'staff',
  'info',
  'contact',
  'billing',
  'service',
  'null',
  'undefined',
  'anonymous',
  'api',
  'auth',
  'login',
  'register',
  'settings',
]);

/**
 * Validates whether a username matches format rules and is not reserved
 */
export const isValidUsername = (username) => {
  if (!username || typeof username !== 'string') return false;
  const lower = username.toLowerCase().trim();
  if (lower.length < 3 || lower.length > 20) return false;
  if (!/^[a-z0-9_]+$/.test(lower)) return false;
  if (RESERVED_USERNAMES.has(lower)) return false;
  return true;
};

/**
 * Normalizes an email or string into a clean base username candidate (3-20 chars, a-z0-9_)
 */
export const deriveBaseUsername = (input) => {
  if (!input || typeof input !== 'string') {
    return 'user';
  }

  // If input is an email, take the local part before '@'
  const localPart = input.includes('@') ? input.split('@')[0] : input;

  // Lowercase and replace anything not [a-z0-9_] with '_'
  let cleaned = localPart
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_') // collapse consecutive underscores
    .replace(/^_+|_+$/g, ''); // trim leading/trailing underscores

  if (!cleaned || cleaned.length < 3) {
    cleaned = (cleaned + 'user').padEnd(3, '0');
  }

  if (cleaned.length > 20) {
    cleaned = cleaned.slice(0, 20).replace(/_+$/, '');
  }

  // If the result matches a reserved word, prefix with 'cx_'
  if (RESERVED_USERNAMES.has(cleaned)) {
    cleaned = `cx_${cleaned}`.slice(0, 20);
  }

  return cleaned;
};

/**
 * Generates a unique username derived from an email address
 * Checks against the User database for collisions and retries with random suffixes.
 */
export const generateUniqueUsername = async (email, checkCollisionFn = null) => {
  const base = deriveBaseUsername(email);

  // Default collision check queries MongoDB
  const isTaken = checkCollisionFn || (async (candidate) => {
    const existing = await User.exists({ username: candidate });
    return Boolean(existing);
  });

  // 1. Try the clean base directly if not reserved
  if (!RESERVED_USERNAMES.has(base) && !(await isTaken(base))) {
    return base;
  }

  // 2. Try with random 3-4 digit numeric suffixes
  const maxAttempts = 15;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const suffix = Math.floor(100 + Math.random() * 900).toString(); // 3-digit number
    const maxBaseLen = 20 - suffix.length - 1; // reserve space for '_' and suffix
    const trimmedBase = base.slice(0, Math.max(3, maxBaseLen)).replace(/_+$/, '');
    const candidate = `${trimmedBase}_${suffix}`;

    if (!RESERVED_USERNAMES.has(candidate) && !(await isTaken(candidate))) {
      return candidate;
    }
  }

  // 3. Fallback: random crypto hex suffix
  const hexSuffix = crypto.randomBytes(3).toString('hex'); // 6 chars
  const fallbackBase = base.slice(0, 13).replace(/_+$/, '');
  return `${fallbackBase}_${hexSuffix}`;
};

export default {
  RESERVED_USERNAMES,
  isValidUsername,
  deriveBaseUsername,
  generateUniqueUsername,
};
