import mongoose from 'mongoose';
import logger from './logger.js';
import emailService from '../services/emailService.js';
import { reminderScheduler } from '../services/reminderScheduler.js';

let isShuttingDown = false;

/**
 * Registers graceful shutdown handlers for process termination signals and uncaught exceptions.
 *
 * @param {import('http').Server} httpServer
 * @param {import('socket.io').Server} io
 */
export function setupGracefulShutdown(httpServer, io) {
  const shutdown = async (signal, exitCode = 0) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, 'Graceful shutdown initiated. Stopping services...');

    // 1. Force timeout in case tasks take too long
    const forceExitTimeout = setTimeout(() => {
      logger.error('Shutdown timed out after 10s. Forcing exit.');
      process.exit(1);
    }, 10000);
    forceExitTimeout.unref();

    try {
      // 2. Stop accepting new HTTP connections
      if (httpServer) {
        await new Promise((resolve) => {
          httpServer.close((err) => {
            if (err) logger.warn({ err }, 'Error closing HTTP server');
            else logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // 3. Notify and close Socket.IO connections
      if (io) {
        logger.info('Notifying and disconnecting Socket.IO clients');
        io.emit('server:shutdown', {
          message: 'Server is restarting for maintenance. Reconnecting shortly...',
        });
        io.disconnectSockets(true);
      }

      // 4. Stop background workers and schedulers
      emailService.stopQueueWorker();
      if (reminderScheduler && typeof reminderScheduler.stop === 'function') {
        reminderScheduler.stop();
      }

      // 5. Close MongoDB database connection
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        logger.info('MongoDB connection closed gracefully');
      }

      logger.info('Graceful shutdown completed successfully.');
      process.exit(exitCode);
    } catch (err) {
      logger.error({ err }, 'Error occurred during graceful shutdown');
      process.exit(1);
    }
  };

  // Signal listeners
  process.on('SIGTERM', () => shutdown('SIGTERM', 0));
  process.on('SIGINT', () => shutdown('SIGINT', 0));

  // Global error safety
  process.on('uncaughtException', (err) => {
    logger.fatal({ err: err.message, stack: err.stack }, 'Uncaught Exception detected!');
    shutdown('uncaughtException', 1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason }, 'Unhandled Promise Rejection detected');
  });
}

export default setupGracefulShutdown;
