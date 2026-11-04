import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import messageRoutes from './routes/message.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import aiRoutes from './routes/ai.routes.js';
import reminderRoutes from './routes/reminder.routes.js';
import taskRoutes from './routes/task.routes.js';
import decisionRoutes from './routes/decision.routes.js';
import deadlineRoutes from './routes/deadline.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import studyRoutes from './routes/study.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import conversationStateRoutes from './routes/conversationState.routes.js';
import contactRoutes from './routes/contact.routes.js';
import blockRoutes from './routes/block.routes.js';
import reportRoutes from './routes/report.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import stickerRoutes from './routes/sticker.routes.js';
import callRoutes from './routes/call.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { getGridFSBucket } from './services/storage.service.js';
import { httpLogger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  // Structured HTTP Request Logging with sensitive data redaction
  app.use(httpLogger);

  // Direct Health and Readiness Probes for Cloud / Container orchestrators
  app.use('/', healthRoutes);

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  const allowedOrigins = [
    env.clientUrl,
    'https://connect-x-1af38.web.app',
    'https://connect-x-1af38.firebaseapp.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean);

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.web.app') || origin.endsWith('.firebaseapp.com')) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing with size limit
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Sanitize data against NoSQL injection
  app.use(mongoSanitize());

  // General rate limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes',
      data: null,
    },
  });
  app.use('/api', limiter);

  // Static uploads directory (serves local cached files)
  const uploadsDir = path.join(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Fallback for files missing from ephemeral disk (fetches from MongoDB GridFS)
  app.get('/uploads/:filename', async (req, res, next) => {
    try {
      const filename = path.basename(req.params.filename);
      const bucket = getGridFSBucket();
      if (!bucket) return next();

      const files = await bucket.find({ filename }).toArray();
      if (!files || files.length === 0) {
        return next();
      }

      const fileDoc = files[0];
      res.setHeader('Content-Type', fileDoc.contentType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days cache

      // Cache to disk asynchronously for fast subsequent requests
      const localFilePath = path.join(uploadsDir, filename);
      const diskWriteStream = fs.createWriteStream(localFilePath);
      const diskDownloadStream = bucket.openDownloadStreamByName(filename);
      diskDownloadStream.pipe(diskWriteStream).on('error', () => {});

      // Stream to HTTP response
      const resDownloadStream = bucket.openDownloadStreamByName(filename);
      resDownloadStream.pipe(res);
    } catch (err) {
      next(err);
    }
  });

  // Mount API routes
  app.use('/api', healthRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/reminders', reminderRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/decisions', decisionRoutes);
  app.use('/api/deadlines', deadlineRoutes);
  app.use('/api/meetings', meetingRoutes);
  app.use('/api/study', studyRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api', conversationStateRoutes);
  app.use('/api/contacts', contactRoutes);
  app.use('/api/blocks', blockRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/stickers', stickerRoutes);
  app.use('/api/calls', callRoutes);

  // 404 & Centralized error handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
