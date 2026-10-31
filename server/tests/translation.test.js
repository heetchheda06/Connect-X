import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import Translation from '../src/models/translation.model.js';
import { isValidTargetLanguage, getLanguageByCode } from '../src/services/ai/languages.js';
import { wrapChatData, TRANSLATION_PROMPT } from '../src/services/ai/prompts.js';

test('Translation Model - Schema & Indexes validation', () => {
  const schema = Translation.schema.paths;
  assert.ok(schema.message, 'Translation model must have message field');
  assert.ok(schema.targetLang, 'Translation model must have targetLang field');
  assert.ok(schema.translatedText, 'Translation model must have translatedText field');
  assert.ok(schema.detectedSourceLang, 'Translation model must have detectedSourceLang field');
  assert.ok(schema.alreadyInTargetLang, 'Translation model must have alreadyInTargetLang field');

  // Verify compound unique index exists
  const indexes = Translation.schema.indexes();
  const hasCompoundIndex = indexes.some(
    ([fields, options]) => fields.message === 1 && fields.targetLang === 1 && options.unique === true
  );
  assert.ok(hasCompoundIndex, 'Translation model must have a compound unique index on { message: 1, targetLang: 1 }');
});

test('Translation Service - Target language verification', () => {
  assert.equal(isValidTargetLanguage('hi'), true, 'Hindi must be a valid target language');
  assert.equal(isValidTargetLanguage('es'), true, 'Spanish must be a valid target language');
  assert.equal(isValidTargetLanguage('en'), true, 'English must be a valid target language');
  assert.equal(isValidTargetLanguage('mr'), true, 'Marathi must be a valid target language');
  assert.equal(isValidTargetLanguage('gu'), true, 'Gujarati must be a valid target language');
  assert.equal(isValidTargetLanguage('hinglish'), false, 'Hinglish is input-only, not a valid target');
  assert.equal(isValidTargetLanguage('klingon'), false, 'Unsupported language must be rejected');
});

test('Translation Prompt - Encloses text in safe data delimiters and includes defense', () => {
  const sampleMessage = 'Meet me at the station at 5 PM.';
  const wrapped = wrapChatData(sampleMessage, 'message_to_translate');
  assert.ok(wrapped.includes('<chat_data label="message_to_translate">'));
  assert.ok(wrapped.includes('Meet me at the station at 5 PM.'));
  assert.ok(TRANSLATION_PROMPT.includes('ConnectX Translation Engine'));
  assert.ok(TRANSLATION_PROMPT.includes('alreadyInTargetLang'));
});

test('Translation Schema - Zod output validation rules', () => {
  const TranslationOutputSchema = z.object({
    translatedText: z.string().default(''),
    detectedSourceLang: z.string().default('en'),
    alreadyInTargetLang: z.boolean().default(false),
  });

  const validResponse = {
    translatedText: 'शाम 5 बजे स्टेशन पर मिलो।',
    detectedSourceLang: 'en',
    alreadyInTargetLang: false,
  };
  const parsed = TranslationOutputSchema.safeParse(validResponse);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.translatedText, 'शाम 5 बजे स्टेशन पर मिलो।');
  assert.equal(parsed.data.detectedSourceLang, 'en');

  // Missing translatedText fallback
  const fallbackResponse = {
    detectedSourceLang: 'hi',
    alreadyInTargetLang: true,
  };
  const parsedFallback = TranslationOutputSchema.safeParse(fallbackResponse);
  assert.equal(parsedFallback.success, true);
  assert.equal(parsedFallback.data.translatedText, '');
});
