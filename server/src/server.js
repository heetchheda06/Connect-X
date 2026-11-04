import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import { env, validateEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { socketAuthMiddleware } from './sockets/socket.auth.js';
import { registerSocketHandlers } from './sockets/socket.handler.js';
import { initFirebaseAdmin } from './config/firebaseAdmin.js';
import { reminderScheduler } from './services/reminderScheduler.js';
import { emailService } from './services/emailService.js';
import { setupGracefulShutdown } from './utils/shutdown.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate critical environment variables
validateEnv();

// Initialize Firebase Admin SDK
initFirebaseAdmin();

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Connect to MongoDB
await connectDB();

const app = createApp();
const httpServer = http.createServer(app);

// Setup Socket.IO
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Register Socket.IO authentication and handlers
io.use(socketAuthMiddleware);
registerSocketHandlers(io);

// Start background schedulers and queue workers
reminderScheduler.start(io);
emailService.startQueueWorker();

// Provide io instance to express app for REST-triggered broadcasts
app.set('io', io);

// Register graceful shutdown handlers
setupGracefulShutdown(httpServer, io);

const PORT = env.port;
httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT, env: env.nodeEnv }, '🚀 ConnectX Server running');
});
