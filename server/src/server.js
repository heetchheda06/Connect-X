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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate critical environment variables
validateEnv();

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

// Provide io instance to express app for REST-triggered broadcasts
app.set('io', io);

const PORT = env.port;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [ConnectX Server] Listening on 0.0.0.0:${PORT}`);
  console.log(`🌿 [Environment] ${env.nodeEnv}`);
});
