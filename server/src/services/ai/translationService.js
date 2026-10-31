import { z } from 'zod';
import Translation from '../../models/translation.model.js';
import Message from '../../models/message.model.js';
import Conversation from '../../models/conversation.model.js';
import User from '../../models/user.model.js';
import { llmService } from './llmService.js';
import { TRANSLATION_PROMPT, wrapChatData } from './prompts.js';
import { getLanguageByCode, isValidTargetLanguage } from './languages.js';

const TranslationSchema = z.object({
  translatedText: z.string().default(''),
  detectedSourceLang: z.string().default('en'),
  alreadyInTargetLang: z.boolean().default(false),
});

class TranslationService {
  /**
   * Translate a single message to target language
   */
  async translateMessage({ messageId, targetLang, userId }) {
    if (!messageId || !targetLang) {
      const err = new Error('messageId and targetLang are required');
      err.status = 400;
      throw err;
    }

    const cleanTarget = targetLang.toLowerCase().trim();
    if (!isValidTargetLanguage(cleanTarget)) {
      const err = new Error(`Unsupported target language: "${cleanTarget}"`);
      err.status = 400;
      throw err;
    }

    // Verify user has AI enabled
    const user = await User.findById(userId).select('aiSettings');
    if (!user?.aiSettings?.enabled) {
      const err = new Error('AI features are disabled. Please enable AI in Settings.');
      err.status = 403;
      err.code = 'AI_DISABLED';
      throw err;
    }

    // Retrieve message
    const message = await Message.findById(messageId);
    if (!message) {
      const err = new Error('Message not found');
      err.status = 404;
      throw err;
    }

    if (message.isDeletedForEveryone) {
      const err = new Error('Deleted messages cannot be translated');
      err.status = 400;
      throw err;
    }

    if (message.type === 'system') {
      const err = new Error('System messages cannot be translated');
      err.status = 400;
      throw err;
    }

    // Verify user is a member of the conversation
    const isMember = await Conversation.exists({
      _id: message.conversation,
      members: userId,
    });
    if (!isMember) {
      const err = new Error('You do not have access to this conversation');
      err.status = 403;
      throw err;
    }

    // 1. Check cache in MongoDB
    const cached = await Translation.findOne({
      message: message._id,
      targetLang: cleanTarget,
    });
    if (cached) {
      return {
        messageId: message._id,
        targetLang: cleanTarget,
        translatedText: cached.translatedText,
        detectedSourceLang: cached.detectedSourceLang,
        alreadyInTargetLang: cached.alreadyInTargetLang,
        cached: true,
      };
    }

    // If message text is empty (e.g. media without caption)
    const textToTranslate = message.content?.trim();
    if (!textToTranslate) {
      return {
        messageId: message._id,
        targetLang: cleanTarget,
        translatedText: '',
        detectedSourceLang: 'en',
        alreadyInTargetLang: true,
        cached: true,
      };
    }

    const targetLangObj = getLanguageByCode(cleanTarget);
    const targetLabel = targetLangObj ? `${targetLangObj.name} (${targetLangObj.nativeName})` : cleanTarget;

    const userPrompt = `
Target Language: "${targetLabel}" (code: "${cleanTarget}").

Message to translate:
${wrapChatData(textToTranslate, 'message_to_translate')}

Please translate the message into ${targetLabel} according to your rules and return the JSON schema.
`;

    const result = await llmService.generateStructured({
      feature: 'translate',
      prompt: userPrompt,
      systemInstruction: TRANSLATION_PROMPT,
      schema: TranslationSchema,
      tier: 'fast',
    });

    const parsed = result.data;

    // Cache to MongoDB (handle potential unique constraint race conditions safely)
    let savedTranslation;
    try {
      savedTranslation = await Translation.findOneAndUpdate(
        { message: message._id, targetLang: cleanTarget },
        {
          $setOnInsert: {
            translatedText: parsed.translatedText || textToTranslate,
            detectedSourceLang: parsed.detectedSourceLang || 'en',
            alreadyInTargetLang: Boolean(parsed.alreadyInTargetLang),
          },
        },
        { upsert: true, new: true }
      );
    } catch {
      savedTranslation = await Translation.findOne({ message: message._id, targetLang: cleanTarget });
    }

    return {
      messageId: message._id,
      targetLang: cleanTarget,
      translatedText: savedTranslation?.translatedText || parsed.translatedText,
      detectedSourceLang: savedTranslation?.detectedSourceLang || parsed.detectedSourceLang,
      alreadyInTargetLang: savedTranslation?.alreadyInTargetLang ?? parsed.alreadyInTargetLang,
      cached: false,
    };
  }

  /**
   * Batch translate multiple visible messages (e.g. when auto-translate is turned on)
   * Max 30 messages, controlled concurrency.
   */
  async translateBatch({ messageIds, targetLang, userId }) {
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return { translations: {} };
    }

    const cappedIds = messageIds.slice(0, 30);
    const results = {};

    // Run batch with concurrency of 4 to prevent overwhelming rate limiters
    const chunkSize = 4;
    for (let i = 0; i < cappedIds.length; i += chunkSize) {
      const chunk = cappedIds.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (id) => {
          try {
            const res = await this.translateMessage({
              messageId: id,
              targetLang,
              userId,
            });
            results[id] = res;
          } catch (err) {
            results[id] = { error: err.message, failed: true };
          }
        })
      );
    }

    return { translations: results };
  }
}

export const translationService = new TranslationService();
export default translationService;
