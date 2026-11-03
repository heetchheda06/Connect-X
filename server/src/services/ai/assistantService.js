import { z } from 'zod';
import User from '../../models/user.model.js';
import Message from '../../models/message.model.js';
import Conversation from '../../models/conversation.model.js';
import Task from '../../models/task.model.js';
import Deadline from '../../models/deadline.model.js';
import Decision from '../../models/decision.model.js';
import AiThread from '../../models/aiThread.model.js';
import { contextGateway } from './contextGateway.js';
import { llmService } from './llmService.js';
import { PROMPT_INJECTION_DEFENSE } from './prompts.js';
import { env } from '../../config/env.js';

let botUserInstance = null;

export async function getOrCreateBotUser() {
  if (!botUserInstance) {
    botUserInstance = await User.findOne({ username: 'connectx' });
    if (!botUserInstance) {
      botUserInstance = await User.create({
        name: 'ConnectX AI',
        username: 'connectx',
        email: 'ai-assistant@connectx.internal',
        avatarSource: 'generated',
        status: '✨ Your ConnectX AI Assistant',
        aiSettings: { enabled: true },
      });
    }
  }
  return botUserInstance;
}

const assistantReplySchema = z.object({
  reply: z.string(),
  proposedAction: z
    .object({
      type: z.enum(['create_task', 'create_reminder', 'create_decision']),
      data: z.record(z.any()),
    })
    .nullable()
    .default(null),
});

const ASSISTANT_SYSTEM_PROMPT = `
You are ConnectX AI, the intelligent in-chat assistant for ConnectX.
You assist users with answering questions about the chat, summarizing discussions, listing tasks, deadlines, and decisions, and proposing new actions.

RULES:
1. You are an AI assistant. Be friendly, crisp, and helpful.
2. If asked to create a task, reminder, or log a decision, propose it cleanly in "proposedAction". Never execute actions directly.
3. Answer strictly from the provided context in <chat_data> when answering questions about the conversation.
4. Output JSON matching the schema:
{
  "reply": string,
  "proposedAction": { "type": "create_task" | "create_reminder" | "create_decision", "data": object } | null
}
${PROMPT_INJECTION_DEFENSE}
`;

export class AssistantService {
  /**
   * Handle in-chat mention of @connectx
   */
  async handleInChatMention({ message, conversationId, senderId, socketIo = null }) {
    const botUser = await getOrCreateBotUser();

    // 1. Fetch context through gateway
    const context = await contextGateway.buildAiContext({
      userId: senderId,
      conversationId,
      feature: 'assistant',
      trigger: 'manual',
      range: 50,
    });

    // 2. Fetch existing tasks & decisions for tool context
    const [openTasks, recentDecisions, upcomingDeadlines] = await Promise.all([
      Task.find({ conversation: conversationId, status: { $in: ['open', 'suggested'] } }).limit(10).lean(),
      Decision.find({ conversation: conversationId, status: 'confirmed' }).limit(10).lean(),
      Deadline.find({ conversation: conversationId, status: 'accepted' }).limit(10).lean(),
    ]);

    const toolContext = `
[Open Tasks in this chat]: ${openTasks.map((t) => t.title).join(', ') || 'None'}
[Confirmed Decisions]: ${recentDecisions.map((d) => d.text).join('; ') || 'None'}
[Upcoming Deadlines]: ${upcomingDeadlines.map((dl) => `${dl.title} (${dl.dueAt})`).join('; ') || 'None'}
`;

    const userPrompt = `
User Query: "${message.content}"
${toolContext}

Respond helpfully to the user's message using the chat messages and tool context above.`;

    const result = await llmService.generateStructured({
      systemInstruction: ASSISTANT_SYSTEM_PROMPT,
      prompt: `${context.wrappedContext}\n\n${userPrompt}`,
      schema: assistantReplySchema,
      modelTier: env.aiModelSmart || env.aiModel,
    });

    // 3. Post reply as bot message
    const botMessage = await Message.create({
      conversation: conversationId,
      sender: botUser._id,
      replyTo: message._id,
      content: result.reply,
      aiCard: result.proposedAction
        ? {
            kind: 'action_proposal',
            payload: result.proposedAction,
          }
        : null,
    });

    const populated = await Message.findById(botMessage._id)
      .populate('sender', 'name username avatar')
      .populate('replyTo', 'content sender')
      .lean();

    if (socketIo) {
      socketIo.to(conversationId.toString()).emit('message:new', {
        conversationId: conversationId.toString(),
        message: populated,
      });
    }

    return populated;
  }

  /**
   * Private assistant chat thread
   */
  async chatPrivate({ userId, message, threadId = null }) {
    let thread = null;
    if (threadId) {
      thread = await AiThread.findOne({ _id: threadId, user: userId });
    }
    if (!thread) {
      thread = await AiThread.create({
        user: userId,
        title: message.slice(0, 30),
        messages: [],
      });
    }

    const conversationHistory = (thread.messages || [])
      .slice(-8)
      .map((m) => `${m.role === 'user' ? 'User' : 'ConnectX AI'}: ${m.content}`)
      .join('\n');

    const prompt = `
Previous Conversation:
${conversationHistory}

User: "${message}"

Respond helpfully. If proposing a task, reminder, or decision, include it in proposedAction.`;

    const result = await llmService.generateStructured({
      systemInstruction: ASSISTANT_SYSTEM_PROMPT,
      prompt: prompt,
      schema: assistantReplySchema,
      modelTier: env.aiModelSmart || env.aiModel,
    });

    thread.messages.push({ role: 'user', content: message });
    thread.messages.push({ role: 'model', content: result.reply });
    await thread.save();

    return {
      threadId: thread._id,
      reply: result.reply,
      proposedAction: result.proposedAction,
    };
  }
}

export const assistantService = new AssistantService();
export default assistantService;
