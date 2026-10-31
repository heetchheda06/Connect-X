import User from '../models/user.model.js';
import { SUPPORTED_LANGUAGES, isValidTargetLanguage } from '../services/ai/languages.js';
import { translationService } from '../services/ai/translationService.js';
import { smartReplyService } from '../services/ai/smartReplyService.js';
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


