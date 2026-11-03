import { z } from 'zod';
import Meeting from '../../models/meeting.model.js';
import Message from '../../models/message.model.js';
import Task from '../../models/task.model.js';
import Decision from '../../models/decision.model.js';
import { llmService } from './llmService.js';
import { contextGateway } from './contextGateway.js';
import { wrapChatData, PROMPT_INJECTION_DEFENSE } from './prompts.js';
import { env } from '../../config/env.js';

const meetingMinutesSchema = z.object({
  summary: z.string().default(''),
  topics: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  actionItems: z
    .array(
      z.object({
        task: z.string(),
        owner: z.string().nullable().default(null),
        dueAt: z.string().nullable().default(null),
      })
    )
    .default([]),
  openQuestions: z.array(z.string()).default([]),
});

const MEETING_MINUTES_PROMPT = `
You are the ConnectX Meeting Minutes Assistant.
Generate comprehensive, structured meeting minutes from the provided meeting messages in <chat_data>.

RULES:
1. "summary": Executive summary of the meeting.
2. "topics": List of distinct topics discussed.
3. "decisions": Clear agreements, conclusions, or consensus reached.
4. "actionItems": Commitments made, assignees (owners) and proposed due dates.
5. "openQuestions": Items deferred for next meeting or pending questions.
${PROMPT_INJECTION_DEFENSE}
`;

export class MeetingService {
  /**
   * Start a meeting
   */
  async startMeeting({ conversationId, hostId, title, agenda = '', mode = 'chat', socketIo = null }) {
    const meeting = await Meeting.create({
      conversation: conversationId,
      host: hostId,
      title: title.trim(),
      agenda: agenda.trim(),
      mode,
      participants: [{ user: hostId, joinedAt: new Date() }],
      status: 'live',
    });

    const populated = await Meeting.findById(meeting._id)
      .populate('host', 'name username avatar')
      .lean();

    if (socketIo) {
      socketIo.to(conversationId.toString()).emit('meeting:started', { meeting: populated });
    }

    return populated;
  }

  /**
   * Join a meeting
   */
  async joinMeeting({ meetingId, userId, socketIo = null }) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting || meeting.status !== 'live') {
      const err = new Error('Live meeting not found');
      err.status = 404;
      throw err;
    }

    const alreadyJoined = meeting.participants.some(
      (p) => p.user.toString() === userId.toString() && !p.leftAt
    );
    if (!alreadyJoined) {
      meeting.participants.push({ user: userId, joinedAt: new Date() });
      await meeting.save();
    }

    if (socketIo) {
      socketIo.to(meeting.conversation.toString()).emit('meeting:participant', {
        meetingId: meeting._id,
        userId,
        status: 'joined',
      });
    }

    return meeting;
  }

  /**
   * End a meeting and generate minutes
   */
  async endMeeting({ meetingId, userId, socketIo = null }) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      const err = new Error('Meeting not found');
      err.status = 404;
      throw err;
    }

    meeting.endedAt = new Date();
    meeting.status = 'processing';
    await meeting.save();

    // 1. Fetch messages sent during the meeting window
    const meetingMessages = await Message.find({
      conversation: meeting.conversation,
      createdAt: { $gte: meeting.startedAt, $lte: meeting.endedAt },
      isDeletedForEveryone: false,
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name username')
      .lean();

    const formattedLines = meetingMessages.map(
      (m) => `[${m.sender?.name || m.sender?.username || 'Member'}]: ${m.content || '[Attachment]'}`
    );

    const wrappedNotes = wrapChatData(
      formattedLines.join('\n') || `Meeting "${meeting.title}" held on ${meeting.startedAt}. Agenda: ${meeting.agenda}`,
      'meeting_chat_notes'
    );

    const userPrompt = `Generate structured meeting minutes for "${meeting.title}".`;

    const minutesRes = await llmService.generateStructured({
      systemInstruction: MEETING_MINUTES_PROMPT,
      prompt: `${wrappedNotes}\n\n${userPrompt}`,
      schema: meetingMinutesSchema,
      modelTier: env.aiModelSmart || env.aiModel,
    });

    const parsedActionItems = (minutesRes.actionItems || []).map((ai) => ({
      task: ai.task,
      owner: ai.owner,
      dueAt: ai.dueAt ? new Date(ai.dueAt) : null,
    }));

    meeting.minutes = {
      summary: minutesRes.summary,
      topics: minutesRes.topics || [],
      decisions: minutesRes.decisions || [],
      actionItems: parsedActionItems,
      openQuestions: minutesRes.openQuestions || [],
    };
    meeting.status = 'ready';
    await meeting.save();

    const populated = await Meeting.findById(meeting._id)
      .populate('host', 'name username avatar')
      .lean();

    if (socketIo) {
      socketIo.to(meeting.conversation.toString()).emit('meeting:ended', { meeting: populated });
      socketIo.to(meeting.conversation.toString()).emit('meeting:minutes-ready', {
        meetingId: meeting._id,
        minutes: meeting.minutes,
      });
    }

    return populated;
  }

  /**
   * Export meeting minutes as Markdown
   */
  async exportMarkdown(meetingId) {
    const meeting = await Meeting.findById(meetingId)
      .populate('host', 'name')
      .lean();
    if (!meeting) throw new Error('Meeting not found');

    const m = meeting.minutes || {};
    let md = `# Meeting Minutes: ${meeting.title}\n\n`;
    md += `**Host**: ${meeting.host?.name || 'Host'}\n`;
    md += `**Date**: ${new Date(meeting.startedAt).toLocaleString()}\n`;
    if (meeting.agenda) md += `**Agenda**: ${meeting.agenda}\n\n`;

    md += `## Summary\n${m.summary || 'N/A'}\n\n`;

    if (m.topics?.length) {
      md += `## Topics Discussed\n`;
      m.topics.forEach((t) => (md += `- ${t}\n`));
      md += '\n';
    }

    if (m.decisions?.length) {
      md += `## Decisions\n`;
      m.decisions.forEach((d) => (md += `- ${d}\n`));
      md += '\n';
    }

    if (m.actionItems?.length) {
      md += `## Action Items\n`;
      m.actionItems.forEach((a) => (md += `- **${a.task}** (Owner: ${a.owner || 'Unassigned'})\n`));
      md += '\n';
    }

    return md;
  }
}

export const meetingService = new MeetingService();
export default meetingService;
