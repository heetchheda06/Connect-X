import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidUsername,
  deriveBaseUsername,
  generateUniqueUsername,
  RESERVED_USERNAMES,
} from '../src/services/usernameService.js';

test('Username Service - isValidUsername format validation', () => {
  // Valid usernames
  assert.equal(isValidUsername('john_doe'), true);
  assert.equal(isValidUsername('user123'), true);
  assert.equal(isValidUsername('abc'), true);
  assert.equal(isValidUsername('a_1_b_2'), true);
  assert.equal(isValidUsername('twenty_character_usr'), true);

  // Invalid lengths
  assert.equal(isValidUsername('ab'), false, 'Should reject less than 3 chars');
  assert.equal(isValidUsername('a_very_long_username_exceeding_limit'), false, 'Should reject > 20 chars');

  // Invalid characters
  assert.equal(isValidUsername('john-doe'), false, 'Should reject hyphens');
  assert.equal(isValidUsername('john.doe'), false, 'Should reject dots');
  assert.equal(isValidUsername('john@doe'), false, 'Should reject special symbols');
  assert.equal(isValidUsername('JohnDoe'), true, 'Should accept lowercase normalized string');

  // Reserved names
  assert.equal(isValidUsername('admin'), false, 'Should reject reserved admin');
  assert.equal(isValidUsername('support'), false, 'Should reject reserved support');
  assert.equal(isValidUsername('connectx'), false, 'Should reject reserved connectx');
  assert.equal(isValidUsername('connectxai'), false, 'Should reject reserved connectxai');
});

test('Username Service - deriveBaseUsername', () => {
  assert.equal(deriveBaseUsername('john.doe@example.com'), 'john_doe');
  assert.equal(deriveBaseUsername('jane-smith+test@gmail.com'), 'jane_smith_test');
  assert.equal(deriveBaseUsername('al@domain.com'), 'aluser');
  assert.equal(deriveBaseUsername('admin@connectx.com'), 'cx_admin');
});

test('Username Service - generateUniqueUsername collision resolution', async () => {
  const existingSet = new Set(['alex', 'alex_101', 'alex_102']);

  const mockChecker = async (candidate) => existingSet.has(candidate);

  const generated = await generateUniqueUsername('alex@gmail.com', mockChecker);

  assert.ok(generated.startsWith('alex_'), `Generated username "${generated}" should start with alex_`);
  assert.ok(!existingSet.has(generated), `Generated username "${generated}" should not be in collision set`);
  assert.ok(generated.length <= 20, `Generated username "${generated}" must not exceed 20 characters`);
  assert.ok(isValidUsername(generated), `Generated username "${generated}" must be valid`);
});
