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
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { getGridFSBucket } from './services/storage.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

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
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/uploads', uploadRoutes);

  // 404 & Centralized error handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
