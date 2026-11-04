import User from '../../models/user.model.js';
import Conversation from '../../models/conversation.model.js';
import Message from '../../models/message.model.js';
import AiActivity from '../../models/aiActivity.model.js';
import { redactionService } from './redactionService.js';
import { wrapChatData } from './prompts.js';

export const FEATURE_SETTING_KEYS = {
  translation: 'enabled',
  smart_replies: 'smartReplies',
  tone_assist: 'enabled',
  voice_transcription: 'enabled',
  reminder_parse: 'enabled',
  summary: 'summaries',
  task_extraction: 'taskExtraction',
  deadline_detection: 'deadlineDetection',
  decision_extraction: 'decisionExtraction',
  ask_chat: 'askChat',
  assistant: 'assistant',
  document_analysis: 'documentAnalysis',
  meeting_mode: 'meetingMode',
  semantic_search: 'semanticSearch',
  study_mode: 'studyMode',
  analytics: 'analytics',
};

export class ContextGateway {
  /**
   * Primary entry point for AI to read chat messages with consent, membership,
   * opt-out filtering, redaction and audit logging.
   */
  async buildAiContext({
    userId,
    conversationId,
    feature,
    trigger = 'manual',
    range = 50,
    query = null,
  }) {
    // 1. Verify user exists and check master and feature toggles
    const user = await User.findById(userId).select('aiSettings name username');
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    if (user.aiSettings && user.aiSettings.enabled === false && !['tone_assist', 'ask_chat'].includes(feature)) {
      const err = new Error('AI features are disabled in your personal settings.');
      err.status = 403;
      err.code = 'AI_DISABLED_USER';
      throw err;
    }

    const featureKey = FEATURE_SETTING_KEYS[feature];
    if (featureKey && user.aiSettings?.[featureKey] === false) {
      const err = new Error(`The "${feature}" feature is disabled in your AI settings.`);
      err.status = 403;
      err.code = 'AI_FEATURE_DISABLED';
      throw err;
    }

    // 2. Verify conversation and AI mode
    const conversation = await Conversation.findById(conversationId).select('type members ai optOutMembers');
    if (!conversation) {
      const err = new Error('Conversation not found');
      err.status = 404;
      throw err;
    }

    const isMember = conversation.members?.some(
      (m) => m.user?.toString() === userId.toString()
    );
    if (!isMember) {
      const err = new Error('You are not a member of this conversation');
      err.status = 403;
      throw err;
    }

    const mode = conversation.ai?.mode || 'on_demand';

    // In direct chats, if mode is off, allow tone assist only
    if (mode === 'off' && feature !== 'tone_assist') {
      const err = new Error('AI is turned off for this chat. Turn on AI in chat settings to use this feature.');
      err.status = 403;
      err.code = 'AI_CHAT_OFF';
      throw err;
    }

    if (mode === 'on_demand' && trigger === 'auto') {
      const err = new Error('Background AI triggers are not permitted in on-demand mode.');
      err.status = 403;
      err.code = 'AI_TRIGGER_REJECTED';
      throw err;
    }

    // 3. Determine member opt-outs
    const conversationOptOuts = (conversation.optOutMembers || []).map((id) => id.toString());

    // 4. Load messages (capped by range, max 200 for single turn)
    const limit = Math.min(Math.max(range, 5), 200);
    const rawMessages = await Message.find({
      conversation: conversationId,
      isDeletedForEveryone: false,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name username aiSettings')
      .lean();

    const chronological = [...rawMessages].reverse();

    let hiddenCount = 0;
    const sanitizedMessages = [];
    const formattedLines = [];

    const shouldRedact = user.aiSettings?.redactionEnabled !== false;

    for (const msg of chronological) {
      const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
      const isSenderOptedOut =
        conversationOptOuts.includes(senderId) ||
        msg.sender?.aiSettings?.excludeMyMessages === true;

      const senderName = msg.sender?.name || msg.sender?.username || 'User';

      if (isSenderOptedOut) {
        hiddenCount++;
        formattedLines.push(`[${senderName}]: [message hidden by sender opt-out]`);
        continue;
      }

      // Apply redaction to content
      let text = msg.content || '';
      if (text && shouldRedact) {
        text = redactionService.redact(text);
      }

      if (msg.type === 'voice') {
        text = text ? `[Voice Note: ${text}]` : '[Voice Note]';
      } else if (msg.type === 'image') {
        text = text ? `[Image: ${text}]` : '[Image attachment]';
      } else if (msg.type === 'file') {
        text = text ? `[File (${msg.attachment?.name || 'document'}): ${text}]` : `[File: ${msg.attachment?.name || 'document'}]`;
      }

      sanitizedMessages.push({
        _id: msg._id,
        senderId,
        senderName,
        content: text,
        createdAt: msg.createdAt,
        type: msg.type,
      });

      formattedLines.push(`[${senderName}]: ${text}`);
    }

    // 5. Wrap in safe <chat_data> security tags
    const joinedContent = formattedLines.join('\n');
    const wrappedContext = wrapChatData(joinedContent, `${feature}_context`);

    // 6. Record audit log in AiActivity (never records message content!)
    await AiActivity.create({
      user: userId,
      conversation: conversationId,
      feature,
      trigger,
      messageCount: sanitizedMessages.length,
      tokensUsed: Math.ceil(joinedContent.length / 4), // Approximate tokens
      timestamp: new Date(),
    });

    const notice =
      hiddenCount > 0
        ? `${hiddenCount} message${hiddenCount > 1 ? 's were' : ' was'} hidden from AI by sender opt-out.`
        : null;

    return {
      messages: sanitizedMessages,
      hiddenCount,
      notice,
      rawFormatted: joinedContent,
      wrappedContext,
      user,
      conversation,
    };
  }

  /**
   * Express middleware to verify user has AI enabled for the given feature
   */
  requireAiAccess(feature) {
    return async (req, res, next) => {
      try {
        const user = await User.findById(req.user._id).select('aiSettings');
        if (!user || !user.aiSettings?.enabled) {
          return res.status(403).json({
            success: false,
            message: 'AI features are disabled in your settings.',
            code: 'AI_DISABLED',
            data: null,
          });
        }

        const key = FEATURE_SETTING_KEYS[feature];
        if (key && user.aiSettings?.[key] === false) {
          return res.status(403).json({
            success: false,
            message: `Feature "${feature}" is disabled in your settings.`,
            code: 'FEATURE_DISABLED',
            data: null,
          });
        }

        next();
      } catch (err) {
        next(err);
      }
    };
  }
}

export const contextGateway = new ContextGateway();
export default contextGateway;
