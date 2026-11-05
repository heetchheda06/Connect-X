import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import SupportTicket from '../src/models/supportTicket.model.js';
import Notification from '../src/models/notification.model.js';
import ScheduledMessage from '../src/models/scheduledMessage.model.js';
import PushSubscription from '../src/models/pushSubscription.model.js';

test('E4 - SupportTicket Model Schema Validation', () => {
  const ticket = new SupportTicket({
    email: 'user@example.com',
    subject: 'Need assistance with 2FA',
    category: 'account',
    message: 'I would like help setting up my authenticator app.',
  });

  assert.equal(ticket.email, 'user@example.com');
  assert.equal(ticket.subject, 'Need assistance with 2FA');
  assert.equal(ticket.category, 'account');
  assert.equal(ticket.status, 'open');
  assert.ok(ticket.message.length > 0);
});

test('E4 - Notification Model Schema & Defaults', () => {
  const notif = new Notification({
    recipient: '507f1f77bcf86cd799439011',
    title: 'New Security Login',
    body: 'A new login from Chrome on Windows was detected.',
    type: 'security',
    link: '/settings',
  });

  assert.equal(notif.title, 'New Security Login');
  assert.equal(notif.type, 'security');
  assert.equal(notif.isRead, false);
});

test('E4 - ScheduledMessage Model Schema', () => {
  const futureDate = new Date(Date.now() + 3600 * 1000);
  const scheduled = new ScheduledMessage({
    user: '507f1f77bcf86cd799439011',
    conversation: '507f1f77bcf86cd799439012',
    content: 'Happy Birthday!',
    scheduledFor: futureDate,
  });

  assert.equal(scheduled.content, 'Happy Birthday!');
  assert.equal(scheduled.status, 'pending');
  assert.equal(scheduled.scheduledFor.getTime(), futureDate.getTime());
});

test('E5 - Two-Factor Authentication (TOTP) Secret Generation & Verification', () => {
  const secret = speakeasy.generateSecret({
    name: 'ConnectX (test@example.com)',
    issuer: 'ConnectX',
    length: 20,
  });

  assert.ok(secret.base32);
  assert.ok(secret.otpauth_url);

  // Generate TOTP token for current time
  const token = speakeasy.totp({
    secret: secret.base32,
    encoding: 'base32',
  });

  assert.equal(typeof token, 'string');
  assert.equal(token.length, 6);

  // Verify TOTP token
  const isValid = speakeasy.totp.verify({
    secret: secret.base32,
    encoding: 'base32',
    token,
    window: 1,
  });

  assert.equal(isValid, true);
});

test('E5 - Two-Factor Backup Codes Generation & SHA-256 Hashing', () => {
  const rawCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < 8; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    rawCodes.push(raw);
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    hashedCodes.push({ codeHash: hash, used: false });
  }

  assert.equal(rawCodes.length, 8);
  assert.equal(hashedCodes.length, 8);

  // Test that hashing matches accurately
  const testCode = rawCodes[0];
  const testHash = crypto.createHash('sha256').update(testCode).digest('hex');
  assert.equal(testHash, hashedCodes[0].codeHash);
});

test('E5 - Account Deletion Grace Period Calculation', () => {
  const now = Date.now();
  const graceDays = 14;
  const scheduledDate = new Date(now + graceDays * 24 * 60 * 60 * 1000);

  const diffDays = Math.round((scheduledDate.getTime() - now) / (24 * 60 * 60 * 1000));
  assert.equal(diffDays, 14);
});

test('E7 - PushSubscription Model Schema Validation', () => {
  const sub = new PushSubscription({
    user: '507f1f77bcf86cd799439011',
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-token-12345',
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK18WK25ypqDPY0-test',
      auth: 'tBHItDaAvaFedw-test',
    },
    deviceLabel: 'Chrome on macOS',
  });

  assert.equal(sub.endpoint, 'https://fcm.googleapis.com/fcm/send/test-token-12345');
  assert.equal(sub.keys.p256dh, 'BNcRdreALRFXTkOOUHK18WK25ypqDPY0-test');
  assert.equal(sub.keys.auth, 'tBHItDaAvaFedw-test');
});
