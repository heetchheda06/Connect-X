import rateLimit from 'express-rate-limit';

const keyGenerator = (req) => {
  return req.user?._id?.toString() || req.ip;
};

const createAiLimiter = (windowMs, max, featureName) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: `AI rate limit reached for ${featureName}. Please wait a little while before trying again.`,
      code: 'RATE_LIMIT_EXCEEDED',
      data: null,
    },
  });
};

// 60 translations per hour per user
export const translateLimiter = createAiLimiter(60 * 60 * 1000, 60, 'Translation');

// 60 smart reply batches per hour per user
export const smartRepliesLimiter = createAiLimiter(60 * 60 * 1000, 60, 'Smart Replies');

// 40 tone rewrites per hour per user
export const toneLimiter = createAiLimiter(60 * 60 * 1000, 40, 'Tone Assist');

// 20 voice transcriptions per day per user
export const transcribeLimiter = createAiLimiter(24 * 60 * 60 * 1000, 20, 'Voice Transcription');

// 40 reminder parses per hour per user
export const reminderParseLimiter = createAiLimiter(60 * 60 * 1000, 40, 'Reminder Parsing');

// 60 general AI calls per hour per user
export const generalAiLimiter = createAiLimiter(60 * 60 * 1000, 60, 'AI Service');

