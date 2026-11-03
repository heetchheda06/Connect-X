import test from 'node:test';
import assert from 'node:assert/strict';
import { redactionService } from '../src/services/ai/redactionService.js';

test('Redaction Service - Redacts email addresses', () => {
  const input = 'Reach me at test.user@example.com or support@connectx.in';
  const output = redactionService.redact(input);
  assert.equal(output, 'Reach me at [EMAIL] or [EMAIL]');
});

test('Redaction Service - Redacts Indian mobile and international phone numbers', () => {
  const input = 'Call me on 9876543210 or +91 9123456789 or +1 (555) 234-5678';
  const output = redactionService.redact(input);
  assert.ok(!output.includes('9876543210'));
  assert.ok(!output.includes('9123456789'));
  assert.ok(output.includes('[PHONE]'));
});

test('Redaction Service - Redacts Aadhaar & PAN identification numbers', () => {
  const input = 'My Aadhaar is 2345 6789 0123 and PAN is ABCDE1234F';
  const output = redactionService.redact(input);
  assert.equal(output, 'My Aadhaar is [ID] and PAN is [ID]');
});

test('Redaction Service - Redacts UPI IDs and IFSC codes', () => {
  const input = 'Pay me at user@okhdfcbank or merchant@paytm with IFSC HDFC0001234';
  const output = redactionService.redact(input);
  assert.equal(output, 'Pay me at [BANK] or [BANK] with IFSC [BANK]');
});

test('Redaction Service - Redacts OTPs, PINs and secrets', () => {
  const input = 'Your otp: 481920. Password: mysecretpassword123';
  const output = redactionService.redact(input);
  assert.ok(output.includes('[CODE]'));
  assert.ok(output.includes('[SECRET]'));
  assert.ok(!output.includes('481920'));
  assert.ok(!output.includes('mysecretpassword123'));
});

test('Redaction Service - Redacts sensitive URLs containing auth tokens', () => {
  const input = 'Click here: https://example.com/reset?token=xyz123secret&ref=mail';
  const output = redactionService.redact(input);
  assert.ok(!output.includes('xyz123secret'));
  assert.ok(output.includes('[LINK]'));
});
