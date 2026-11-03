import { z } from 'zod';
import AiThread from '../../models/aiThread.model.js';
import Message from '../../models/message.model.js';
import { contextGateway } from './contextGateway.js';
import { llmService } from './llmService.js';
import { PROMPT_INJECTION_DEFENSE } from './prompts.js';
import { env } from '../../config/env.js';

const askChatOutputSchema = z.object({
  answer: z.string(),
  citations: z
    .array(
      z.object({
        messageId: z.string(),
        sender: z.string().default(''),
        textSnippet: z.string().default(''),
      })
    )
    .default([]),
  confidence: z.number().min(0).max(1).default(0.8),
  notFound: z.boolean().default(false),
});

const ASK_CHAT_PROMPT = `
You are ConnectX "Ask This Chat" assistant.
Your task is to answer the user's question STRICTLY AND SOLELY using the conversation history provided in <chat_data>.

RULES:
1. Answer concisely, accurately, and naturally.
2. CITATIONS: Include citation references for every fact cited in the answer. Use the source message IDs provided.
3. If the answer is NOT present in the conversation, set "notFound": true, set "answer" to "I couldn't find that in this chat.", and provide an empty citations array.
4. Never guess or hallucinate outside information.
5. Paraphrase appropriately; do not quote full messages verbatim.
6. Output strict JSON matching the schema.
${PROMPT_INJECTION_DEFENSE}
`;

export class AskChatService {
  /**
   * Answer a natural-language question over conversation history
   */
  async ask({ conversationId, userId, question, threadId = null }) {
    if (!question || !question.trim()) {
      const err = new Error('Question is required');
      err.status = 400;
      throw err;
    }

    // 1. Retrieve messages through gateway
    const context = await contextGateway.buildAiContext({
      userId,
      conversationId,
      feature: 'ask_chat',
      trigger: 'manual',
      range: 80, // Retrieve up to 80 recent messages
    });

    // 2. Fetch or create thread for follow-up conversation
    let thread = null;
    if (threadId) {
      thread = await AiThread.findOne({ _id: threadId, user: userId });
    }
    if (!thread) {
      thread = await AiThread.create({
        user: userId,
        conversation: conversationId,
        title: question.slice(0, 40),
        messages: [],
      });
    }

    // 3. Prepare message list with IDs for citations
    const formattedWithIds = (context.messages || [])
      .map((m) => `[ID: ${m._id}] [${m.senderName}]: ${m.content}`)
      .join('\n');

    const recentTurns = (thread.messages || [])
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const userPrompt = `
${recentTurns ? `Previous Q&A Turns:\n${recentTurns}\n` : ''}
User Question: "${question.trim()}"

Search the chat history in <chat_data> and answer the question with precise citations.`;

    const result = await llmService.generateStructured({
      systemInstruction: ASK_CHAT_PROMPT,
      prompt: `<chat_data label="chat_messages">\n${formattedWithIds}\n</chat_data>\n\n${userPrompt}`,
      schema: askChatOutputSchema,
      modelTier: env.aiModelSmart || env.aiModel,
    });

    // 4. Append to thread
    const citationIds = (result.citations || [])
      .map((c) => c.messageId)
      .filter((id) => id && id.length === 24);

    thread.messages.push({
      role: 'user',
      content: question,
      citations: [],
    });

    thread.messages.push({
      role: 'model',
      content: result.answer,
      citations: citationIds,
    });

    await thread.save();

    return {
      threadId: thread._id,
      answer: result.answer,
      citations: result.citations,
      confidence: result.confidence,
      notFound: result.notFound,
      hiddenNotice: context.notice,
    };
  }
}

export const askChatService = new AskChatService();
export default askChatService;
