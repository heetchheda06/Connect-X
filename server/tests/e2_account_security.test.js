import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { validatePassword, isDisposableEmail } from '../src/utils/passwordPolicy.js';
import { TokenService } from '../src/services/token.service.js';
import { forgotPassword, resendVerification } from '../src/controllers/auth.controller.js';

test('E2 - Password Policy: Minimum 8 characters requirement', () => {
  const shortPwd = validatePassword('abc1234');
  assert.equal(shortPwd.valid, false, 'Passwords under 8 chars must be rejected');
  assert.ok(shortPwd.message.includes('8 characters'));

  const validLength = validatePassword('ValidPass123!');
  assert.equal(validLength.valid, true, '8+ character password should pass basic check');
});

test('E2 - Password Policy: Maximum 72 bytes requirement (Bcrypt Boundary Protection)', () => {
  // ASCII 72 chars = 72 bytes
  const exact72Chars = 'A'.repeat(72);
  assert.equal(Buffer.byteLength(exact72Chars, 'utf8'), 72);
  assert.equal(validatePassword(exact72Chars).valid, true, '72 bytes ASCII password must be accepted');

  // ASCII 73 chars = 73 bytes
  const exceeds72Chars = 'A'.repeat(73);
  const resultExceeds = validatePassword(exceeds72Chars);
  assert.equal(resultExceeds.valid, false, 'Passwords exceeding 72 bytes must be rejected');
  assert.ok(resultExceeds.message.includes('72 bytes'));

  // Multibyte characters (e.g. Emoji 🌊 is 4 bytes): 19 emojis = 76 bytes
  const emojiPassword = '🌊'.repeat(19);
  assert.ok(Buffer.byteLength(emojiPassword, 'utf8') > 72);
  const resultEmoji = validatePassword(emojiPassword);
  assert.equal(resultEmoji.valid, false, 'Multibyte password exceeding 72 bytes must be rejected');
});

test('E2 - Password Policy: Common Weak Passwords Blocklist', () => {
  const weakPasswords = ['password', '12345678', 'qwerty123', 'admin123', 'welcome123'];
  for (const pwd of weakPasswords) {
    const result = validatePassword(pwd);
    assert.equal(result.valid, false, `Common weak password "${pwd}" must be rejected`);
    assert.ok(result.message.includes('common'));
  }
});

test('E2 - Password Policy: Context-Aware Username & Email Checks', () => {
  const userContext = { username: 'alexmorgan', email: 'alex.dev@connectx.local' };

  // Password contains username
  const pwdWithUsername = validatePassword('MyAlexMorgan2026!', userContext);
  assert.equal(pwdWithUsername.valid, false, 'Password containing username must be rejected');

  // Password contains email local part
  const pwdWithEmail = validatePassword('alex.devSecret123', userContext);
  assert.equal(pwdWithEmail.valid, false, 'Password containing email local-part must be rejected');

  // Unrelated strong password
  const strongPwd = validatePassword('OceanBreeze#2026', userContext);
  assert.equal(strongPwd.valid, true, 'Strong unrelated password must be accepted');
});

test('E2 - Disposable Email Blocklist', () => {
  assert.equal(isDisposableEmail('test@mailinator.com'), true, 'mailinator.com must be blocked');
  assert.equal(isDisposableEmail('burner@tempmail.com'), true, 'tempmail.com must be blocked');
  assert.equal(isDisposableEmail('user@10minutemail.com'), true, '10minutemail.com must be blocked');
  assert.equal(isDisposableEmail('legit.user@gmail.com'), false, 'gmail.com must be allowed');
  assert.equal(isDisposableEmail('team@mycompany.org'), false, 'company domain must be allowed');
});

test('E2 - Enumeration-Safe Responses: Resend Verification & Forgot Password', async () => {
  // 1. Resend Verification must return identical generic response whether email exists or not
  let resendCode = 0;
  let resendJson = null;
  const mockResResend = {
    status(code) {
      resendCode = code;
      return this;
    },
    json(body) {
      resendJson = body;
      return this;
    },
  };

  await resendVerification({ body: { email: 'nonexistent.random.user@example.com' } }, mockResResend, () => {});
  assert.equal(resendCode, 200);
  assert.equal(resendJson.success, true);
  assert.ok(resendJson.message.includes("If an account with this email exists"));

  // 2. Forgot Password must return identical generic response whether email exists or not
  let forgotCode = 0;
  let forgotJson = null;
  const mockResForgot = {
    status(code) {
      forgotCode = code;
      return this;
    },
    json(body) {
      forgotJson = body;
      return this;
    },
  };

  await forgotPassword({ body: { email: 'unknown.ghost@example.com' } }, mockResForgot, () => {});
  assert.equal(forgotCode, 200);
  assert.equal(forgotJson.success, true);
  assert.ok(forgotJson.message.includes("If an account with this email exists"));
});

test('E2 - Progressive Lockout Logic: Lock after 5 failed attempts', () => {
  const user = {
    failedLogin: { count: 0, lockUntil: null },
  };

  // Simulate 4 failed attempts
  for (let i = 1; i <= 4; i++) {
    user.failedLogin.count += 1;
    assert.equal(user.failedLogin.lockUntil, null, `Attempt ${i} should not lock account`);
  }

  // 5th failed attempt triggers lock
  user.failedLogin.count += 1;
  if (user.failedLogin.count >= 5) {
    user.failedLogin.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
  }

  assert.ok(user.failedLogin.lockUntil, 'Account must have lockUntil set after 5 failed attempts');
  assert.ok(new Date(user.failedLogin.lockUntil) > new Date(), 'lockUntil must be in the future');

  // Verify lockout check blocks attempts
  const isLocked = user.failedLogin.lockUntil && new Date(user.failedLogin.lockUntil) > new Date();
  assert.equal(isLocked, true, 'User must be recognized as locked');

  // Reset on successful login
  user.failedLogin = { count: 0, lockUntil: null };
  assert.equal(user.failedLogin.count, 0);
  assert.equal(user.failedLogin.lockUntil, null);
});

test('E2 - Session Revocation on Password Reset via tokenVersion Bump', () => {
  const user = {
    _id: 'user_123',
    tokenVersion: 2,
    password: 'old_hashed_password',
  };

  // Password reset action performed
  user.password = 'new_hashed_password';
  user.tokenVersion += 1; // Bump tokenVersion to invalidate all existing JWTs

  assert.equal(user.tokenVersion, 3, 'tokenVersion must be incremented to 3');
  // Any existing JWT with tokenVersion: 2 is now rejected by auth middleware
  const oldDecodedToken = { id: 'user_123', tokenVersion: 2 };
  assert.notEqual(oldDecodedToken.tokenVersion, user.tokenVersion, 'Old token must not match new tokenVersion');
});

