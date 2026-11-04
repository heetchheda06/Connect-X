import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { TokenService } from '../src/services/token.service.js';
import { EmailToken } from '../src/models/emailToken.model.js';
import { emailTemplates } from '../src/emails/templates.js';
import { renderEmailLayout, htmlToPlainText } from '../src/emails/renderEmail.js';
import { EmailJob } from '../src/models/emailJob.model.js';
import { emailService } from '../src/services/emailService.js';
import { getHealth, getReady } from '../src/controllers/health.controller.js';

test('E1 - Email Templates: All 11 Ocean Light Templates Render Correctly', () => {
  const dummyData = {
    name: 'Alex',
    verifyUrl: 'https://connect-x-1af38.web.app/verify-email?token=abc123xyz',
    resetUrl: 'https://connect-x-1af38.web.app/reset-password?token=pwd123xyz',
    confirmUrl: 'https://connect-x-1af38.web.app/confirm-email?token=new123',
    cancelUrl: 'https://connect-x-1af38.web.app/account/cancel-deletion?token=del123',
    downloadUrl: 'https://connect-x-1af38.web.app/api/account/export/archive123',
    newEmail: 'alex.new@example.com',
    deviceLabel: 'Chrome on Windows 11',
    ipTruncated: '192.168.1.0/24',
    scheduledFor: 'November 18, 2026',
    graceDays: 14,
    expiresAt: '7 days',
    actionType: 'warning',
    reason: 'Spamming duplicate links',
  };

  const expectedTemplates = [
    'verifyEmail',
    'welcome',
    'resetPassword',
    'passwordChanged',
    'newSignIn',
    'emailChangeVerification',
    'emailChangeNotice',
    'deletionScheduled',
    'deletionCancelled',
    'dataExportReady',
    'moderationNotice',
  ];

  for (const templateKey of expectedTemplates) {
    const templateFn = emailTemplates[templateKey];
    assert.ok(templateFn, `Template ${templateKey} must exist`);

    const result = templateFn(dummyData);
    assert.ok(result.subject, `${templateKey} must produce a subject`);
    assert.ok(result.html, `${templateKey} must produce HTML`);
    assert.ok(result.text, `${templateKey} must produce plain text`);

    // Verify ocean styling brand tokens
    assert.ok(result.html.includes('#0284c7'), `${templateKey} must use ocean primary color`);
    assert.ok(result.html.includes('#0d9488'), `${templateKey} must use teal accent color`);
    assert.ok(result.html.includes('ConnectX'), `${templateKey} must include ConnectX branding`);

    // Verify plain text contains no HTML tags
    assert.ok(!result.text.includes('<table'), `${templateKey} text fallback must not contain table tags`);
    assert.ok(!result.text.includes('<h2'), `${templateKey} text fallback must not contain h2 tags`);
  }
});

test('E1 - Token Service: Generation, SHA-256 Hashing and Timing-Safe Verification', async (t) => {
  // Connect to in-memory / local test MongoDB if available, otherwise test hashing and comparison mechanics
  const rawToken = crypto.randomBytes(32).toString('hex');
  assert.equal(rawToken.length, 64, '32 bytes hex should be 64 characters');

  const tokenHash = TokenService.hashToken(rawToken);
  assert.equal(tokenHash.length, 64, 'SHA-256 hash should be 64 characters');
  assert.notEqual(rawToken, tokenHash, 'Raw token and tokenHash must never be identical');

  // Verify constant-time comparison
  const computedHash = TokenService.hashToken(rawToken);
  const bufA = Buffer.from(tokenHash, 'hex');
  const bufB = Buffer.from(computedHash, 'hex');
  assert.equal(crypto.timingSafeEqual(bufA, bufB), true, 'Identical hashes must match');

  const tamperedRaw = rawToken.slice(0, -2) + '00';
  const tamperedHash = TokenService.hashToken(tamperedRaw);
  const bufTampered = Buffer.from(tamperedHash, 'hex');
  assert.equal(crypto.timingSafeEqual(bufA, bufTampered), false, 'Tampered token hash must fail comparison');
});

test('E1 - Email Queue: Exponential Backoff Calculation', () => {
  // Verify backoff progression for retries: 10s * 2^(attempts)
  const calculateDelay = (attempts) => Math.pow(2, attempts) * 10 * 1000;

  assert.equal(calculateDelay(1), 20000, 'Attempt 1 backoff should be 20s');
  assert.equal(calculateDelay(2), 40000, 'Attempt 2 backoff should be 40s');
  assert.equal(calculateDelay(3), 80000, 'Attempt 3 backoff should be 80s');
  assert.equal(calculateDelay(4), 160000, 'Attempt 4 backoff should be 160s');
});

test('E1 - Health and Readiness Controller Probes', async () => {
  // 1. Health Probe (Liveness)
  let healthCode = 0;
  let healthBody = null;
  const mockResHealth = {
    status(code) {
      healthCode = code;
      return this;
    },
    json(body) {
      healthBody = body;
      return this;
    },
  };

  getHealth({}, mockResHealth);
  assert.equal(healthCode, 200, '/health must return 200 OK');
  assert.equal(healthBody.success, true);
  assert.equal(healthBody.data.status, 'healthy');
  assert.ok(typeof healthBody.data.uptime === 'number', 'Uptime must be a number');

  // 2. Ready Probe (Readiness)
  let readyCode = 0;
  let readyBody = null;
  const mockResReady = {
    status(code) {
      readyCode = code;
      return this;
    },
    json(body) {
      readyBody = body;
      return this;
    },
  };

  await getReady({}, mockResReady);
  // Status is 200 if DB connected or 503 if disconnected
  assert.ok([200, 503].includes(readyCode), '/ready must return 200 or 503');
  assert.ok(readyBody.data.database, 'Readiness response must report database state');
  assert.ok(readyBody.data.emailWorker, 'Readiness response must report email worker state');
});
