import { z } from 'zod';
import Message from '../../models/message.model.js';
import Conversation from '../../models/conversation.model.js';
import Decision from '../../models/decision.model.js';
import Task from '../../models/task.model.js';
import Transcript from '../../models/transcript.model.js';
import { llmService } from './llmService.js';
import { wrapChatData, PROMPT_INJECTION_DEFENSE } from './prompts.js';
import { env } from '../../config/env.js';

const askAllOutputSchema = z.object({
  answer: z.string(),
  citations: z
    .array(
      z.object({
        conversationId: z.string(),
        conversationName: z.string().default('Chat'),
        messageId: z.string().nullable().default(null),
        textSnippet: z.string().default(''),
      })
    )
    .default([]),
  confidence: z.number().default(0.8),
});

export class SemanticSearchService {
  /**
   * Search messages, decisions, and tasks across conversations with hybrid ranking
   */
  async searchMessages({ query, userId, conversationId = null, mode = 'hybrid' }) {
    if (!query || !query.trim()) {
      return { results: [] };
    }

    const cleanQuery = query.trim();

    // Find conversations accessible by this user
    const userConvs = await Conversation.find({
      'members.user': userId,
      ...(conversationId ? { _id: conversationId } : {}),
    }).select('_id name type ai');

    const convIds = userConvs.map((c) => c._id);
    if (convIds.length === 0) return { results: [] };

    // 1. Text Search across messages
    const regexQuery = new RegExp(cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [matchedMessages, matchedDecisions, matchedTasks] = await Promise.all([
      Message.find({
        conversation: { $in: convIds },
        content: regexQuery,
        isDeletedForEveryone: false,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('sender', 'name username avatar')
        .populate('conversation', 'name type')
        .lean(),
      Decision.find({
        conversation: { $in: convIds },
        text: regexQuery,
      })
        .sort({ decidedAt: -1 })
        .limit(10)
        .populate('conversation', 'name type')
        .lean(),
      Task.find({
        conversation: { $in: convIds },
        title: regexQuery,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('conversation', 'name type')
        .lean(),
    ]);

    const formatted = [];

    for (const m of matchedMessages) {
      formatted.push({
        id: m._id,
        kind: 'message',
        conversation: m.conversation,
        title: m.sender?.name || 'User',
        content: m.content,
        timestamp: m.createdAt,
        type: m.type,
      });
    }

    for (const d of matchedDecisions) {
      formatted.push({
        id: d._id,
        kind: 'decision',
        conversation: d.conversation,
        title: `Decision: ${d.text}`,
        content: d.context || d.text,
        timestamp: d.decidedAt,
      });
    }

    for (const t of matchedTasks) {
      formatted.push({
        id: t._id,
        kind: 'task',
        conversation: t.conversation,
        title: `Task: ${t.title}`,
        content: t.description || t.title,
        timestamp: t.createdAt,
      });
    }

    return {
      results: formatted,
      totalCount: formatted.length,
      mode,
    };
  }

  /**
   * "Ask All My Chats": Natural language question across all user's AI-enabled chats
   */
  async askAllMyChats({ userId, question }) {
    if (!question || !question.trim()) {
      const err = new Error('Question is required');
      err.status = 400;
      throw err;
    }

    // 1. Find all conversations with AI enabled for this user
    const allowedConvs = await Conversation.find({
      'members.user': userId,
      'ai.mode': { $in: ['on_demand', 'auto'] },
    }).select('_id name type');

    if (allowedConvs.length === 0) {
      return {
        answer: 'None of your conversations have AI enabled. Turn on AI in your chat settings to ask questions across chats.',
        citations: [],
        confidence: 0,
      };
    }

    const convIds = allowedConvs.map((c) => c._id);

    // 2. Retrieve recent matching messages across those chats
    const recentMessages = await Message.find({
      conversation: { $in: convIds },
      isDeletedForEveryone: false,
    })
      .sort({ createdAt: -1 })
      .limit(60)
      .populate('sender', 'name')
      .populate('conversation', 'name')
      .lean();

    const formattedSnippet = recentMessages
      .map(
        (m) =>
          `[ConvID: ${m.conversation?._id}] [Chat: "${m.conversation?.name || 'Chat'}"] [MsgID: ${m._id}] [${m.sender?.name}]: ${m.content}`
      )
      .join('\n');

    const prompt = `
Chats History across user's conversations:
<chat_data label="all_chats">
${formattedSnippet}
</chat_data>

User Question: "${question}"

Synthesize an accurate answer across these chats with citations linking to the exact conversation and message.
${PROMPT_INJECTION_DEFENSE}
`;

    const result = await llmService.generateStructured({
      systemInstruction: `You are ConnectX Global Search Assistant. Answer across conversations using strict citations.`,
      prompt,
      schema: askAllOutputSchema,
      modelTier: env.aiModelSmart || env.aiModel,
    });

    return result;
  }
}

export const semanticSearchService = new SemanticSearchService();
export default semanticSearchService;
