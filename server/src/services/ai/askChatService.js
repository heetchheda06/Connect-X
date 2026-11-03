import { z } from 'zod';
import AiThread from '../../models/aiThread.model.js';
import Message from '../../models/message.model.js';
import { contextGateway } from './contextGateway.js';
import { llmService } from './llmService.js';
import { PROMPT_INJECTION_DEFENSE } from './prompts.js';
import { env } from '../../config/env.js';

const askChatOutputSchema = z.preprocess(
  (val) => {
    if (val && typeof val === 'object') {
      const copy = { ...val };
      if (!copy.answer && (copy.response || copy.text || copy.reply || copy.message)) {
        copy.answer = copy.response || copy.text || copy.reply || copy.message;
      }
      return copy;
    }
    return val;
  },
  z.object({
    answer: z.string().default(''),
    citations: z
      .any()
      .transform((val) => {
        if (!Array.isArray(val)) return [];
        return val
          .map((item) => {
            if (!item) return null;
            if (typeof item === 'string') return { messageId: item, sender: '', textSnippet: '' };
            return {
              messageId: String(item.messageId || item.id || item._id || ''),
              sender: String(item.sender || ''),
              textSnippet: String(item.textSnippet || item.snippet || item.text || ''),
            };
          })
          .filter(Boolean);
      })
      .default([]),
    confidence: z
      .any()
      .transform((val) => {
        const num = Number(val);
        if (isNaN(num)) return 0.8;
        if (num > 1) return Math.min(num / 100, 1);
        return Math.max(0, num);
      })
      .default(0.8),
    notFound: z
      .any()
      .transform((val) => Boolean(val))
      .default(false),
    isFromChat: z
      .any()
      .transform((val) => Boolean(val))
      .default(false),
  })
);

const ASK_CHAT_PROMPT = `
You are ConnectX AI Assistant - a helpful, knowledgeable chatbot available inside this chat workspace.
You can answer questions about the chat messages in <chat_data> as well as any general question, technical inquiry, or concept.

ROUTING & ANSWERING INSTRUCTIONS:
1. QUESTIONS ABOUT THIS CHAT (participants, tasks, decisions, links, conversation history):
   - Answer accurately based strictly on <chat_data>.
   - Provide precise citations for facts cited, including source messageId, sender name, and text snippet.
   - Set "isFromChat": true, "notFound": false.
   - If the user explicitly asks whether a specific person said or shared something in this chat, and it never happened, set "notFound": true, "answer": "I checked this chat, and that wasn't mentioned by anyone here.", "citations": [].

2. GENERAL KNOWLEDGE / CONCEPTS / TECHNICAL QUESTIONS (e.g. "what is the role of fiber optic cable", "how does a compiler work", "write a polite follow-up email"):
   - DO NOT reply with "I couldn't find that in this chat"!
   - Provide a comprehensive, accurate, high-quality, and well-structured answer explaining the concept thoroughly.
   - Set "isFromChat": false, "citations": [], "notFound": false.

3. GREETINGS & CASUAL INTERACTION (e.g. "hello", "hi", "help", "who are you"):
   - Greet the user warmly and introduce yourself as the ConnectX AI Assistant.
   - Mention that you can answer questions about this chat history or assist with any general topic or explanation.
   - Set "isFromChat": false, "citations": [], "notFound": false.

Output strictly valid JSON matching this structure:
{
  "answer": "Your comprehensive, clear response here",
  "citations": [
    {
      "messageId": "source_message_id",
      "sender": "sender_name",
      "textSnippet": "short snippet"
    }
  ],
  "confidence": 0.95,
  "notFound": false,
  "isFromChat": false
}
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

    const answer = result?.answer || result?.data?.answer || "I couldn't find that in this chat.";
    const citations = Array.isArray(result?.citations)
      ? result.citations
      : Array.isArray(result?.data?.citations)
      ? result.data.citations
      : [];
    const confidence = typeof result?.confidence === 'number' ? result.confidence : 0.8;
    const notFound = Boolean(result?.notFound);

    // 4. Append to thread
    const citationIds = citations
      .map((c) => c.messageId)
      .filter((id) => id && id.length === 24);

    thread.messages.push({
      role: 'user',
      content: question,
      citations: [],
    });

    thread.messages.push({
      role: 'model',
      content: answer,
      citations: citationIds,
    });

    await thread.save();

    return {
      threadId: thread._id,
      answer,
      citations,
      confidence,
      notFound,
      isFromChat: Boolean(result?.isFromChat || citations.length > 0),
      hiddenNotice: context.notice,
    };
  }
}

export const askChatService = new AskChatService();
export default askChatService;
