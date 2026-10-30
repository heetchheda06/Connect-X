import mongoose from 'mongoose';
import { env } from '../config/env.js';

export const getHealth = (req, res) => {
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = mongoose.connection.readyState;
  const isDbHealthy = dbState === 1;

  res.status(isDbHealthy ? 200 : 503).json({
    success: isDbHealthy,
    message: isDbHealthy
      ? 'ConnectX API is running smoothly'
      : 'ConnectX API is running, but database connection is pending or disconnected',
    data: {
      status: isDbHealthy ? 'healthy' : 'degraded',
      service: 'ConnectX API Server',
      database: dbStatusMap[dbState] || 'unknown',
      environment: env.nodeEnv,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
};
