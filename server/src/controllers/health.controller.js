import mongoose from 'mongoose';
import { env } from '../config/env.js';
import emailService from '../services/emailService.js';

const dbStatusMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * Liveness Probe: Returns 200 if the server process is responsive and healthy.
 */
export const getHealth = (req, res) => {
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    success: true,
    message: 'ConnectX Server is alive and responsive',
    data: {
      status: 'healthy',
      service: 'ConnectX API Server',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: env.nodeEnv,
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      },
    },
  });
};

/**
 * Readiness Probe: Checks whether database, background services, and dependencies are ready to accept traffic.
 */
export const getReady = async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbReady = dbState === 1;
  const emailWorker = emailService.getHealthStatus();

  const isReady = isDbReady;

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    message: isReady
      ? 'ConnectX Server is fully initialized and ready to handle traffic'
      : 'ConnectX Server is degraded or pending readiness checks',
    data: {
      status: isReady ? 'ready' : 'not_ready',
      database: {
        status: dbStatusMap[dbState] || 'unknown',
        readyState: dbState,
        connected: isDbReady,
      },
      emailWorker,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
    },
  });
};
