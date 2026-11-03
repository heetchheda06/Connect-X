import { z } from 'zod';
import crypto from 'crypto';
import Task from '../../models/task.model.js';
import Deadline from '../../models/deadline.model.js';
import Decision from '../../models/decision.model.js';
import User from '../../models/user.model.js';
import { contextGateway } from './contextGateway.js';
import { llmService } from './llmService.js';
import { PROMPT_INJECTION_DEFENSE } from './prompts.js';
import { env } from '../../config/env.js';

const insightsOutputSchema = z.object({
  tasks: z
    .array(
      z.preprocess(
        (val) => {
          if (typeof val === 'string') return { title: val };
          if (val && typeof val === 'object') {
            const copy = { ...val };
            copy.title = String(copy.title || copy.task || copy.name || copy.text || '').trim();
            copy.description = String(copy.description || copy.desc || copy.details || '').trim();
            const p = String(copy.priority || '').toLowerCase();
            copy.priority = ['low', 'medium', 'high', 'urgent'].includes(p) ? p : 'medium';
            return copy;
          }
          return val;
        },
        z.object({
          title: z.string().min(1),
          description: z.string().default(''),
          suggestedAssignee: z.any().transform((v) => (v ? String(v) : null)).default(null),
          dueAt: z.any().transform((v) => (v ? String(v) : null)).default(null),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
          confidence: z.any().transform((v) => {
            const n = Number(v);
            return isNaN(n) ? 0.8 : n > 1 ? n / 100 : n;
          }).default(0.8),
          sourceMessageId: z.any().transform((v) => (v ? String(v) : null)).default(null),
        })
      )
    )
    .default([]),
  deadlines: z
    .array(
      z.preprocess(
        (val) => {
          if (val && typeof val === 'object') {
            const copy = { ...val };
            copy.title = String(copy.title || copy.task || copy.name || '').trim();
            copy.dueAt = String(copy.dueAt || copy.date || copy.time || '').trim();
            return copy;
          }
          return val;
        },
        z.object({
          title: z.string().min(1),
          dueAt: z.string().default(''),
          confidence: z.any().transform((v) => {
            const n = Number(v);
            return isNaN(n) ? 0.8 : n > 1 ? n / 100 : n;
          }).default(0.8),
          sourceMessageId: z.any().transform((v) => (v ? String(v) : null)).default(null),
        })
      )
    )
    .default([]),
  decisions: z
    .array(
      z.preprocess(
        (val) => {
          if (typeof val === 'string') return { text: val };
          if (val && typeof val === 'object') {
            const copy = { ...val };
            copy.text = String(copy.text || copy.decision || copy.conclusion || '').trim();
            copy.context = String(copy.context || copy.details || '').trim();
            return copy;
          }
          return val;
        },
        z.object({
          text: z.string().min(1),
          context: z.string().default(''),
          proposedBy: z.any().transform((v) => (v ? String(v) : null)).default(null),
          confidence: z.any().transform((v) => {
            const n = Number(v);
            return isNaN(n) ? 0.8 : n > 1 ? n / 100 : n;
          }).default(0.8),
          sourceMessageId: z.any().transform((v) => (v ? String(v) : null)).default(null),
        })
      )
    )
    .default([]),
  openQuestions: z
    .array(
      z.preprocess(
        (val) => {
          if (typeof val === 'string') return { question: val };
          if (val && typeof val === 'object') {
            const copy = { ...val };
            copy.question = String(copy.question || copy.query || copy.prompt || '').trim();
            return copy;
          }
          return val;
        },
        z.object({
          question: z.string().min(1),
          askedBy: z.any().transform((v) => (v ? String(v) : null)).default(null),
          sourceMessageId: z.any().transform((v) => (v ? String(v) : null)).default(null),
        })
      )
    )
    .default([]),
});

const INSIGHTS_PROMPT = `
You are the ConnectX Shared Insight Pipeline.
Analyze the conversation messages in <chat_data> and extract actionable items in one structured pass:
1. "tasks": Actionable requests, todos, assignments, or commitments (e.g. "I will submit the deck", "Please review the PR", "Check the server").
2. "deadlines": Specific dates or times mentioned for tasks, launches, meetings or submissions.
3. "decisions": Clear agreements, conclusions, or consensus reached (e.g. "We agreed on Option B", "Launch is set for Nov 10").
4. "openQuestions": Unresolved queries or questions awaiting an answer.

RULES:
- Extract any action item, promise, task or request with reasonable confidence (>= 0.5).
- Output strictly valid JSON matching this exact structure:
{
  "tasks": [
    {
      "title": "Clear action title",
      "description": "Details or notes",
      "suggestedAssignee": "name or null",
      "dueAt": "ISO date string or null",
      "priority": "medium",
      "confidence": 0.85
    }
  ],
  "deadlines": [],
  "decisions": [],
  "openQuestions": []
}
${PROMPT_INJECTION_DEFENSE}
`;

function generateFingerprint(text) {
  const normalized = (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

export class InsightService {
  /**
   * Run the unified extraction pipeline over recent messages
   */
  async extractInsights({ conversationId, userId, range = 50, trigger = 'manual', socketIo = null }) {
    // 1. Build sanitized context through gateway
    const context = await contextGateway.buildAiContext({
      userId,
      conversationId,
      feature: 'task_extraction',
      trigger,
      range,
    });

    if (!context.messages || context.messages.length === 0) {
      return {
        tasks: [],
        deadlines: [],
        decisions: [],
        openQuestions: [],
        hiddenCount: context.hiddenCount,
      };
    }

    // 2. Call LLM for single-pass structured extraction
    const userPrompt = `Extract all tasks, deadlines, decisions, and open questions from the chat history above.`;

    const extracted = await llmService.generateStructured({
      systemInstruction: INSIGHTS_PROMPT,
      prompt: `${context.wrappedContext}\n\n${userPrompt}`,
      schema: insightsOutputSchema,
      modelTier: env.aiModelSmart || env.aiModel,
    });

    const now = new Date();
    const createdTasks = [];
    const createdDeadlines = [];
    const createdDecisions = [];

    // Helper map of conversation members by name/username for assignee resolution
    const convMembers = context.conversation?.members || [];
    const memberUsers = await User.find({
      _id: { $in: convMembers.map((m) => m.user) },
    }).select('name username');

    const resolveMember = (nameQuery) => {
      if (!nameQuery) return null;
      const q = nameQuery.toLowerCase().trim().replace(/^@/, '');
      const match = memberUsers.find(
        (u) =>
          u.username?.toLowerCase() === q ||
          u.name?.toLowerCase().includes(q) ||
          q.includes(u.name?.toLowerCase() || '___')
      );
      return match ? match._id : null;
    };

    // 3. Process & Deduplicate Tasks
    for (const t of extracted.tasks || []) {
      if (!t || !t.title || (t.confidence !== undefined && t.confidence < 0.5)) continue;
      const fp = generateFingerprint(t.title);

      const existing = await Task.findOne({
        conversation: conversationId,
        fingerprint: fp,
      });

      if (!existing) {
        const assigneeId = resolveMember(t.suggestedAssignee);
        let due = null;
        if (t.dueAt) {
          const d = new Date(t.dueAt);
          if (!isNaN(d.getTime())) due = d;
        }

        const newTask = await Task.create({
          conversation: conversationId,
          sourceMessages: t.sourceMessageId ? [t.sourceMessageId] : [],
          title: t.title,
          description: t.description,
          assignee: assigneeId,
          createdBy: userId,
          dueAt: due,
          status: 'suggested',
          priority: t.priority,
          confidence: t.confidence,
          origin: 'ai',
          fingerprint: fp,
        });
        createdTasks.push(newTask);
      }
    }

    // 4. Process & Deduplicate Deadlines
    for (const d of extracted.deadlines || []) {
      if (d.confidence < 0.6) continue;
      const dueDate = new Date(d.dueAt);
      if (isNaN(dueDate.getTime())) continue;

      const existing = await Deadline.findOne({
        conversation: conversationId,
        title: d.title,
        dueAt: dueDate,
      });

      if (!existing) {
        const newDeadline = await Deadline.create({
          conversation: conversationId,
          sourceMessage: d.sourceMessageId || null,
          title: d.title,
          dueAt: dueDate,
          status: 'suggested',
          confidence: d.confidence,
        });
        createdDeadlines.push(newDeadline);
      }
    }

    // 5. Process & Deduplicate Decisions
    for (const dec of extracted.decisions || []) {
      if (dec.confidence < 0.6) continue;
      const fp = generateFingerprint(dec.text);

      const existing = await Decision.findOne({
        conversation: conversationId,
        fingerprint: fp,
      });

      if (!existing) {
        const proposerId = resolveMember(dec.proposedBy);
        const newDecision = await Decision.create({
          conversation: conversationId,
          text: dec.text,
          context: dec.context,
          proposedBy: proposerId,
          sourceMessages: dec.sourceMessageId ? [dec.sourceMessageId] : [],
          status: 'proposed',
          confidence: dec.confidence,
          fingerprint: fp,
        });
        createdDecisions.push(newDecision);
      }
    }

    // 6. Emit insights:updated socket event
    if (socketIo) {
      socketIo.to(conversationId.toString()).emit('insights:updated', {
        conversationId: conversationId.toString(),
        counts: {
          newTasks: createdTasks.length,
          newDeadlines: createdDeadlines.length,
          newDecisions: createdDecisions.length,
        },
      });
    }

    return {
      tasks: createdTasks,
      deadlines: createdDeadlines,
      decisions: createdDecisions,
      openQuestions: extracted.openQuestions || [],
      hiddenCount: context.hiddenCount,
    };
  }
}

export const insightService = new InsightService();
export default insightService;
