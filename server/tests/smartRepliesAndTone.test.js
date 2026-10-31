import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLOWED_TONES, SmartReplyService } from '../src/services/ai/smartReplyService.js';
import { SMART_REPLIES_PROMPT, TONE_ASSIST_PROMPT, wrapChatData } from '../src/services/ai/prompts.js';

test('Tone Assist - ALLOWED_TONES includes all 6 core tones', () => {
  const expectedTones = ['polite', 'shorter', 'friendlier', 'professional', 'grammar', 'clearer'];
  for (const t of expectedTones) {
    assert.ok(ALLOWED_TONES.includes(t), `Expected ALLOWED_TONES to include "${t}"`);
  }
});

test('Tone Assist - rewriteTone rejects missing or empty text', async () => {
  const service = new SmartReplyService();
  await assert.rejects(
    async () => {
      await service.rewriteTone({ text: '', tone: 'polite', userId: 'user123' });
    },
    { message: /Text to rewrite is required/i }
  );
});

test('Tone Assist - rewriteTone rejects text exceeding 1000 characters', async () => {
  const service = new SmartReplyService();
  const longText = 'a'.repeat(1001);
  await assert.rejects(
    async () => {
      await service.rewriteTone({ text: longText, tone: 'polite', userId: 'user123' });
    },
    { message: /exceeds maximum limit of 1000 characters/i }
  );
});

test('Tone Assist - rewriteTone rejects invalid tone', async () => {
  const service = new SmartReplyService();
  await assert.rejects(
    async () => {
      await service.rewriteTone({ text: 'Hello team', tone: 'sarcastic', userId: 'user123' });
    },
    { message: /Invalid tone "sarcastic"/i }
  );
});

test('Smart Replies - generateSmartReplies returns empty suggestions on missing arguments', async () => {
  const service = new SmartReplyService();
  const res1 = await service.generateSmartReplies({ conversationId: null, userId: 'user123' });
  assert.deepEqual(res1, { suggestions: [] });

  const res2 = await service.generateSmartReplies({ conversationId: 'c1', userId: null });
  assert.deepEqual(res2, { suggestions: [] });
});

test('AI Prompts - Tone Assist & Smart Replies include prompt injection defense', () => {
  assert.ok(SMART_REPLIES_PROMPT.includes('SECURITY INSTRUCTION'));
  assert.ok(SMART_REPLIES_PROMPT.includes('<chat_data>'));
  assert.ok(TONE_ASSIST_PROMPT.includes('SECURITY INSTRUCTION'));
  assert.ok(TONE_ASSIST_PROMPT.includes('<chat_data>'));
});
