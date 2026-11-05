import pino from 'pino';
import pinoHttp from 'pino-http';
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Redaction configuration to ensure secrets, passwords, tokens and message contents are never logged
const redactionKeys = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-auth-token"]',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.confirmPassword',
  'req.body.token',
  'req.body.tokenHash',
  'req.body.refreshToken',
  'req.body.accessToken',
  'req.body.idToken',
  'req.body.secret',
  'req.body.content',
  'req.body.text',
  'req.body.message',
  '*.password',
  '*.token',
  '*.secret',
];

// Base Pino logger instance
export const logger = pino({
  level: logLevel,
  redact: {
    paths: redactionKeys,
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// HTTP Request logging middleware
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => {
    return (
      req.headers['x-request-id'] ||
      req.headers['x-correlation-id'] ||
      crypto.randomUUID()
    );
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    if (req.url === '/health' || req.url === '/ready' || req.url === '/api/health') return 'debug';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} -> ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed with status ${res.statusCode}: ${err.message}`;
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      ip: req.ip || req.headers['x-forwarded-for'],
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

export default logger;

