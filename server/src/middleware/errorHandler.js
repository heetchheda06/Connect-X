export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    data: null,
  });
};

export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]', err);

  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Internal server error';

  // Sanitize raw Google Gemini API quota/rate limit error JSON
  if (typeof message === 'string') {
    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('quota') || /429/.test(message)) {
      statusCode = 429;
      message = 'AI daily quota limit reached on the Free Tier. Please try again tomorrow or upgrade your Gemini API key.';
    } else if (message.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(message);
        if (parsed.error?.message) {
          if (parsed.error?.code === 429 || parsed.error?.status === 'RESOURCE_EXHAUSTED') {
            statusCode = 429;
            message = 'AI daily quota limit reached on the Free Tier. Please try again tomorrow or upgrade your Gemini API key.';
          } else {
            message = parsed.error.message;
          }
        }
      } catch (_) {}
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
