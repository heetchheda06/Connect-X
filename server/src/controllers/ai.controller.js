import User from '../models/user.model.js';
import AiThread from '../models/aiThread.model.js';
import { SUPPORTED_LANGUAGES, isValidTargetLanguage } from '../services/ai/languages.js';
import { translationService } from '../services/ai/translationService.js';
import { smartReplyService } from '../services/ai/smartReplyService.js';
import { voiceService } from '../services/ai/voiceService.js';
import { summaryService } from '../services/ai/summaryService.js';
import { askChatService } from '../services/ai/askChatService.js';
import { assistantService } from '../services/ai/assistantService.js';
import { documentService } from '../services/ai/documentService.js';
import { semanticSearchService } from '../services/ai/semanticSearchService.js';
import { env } from '../config/env.js';

/**
 * Get AI Settings for the current user
 * GET /api/ai/settings
 */
export const getAiSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('aiSettings');
    const settings = user?.aiSettings || {
      enabled: false,
      preferredLanguage: 'en',
      timezone: 'Asia/Kolkata',
      smartReplies: true,
      autoTranslateConversations: [],
    };

    return res.status(200).json({
      success: true,
      message: 'AI settings retrieved successfully',
      data: { settings },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update AI Settings for the current user
 * PUT /api/ai/settings
 */
export const updateAiSettings = async (req, res, next) => {
  try {
    const {
      enabled,
      preferredLanguage,
      timezone,
      smartReplies,
      autoTranslateConversations,
    } = req.body;

    const updates = {};

    if (typeof enabled === 'boolean') {
      updates['aiSettings.enabled'] = enabled;
    }

    if (preferredLanguage !== undefined) {
      if (!isValidTargetLanguage(preferredLanguage)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported target language code "${preferredLanguage}".`,
          data: null,
        });
      }
      updates['aiSettings.preferredLanguage'] = preferredLanguage.toLowerCase().trim();
    }

    if (timezone !== undefined && typeof timezone === 'string') {
      updates['aiSettings.timezone'] = timezone.trim() || 'Asia/Kolkata';
    }

    if (typeof smartReplies === 'boolean') {
      updates['aiSettings.smartReplies'] = smartReplies;
    }

    if (Array.isArray(autoTranslateConversations)) {
      updates['aiSettings.autoTranslateConversations'] = autoTranslateConversations;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      message: 'AI settings updated successfully',
      data: {
        settings: updatedUser.aiSettings,
        user: updatedUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get supported translation and conversation languages
 * GET /api/ai/languages
 */
export const getSupportedLanguages = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Supported languages retrieved successfully',
    data: {
      languages: SUPPORTED_LANGUAGES,
    },
  });
};

/**
 * Get configured AI provider info and policy URLs for transparency
 * GET /api/ai/providers
 */
export const getAiProviders = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'AI providers information retrieved successfully',
    data: {
      llmProvider: env.aiProvider,
      sttProvider: env.sttProvider,
      embeddingProvider: env.embeddingProvider,
      policies: env.providerPolicyUrls,
      models: {
        default: env.aiModel,
        fast: env.aiModelFast,
        smart: env.aiModelSmart,
        stt: env.sttModel,
      },
      retentionDays: env.aiRetentionDefaultDays,
    },
  });
};

/**
 * Translate a single message
 * POST /api/ai/translate
 */
export const translateMessage = async (req, res, next) => {
  try {
    const { messageId, targetLang } = req.body;
    const result = await translationService.translateMessage({
      messageId,
      targetLang,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Translation completed',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Batch translate visible messages in a conversation
 * POST /api/ai/translate/batch
 */
export const translateBatch = async (req, res, next) => {
  try {
    const { messageIds, targetLang } = req.body;
    const result = await translationService.translateBatch({
      messageIds,
      targetLang,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Batch translation completed',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Generate contextual smart replies for a direct conversation
 * POST /api/ai/smart-replies
 */
export const getSmartReplies = async (req, res, next) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'conversationId is required',
        data: { suggestions: [] },
      });
    }

    const result = await smartReplyService.generateSmartReplies({
      conversationId,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Smart replies generated',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Rewrite a message draft with tone assist
 * POST /api/ai/rewrite
 */
export const rewriteDraft = async (req, res, next) => {
  try {
    const { text, tone, isRetry } = req.body;
    const result = await smartReplyService.rewriteTone({
      text,
      tone,
      userId: req.user._id,
      isRetry: Boolean(isRetry),
    });

    return res.status(200).json({
      success: true,
      message: 'Draft rewritten successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Transcribe a voice note and generate summary
 * POST /api/ai/transcribe
 */
export const transcribeVoiceMessage = async (req, res, next) => {
  try {
    const { messageId } = req.body;
    const io = req.app.get('io');
    const result = await voiceService.transcribeMessage({
      messageId,
      userId: req.user._id,
      socketIo: io,
    });

    return res.status(200).json({
      success: true,
      message: 'Transcription completed',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Generate Catch-Up summary for conversation
 * POST /api/ai/summary
 */
export const generateCatchUpSummary = async (req, res, next) => {
  try {
    const { conversationId, style = 'brief', range = 50 } = req.body;
    const result = await summaryService.generateSummary({
      conversationId,
      userId: req.user._id,
      style,
      range: Number(range),
    });

    return res.status(200).json({
      success: true,
      message: 'Catch-Up summary generated',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Share summary card to conversation chat
 * POST /api/ai/summary/:id/share
 */
export const shareSummaryCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const io = req.app.get('io');
    const message = await summaryService.shareSummaryToChat({
      summaryId: id,
      userId: req.user._id,
      socketIo: io,
    });

    return res.status(200).json({
      success: true,
      message: 'Summary shared to chat',
      data: { message },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Ask This Chat Q&A
 * POST /api/ai/ask
 */
export const askThisChat = async (req, res, next) => {
  try {
    const { conversationId, question, threadId } = req.body;
    const result = await askChatService.ask({
      conversationId,
      userId: req.user._id,
      question,
      threadId,
    });

    return res.status(200).json({
      success: true,
      message: 'Answer generated',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Ask AI Q&A Thread history for a conversation
 * GET /api/ai/ask/thread/:conversationId
 */
export const getAskThread = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const thread = await AiThread.findOne({
      user: req.user._id,
      conversation: conversationId,
    }).sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Thread history retrieved',
      data: {
        threadId: thread ? thread._id : null,
        messages: thread ? thread.messages : [],
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Clear Ask AI Q&A Thread history for a conversation
 * DELETE /api/ai/ask/thread/:conversationId
 */
export const clearAskThread = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    await AiThread.deleteMany({
      user: req.user._id,
      conversation: conversationId,
    });

    return res.status(200).json({
      success: true,
      message: 'Thread history cleared',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Private ConnectX AI Assistant Chat
 * POST /api/ai/assistant
 */
export const chatAssistant = async (req, res, next) => {
  try {
    const { message, threadId } = req.body;
    const result = await assistantService.chatPrivate({
      userId: req.user._id,
      message,
      threadId,
    });

    return res.status(200).json({
      success: true,
      message: 'Assistant response generated',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * AI Document Analysis
 * POST /api/ai/documents/analyze
 */
export const analyzeDocument = async (req, res, next) => {
  try {
    const { messageId } = req.body;
    const result = await documentService.analyzeDocument({
      messageId,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Document analyzed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Ask Document Q&A
 * POST /api/ai/documents/ask
 */
export const askDocument = async (req, res, next) => {
  try {
    const { messageId, question } = req.body;
    const result = await documentService.askDocument({
      messageId,
      question,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Document answered',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Search AI messages (hybrid & semantic)
 * GET /api/ai/search
 */
export const searchAiMessages = async (req, res, next) => {
  try {
    const { q, conversationId, mode = 'hybrid' } = req.query;
    const result = await semanticSearchService.searchMessages({
      query: q,
      userId: req.user._id,
      conversationId,
      mode,
    });

    return res.status(200).json({
      success: true,
      message: 'Search completed',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Ask All My Chats
 * POST /api/ai/ask-all
 */
export const askAllMyChats = async (req, res, next) => {
  try {
    const { question } = req.body;
    const result = await semanticSearchService.askAllMyChats({
      userId: req.user._id,
      question,
    });

    return res.status(200).json({
      success: true,
      message: 'Answer across chats generated',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};





