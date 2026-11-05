import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import EmailJob from '../models/emailJob.model.js';
import emailTemplates from '../emails/templates.js';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.workerInterval = null;
    this.isProcessing = false;
    this.initTransporter();
  }

  /**
   * Initializes the Nodemailer transporter based on environment configuration.
   */
  initTransporter() {
    if (env.smtpHost && env.smtpUser) {
      this.transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass,
        },
      });
      logger.info(
        { host: env.smtpHost, port: env.smtpPort, secure: env.smtpSecure },
        'Nodemailer SMTP transporter initialized'
      );
    } else {
      // In development / local testing without SMTP credentials, use a mock stream / logger transport
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows',
      });
      logger.info('No external SMTP configured. Using development transport (simulated deliveries logged safely).');
    }
  }

  /**
   * Directly sends an email (synchronous). Useful for immediate testing or verification.
   *
   * @param {object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.template - Template key from emailTemplates
   * @param {object} options.data - Template interpolation data
   * @returns {Promise<object>}
   */
  async sendEmailDirect({ to, template, data }) {
    if (!to || !template) {
      throw new Error('Recipient "to" and "template" name are required');
    }

    const templateFn = emailTemplates[template];
    if (!templateFn) {
      throw new Error(`Email template "${template}" does not exist`);
    }

    const { subject, html, text } = templateFn(data);

    const mailOptions = {
      from: env.emailFrom,
      to,
      subject,
      html,
      text,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(
        { to, template, messageId: info.messageId },
        'Email delivered successfully'
      );
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error(
        { to, template, error: err.message },
        'Failed to deliver direct email'
      );
      throw err;
    }
  }

  /**
   * Non-blocking: Queues an email for background delivery with retries and backoff.
   *
   * @param {object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.template - Template key
   * @param {object} options.data - Template variables (never stores raw sensitive secrets)
   * @returns {Promise<object>} Created EmailJob document
   */
  async queueEmail({ to, template, data = {} }) {
    if (!to || !template) {
      throw new Error('Recipient "to" and "template" name are required');
    }

    const templateFn = emailTemplates[template];
    if (!templateFn) {
      throw new Error(`Email template "${template}" does not exist`);
    }

    const { subject } = templateFn(data);

    const job = await EmailJob.create({
      to,
      subject,
      template,
      data,
      status: 'pending',
      nextRunAt: new Date(),
    });

    logger.debug({ jobId: job._id, to, template }, 'Email job enqueued');

    // Trigger immediate check so low-frequency emails are sent with zero delay
    setImmediate(() => this.processNextJob());

    return job;
  }

  /**
   * Background Queue Worker: Atomically claims and processes pending email jobs.
   */
  async processNextJob() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Atomic claim to guarantee safe multi-worker execution without duplicate delivery
      const job = await EmailJob.findOneAndUpdate(
        {
          status: 'pending',
          nextRunAt: { $lte: new Date() },
        },
        {
          $set: { status: 'processing' },
        },
        { new: true, sort: { nextRunAt: 1 } }
      );

      if (!job) {
        this.isProcessing = false;
        return;
      }

      const templateFn = emailTemplates[job.template];
      if (!templateFn) {
        job.status = 'failed';
        job.lastError = `Unknown template "${job.template}"`;
        await job.save();
        this.isProcessing = false;
        return;
      }

      const { subject, html, text } = templateFn(job.data);

      try {
        await this.transporter.sendMail({
          from: env.emailFrom,
          to: job.to,
          subject,
          html,
          text,
        });

        job.status = 'sent';
        job.sentAt = new Date();
        job.lastError = null;
        await job.save();

        logger.info(
          { jobId: job._id, to: job.to, template: job.template },
          'Queued email delivered successfully'
        );
      } catch (sendErr) {
        const nextAttempts = job.attempts + 1;
        const maxAttempts = job.maxAttempts || 5;

        if (nextAttempts < maxAttempts) {
          // Exponential backoff: 10s * 2^(attempts) -> 20s, 40s, 80s, 160s
          const backoffDelayMs = Math.pow(2, nextAttempts) * 10 * 1000;
          job.status = 'pending';
          job.attempts = nextAttempts;
          job.nextRunAt = new Date(Date.now() + backoffDelayMs);
          job.lastError = sendErr.message;
          await job.save();

          logger.warn(
            { jobId: job._id, to: job.to, attempts: nextAttempts, nextRunAt: job.nextRunAt },
            'Email delivery failed. Backoff scheduled.'
          );
        } else {
          job.status = 'failed';
          job.attempts = nextAttempts;
          job.lastError = sendErr.message;
          await job.save();

          logger.error(
            { jobId: job._id, to: job.to, attempts: nextAttempts, error: sendErr.message },
            'Email delivery permanently failed after maximum attempts.'
          );
        }
      }
    } catch (err) {
      logger.error({ error: err.message }, 'Unexpected error in email queue worker');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Starts periodic polling for queued email jobs.
   */
  startQueueWorker(intervalMs = 5000) {
    if (this.workerInterval) return;
    logger.info({ intervalMs }, 'Starting background email queue worker');
    this.workerInterval = setInterval(() => {
      this.processNextJob();
    }, intervalMs);
  }

  /**
   * Stops the background email queue worker.
   */
  stopQueueWorker() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
      logger.info('Stopped background email queue worker');
    }
  }

  /**
   * Returns current queue worker health status.
   */
  getHealthStatus() {
    return {
      active: Boolean(this.workerInterval),
      isProcessing: this.isProcessing,
      configuredHost: env.smtpHost || 'simulated-local',
    };
  }
}

export const emailService = new EmailService();
export default emailService;

