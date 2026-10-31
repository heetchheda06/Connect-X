import { z } from 'zod';
import Message from '../../models/message.model.js';
import Conversation from '../../models/conversation.model.js';
import User from '../../models/user.model.js';
import { llmService } from './llmService.js';
import { SMART_REPLIES_PROMPT, TONE_ASSIST_PROMPT, wrapChatData } from './prompts.js';
import { env } from '../../config/env.js';

export const ALLOWED_TONES = [
  'polite',
  'shorter',
  'friendlier',
  'professional',
  'grammar',
  'clearer',
];

const smartRepliesOutputSchema = z.object({
  suggestions: z
    .array(z.string().min(1).max(100))
    .min(1)
    .max(3),
});

const toneAssistOutputSchema = z.object({
  rewritten: z.string().min(1),
  explanation: z.string().optional().default('Tone updated.'),
});

/**
 * Service for generating smart replies and assisting with tone rewrites.
 */
export class SmartReplyService {
  /**
   * Generate 3 contextual smart replies for direct conversations.
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {string} params.userId
   * @returns {Promise<{ suggestions: string[] }>}
   */
  async generateSmartReplies({ conversationId, userId }) {
    if (!conversationId || !userId) {
      return { suggestions: [] };
    }

    // 1. Verify user's AI settings
    const user = await User.findById(userId).select('aiSettings name username');
    if (!user || !user.aiSettings?.enabled || user.aiSettings?.smartReplies === false) {
      return { suggestions: [] };
    }

    // 2. Fetch conversation and verify user is a member
    const conversation = await Conversation.findById(conversationId).select('type members');
    if (!conversation) {
      return { suggestions: [] };
    }

    const isMember = conversation.members?.some(
      (m) => m.user?.toString() === userId.toString()
    );
    if (!isMember) {
      return { suggestions: [] };
    }

    // Rule: Direct chats only (never group or room chats)
    if (conversation.type !== 'direct') {
      return { suggestions: [] };
    }

    // 3. Fetch up to the last 10 non-deleted messages
    const recentMessages = await Message.find({
      conversation: conversationId,
      isDeletedForEveryone: false,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('sender', 'name username')
      .lean();

    if (!recentMessages || recentMessages.length === 0) {
      return { suggestions: [] };
    }

    // 4. Conditions to NOT show smart replies
    const latestMessage = recentMessages[0];
    const latestSenderId = latestMessage.sender?._id?.toString() || latestMessage.sender?.toString();

    // Condition A: If the last message was sent by the current user
    if (latestSenderId === userId.toString()) {
      return { suggestions: [] };
    }

    // Condition B: If the last message is a system message
    if (latestMessage.type === 'system') {
      return { suggestions: [] };
    }

    // Condition C: If the last message is media-only without caption
    if (!latestMessage.content || !latestMessage.content.trim()) {
      return { suggestions: [] };
    }

    // 5. Format the conversation context in chronological order
    const chronologicalMessages = [...recentMessages].reverse();
    const formattedHistory = chronologicalMessages
      .map((msg) => {
        const senderName = msg.sender?.name || msg.sender?.username || 'User';
        const text = msg.content?.trim() || '[Attachment]';
        return `[${senderName}]: ${text}`;
      })
      .join('\n');

    const wrappedContext = wrapChatData(formattedHistory, 'direct_chat_context');
    const myName = user.name || user.username || 'me';

    const userPrompt = `Here is the recent conversation history in <chat_data>. The recipient is "${myName}".
Generate exactly 3 short, relevant, distinct smart replies for "${myName}" in response to the last message received.
Ensure replies match the language and tone of the chat.`;

    try {
      const response = await llmService.generateStructured({
        systemInstruction: SMART_REPLIES_PROMPT,
        prompt: `${wrappedContext}\n\n${userPrompt}`,
        schema: smartRepliesOutputSchema,
        modelTier: env.aiModelFast || env.aiModel,
        temperature: 0.3,
      });

      const suggestions = (response?.suggestions || [])
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter((s) => s.length > 0 && s.length <= 80)
        .slice(0, 3);

      return { suggestions };
    } catch (err) {
      // Graceful fallback: return empty suggestions rather than crashing
      console.warn('[SmartReplyService] LLM generation failed:', err.message);
      return { suggestions: [] };
    }
  }

  /**
   * Rewrite a text draft into the requested tone with an explanation.
   *
   * @param {Object} params
   * @param {string} params.text
   * @param {string} params.tone
   * @param {string} params.userId
   * @param {boolean} [params.isRetry=false]
   * @returns {Promise<{ rewritten: string, explanation: string, original: string, tone: string }>}
   */
  async rewriteTone({ text, tone, userId, isRetry = false }) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      const error = new Error('Text to rewrite is required');
      error.status = 400;
      throw error;
    }

    if (text.length > 1000) {
      const error = new Error('Text exceeds maximum limit of 1000 characters');
      error.status = 400;
      throw error;
    }

    const cleanTone = (tone || '').toLowerCase().trim();
    if (!ALLOWED_TONES.includes(cleanTone)) {
      const error = new Error(`Invalid tone "${tone}". Allowed: ${ALLOWED_TONES.join(', ')}`);
      error.status = 400;
      throw error;
    }

    // Verify user has AI enabled
    const user = await User.findById(userId).select('aiSettings');
    if (!user || !user.aiSettings?.enabled) {
      const error = new Error('AI features are disabled in your settings. Please enable them to use Tone Assist.');
      error.status = 403;
      throw error;
    }

    const wrappedDraft = wrapChatData(text.trim(), 'draft_message');
    const userPrompt = `Please rewrite the draft message inside <chat_data> into a "${cleanTone}" tone.
Provide a concise one-sentence explanation of the adjustments made.`;

    const response = await llmService.generateStructured({
      systemInstruction: TONE_ASSIST_PROMPT,
      prompt: `${wrappedDraft}\n\n${userPrompt}`,
      schema: toneAssistOutputSchema,
      modelTier: env.aiModelFast || env.aiModel,
      temperature: isRetry ? 0.7 : 0.3,
    });

    return {
      rewritten: response.rewritten?.trim() || text,
      explanation: response.explanation?.trim() || `Rewritten in ${cleanTone} tone.`,
      original: text,
      tone: cleanTone,
    };
  }
}

export const smartReplyService = new SmartReplyService();
export default smartReplyService;
