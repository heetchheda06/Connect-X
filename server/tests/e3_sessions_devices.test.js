import test from 'node:test';
import assert from 'node:assert/strict';
import { truncateIp } from '../src/utils/ipUtils.js';
import { parseDeviceLabel } from '../src/utils/deviceParser.js';
import { generateToken, verifyToken } from '../src/utils/token.js';
import { sessionService } from '../src/services/session.service.js';

test('E3 - IP Truncation: Masks IPv4 to /24 for privacy compliance', () => {
  assert.equal(truncateIp('192.168.1.150'), '192.168.1.0/24');
  assert.equal(truncateIp('10.0.5.23'), '10.0.5.0/24');
  assert.equal(truncateIp('::ffff:192.168.1.45'), '192.168.1.0/24');
});

test('E3 - IP Truncation: Masks IPv6 to /48 for privacy compliance', () => {
  const truncated = truncateIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
  assert.equal(truncated, '2001:0db8:85a3::/48');
});

test('E3 - IP Truncation: Handles local and invalid loopbacks safely', () => {
  assert.equal(truncateIp('127.0.0.1'), '127.0.0.0/24 (Localhost)');
  assert.equal(truncateIp('::1'), '127.0.0.0/24 (Localhost)');
  assert.equal(truncateIp(null), 'Unknown');
});

test('E3 - Device Parser: Parses Desktop User Agents correctly', () => {
  const windowsChrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  assert.equal(parseDeviceLabel(windowsChrome), 'Chrome on Windows 10');

  const macSafari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
  assert.equal(parseDeviceLabel(macSafari), 'Safari on macOS 10.15.7');
});

test('E3 - Device Parser: Parses Mobile User Agents correctly', () => {
  const androidChrome = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  assert.equal(parseDeviceLabel(androidChrome), 'Mobile Chrome on Pixel 8 (Android 14)');

  const iphoneSafari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  assert.equal(parseDeviceLabel(iphoneSafari), 'Mobile Safari on iPhone (iOS 17.0)');
});

test('E3 - Device Parser: Fallbacks gracefully on missing user agents', () => {
  assert.equal(parseDeviceLabel(''), 'Unknown Device');
  assert.equal(parseDeviceLabel(null), 'Unknown Device');
});

test('E3 - JWT Claims: Encodes and decodes sub, sid, and tv (tokenVersion)', () => {
  const payload = {
    userId: '60d5ec49f1b2c82b8c8d1111',
    sid: 'test_session_xyz789',
    tokenVersion: 3,
  };

  const token = generateToken(payload.userId, payload.tokenVersion, payload.sid);

  assert.ok(token);
  const decoded = verifyToken(token);
  assert.equal(decoded.sub, payload.userId);
  assert.equal(decoded.sid, payload.sid);
  assert.equal(decoded.tv, 3);
  assert.equal(decoded.tokenVersion, 3);
});

test('E3 - Session In-Memory Cache: Caches validation and invalidates on revoke', () => {
  const testSid = 'sid_cache_test_123';
  const testUser = 'user_cache_test_456';

  // Seed cache manually
  sessionService.cache.set(testSid, {
    isValid: true,
    userId: testUser,
    tokenVersion: 1,
    expiresAt: new Date(Date.now() + 60000),
  });

  assert.equal(sessionService.cache.get(testSid).isValid, true);

  // Invalidate
  sessionService.invalidateCache(testSid);
  assert.equal(sessionService.cache.get(testSid), undefined);
});
