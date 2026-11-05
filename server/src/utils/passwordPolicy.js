import { env } from '../config/env.js';

// Top most common passwords to reject
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyuiop',
  'admin123',
  'welcome123',
  'letmein123',
  'connectx123',
  'iloveyou',
  'monkey123',
  'dragon123',
  'football123',
  'baseball123',
  'shadow123',
  'superman123',
  'trustno1',
  'changeme123',
]);

// Common disposable email domains to block at registration
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'dispostable.com',
  'getairmail.com',
  'throwawaymail.com',
  'maildrop.cc',
]);

/**
 * Validates a password against the ConnectX security policy:
 * - Minimum 8 characters
 * - Maximum 72 bytes (bcrypt truncation safety)
 * - Must not contain username or email local-part
 * - Must not be a common weak password
 *
 * @param {string} password
 * @param {object} context
 * @param {string} [context.username]
 * @param {string} [context.email]
 * @returns {{ valid: boolean, message?: string }}
 */
export function validatePassword(password, { username = '', email = '' } = {}) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  // Bcrypt operates on a maximum of 72 bytes
  const byteLength = Buffer.byteLength(password, 'utf8');
  if (byteLength > 72) {
    return {
      valid: false,
      message: 'Password cannot exceed 72 bytes in length (approximately 72 standard characters)',
    };
  }

  const lowerPwd = password.toLowerCase();

  // Common password check
  if (COMMON_PASSWORDS.has(lowerPwd)) {
    return { valid: false, message: 'This password is too common and easily guessed. Please choose a stronger password.' };
  }

  // Check if password contains username
  if (username && username.length >= 3 && lowerPwd.includes(username.toLowerCase())) {
    return { valid: false, message: 'Password cannot contain your username' };
  }

  // Check if password contains local-part of email
  if (email && email.includes('@')) {
    const localPart = email.split('@')[0].toLowerCase();
    if (localPart.length >= 3 && lowerPwd.includes(localPart)) {
      return { valid: false, message: 'Password cannot contain parts of your email address' };
    }
  }

  return { valid: true };
}

/**
 * Checks if an email address belongs to a known disposable email provider.
 * @param {string} email
 * @returns {boolean}
 */
export function isDisposableEmail(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Verifies a Cloudflare Turnstile token if TURNSTILE_SECRET is configured.
 * @param {string} token
 * @param {string} [remoteIp]
 * @returns {Promise<boolean>}
 */
export async function verifyTurnstileToken(token, remoteIp) {
  const secretKey = process.env.TURNSTILE_SECRET;
  if (!secretKey) return true; // Disabled if no secret configured

  if (!token) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) formData.append('remoteip', remoteIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    return false;
  }
}

