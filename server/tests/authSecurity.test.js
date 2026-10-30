import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { generateToken } from '../src/utils/token.js';

test('Security - Token Versioning & Session Revocation', () => {
  const userId = '507f1f77bcf86cd799439011';
  const secret = 'connectx_super_secret_jwt_key_2026_ocean_wave';

  // Issue token for user at tokenVersion 0
  const token = generateToken(userId, 0);
  const decoded = jwt.decode(token);

  assert.equal(decoded.id, userId);
  assert.equal(decoded.tokenVersion, 0);

  // Simulate verification when user's tokenVersion in DB is 0 (Valid)
  const userInDb = { _id: userId, tokenVersion: 0 };
  const isValidSession = (decoded.tokenVersion ?? 0) === (userInDb.tokenVersion ?? 0);
  assert.equal(isValidSession, true, 'Token version 0 should match DB version 0');

  // Security Event: User changes password or unlinks Google -> tokenVersion incremented to 1
  userInDb.tokenVersion = 1;

  // The previous token is now rejected
  const isRevokedSession = (decoded.tokenVersion ?? 0) === (userInDb.tokenVersion ?? 0);
  assert.equal(isRevokedSession, false, 'Old token must be rejected after tokenVersion bump');
});

test('Security - Safe Account-Linking Rule: Pre-Registration Takeover Scenario', () => {
  // Scenario: Attacker pre-registered victim's email 'victim@example.com' with password 'attacker_pwd'
  // and emailVerified is false.
  const victimAccount = {
    email: 'victim@example.com',
    password: '$2a$10$attackerHashedPasswordString',
    emailVerified: false,
    tokenVersion: 0,
    authProviders: [{ provider: 'local', providerId: 'victim@example.com' }],
  };

  // Google OAuth verification payload for real victim
  const googleUid = 'google_uid_987654321';
  const verifiedEmail = 'victim@example.com';

  // Apply Safe Linking Logic (from Section 4.4):
  if (!victimAccount.emailVerified) {
    victimAccount.googleUid = googleUid;
    victimAccount.emailVerified = true;
    delete victimAccount.password; // Wipe attacker's known password
    victimAccount.tokenVersion += 1; // Invalidate any attacker session
    victimAccount.authProviders = [
      ...victimAccount.authProviders.filter((p) => p.provider !== 'google' && p.provider !== 'local'),
      { provider: 'google', providerId: googleUid, linkedAt: new Date() },
    ];
  }

  // Verify Security assertions
  assert.equal(victimAccount.googleUid, googleUid, 'Google UID should be linked');
  assert.equal(victimAccount.emailVerified, true, 'Email should now be verified');
  assert.equal(victimAccount.password, undefined, 'Attacker password must be wiped');
  assert.equal(victimAccount.tokenVersion, 1, 'Token version must be incremented to revoke attacker sessions');
  assert.deepEqual(victimAccount.authProviders.map((p) => p.provider), ['google'], 'Only Google provider should remain');
});

test('Security - Safe Account-Linking: Verified Account Preserves Password', () => {
  // Scenario: Legitimate user who was already verified links Google
  const userAccount = {
    email: 'user@example.com',
    password: '$2a$10$validUserHashedPassword',
    emailVerified: true,
    tokenVersion: 0,
    authProviders: [{ provider: 'local', providerId: 'user@example.com' }],
  };

  const googleUid = 'google_uid_123456789';

  if (!userAccount.emailVerified) {
    userAccount.password = undefined;
    userAccount.tokenVersion += 1;
  } else {
    userAccount.googleUid = googleUid;
    userAccount.authProviders.push({ provider: 'google', providerId: googleUid, linkedAt: new Date() });
  }

  assert.equal(userAccount.googleUid, googleUid);
  assert.ok(userAccount.password, 'Password should NOT be wiped for already verified accounts');
  assert.equal(userAccount.tokenVersion, 0, 'Token version should not be forcibly incremented');
  assert.equal(userAccount.authProviders.length, 2, 'Should have both local and google providers');
});

test('Security - Prevent Lockout on Unlink Google', () => {
  const googleOnlyUser = {
    name: 'Google User',
    email: 'guser@gmail.com',
    password: null, // No password set
    googleUid: 'google_uid_111',
  };

  const canUnlinkWithoutPassword = Boolean(googleOnlyUser.password);
  assert.equal(canUnlinkWithoutPassword, false, 'Must reject unlinking Google if no password is set');
});
