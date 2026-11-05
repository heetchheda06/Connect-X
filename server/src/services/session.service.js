import crypto from 'crypto';
import Session from '../models/session.model.js';
import User from '../models/user.model.js';
import { parseDeviceLabel } from '../utils/deviceParser.js';
import { truncateIp } from '../utils/ipUtils.js';
import { emailService } from './emailService.js';
import logger from '../utils/logger.js';

class SessionService {
  constructor() {
    // In-memory cache to eliminate repetitive DB queries: sid -> { userId, revokedAt, expiresAt, lastActiveAt, cachedAt }
    this.cache = new Map();
    this.CACHE_TTL_MS = 60 * 1000; // 1 minute cache TTL
  }

  /**
   * Creates a new active session for a user on login.
   * Emits a new sign-in alert if logging in from an unrecognized device.
   *
   * @param {object} params
   * @param {object} params.user - User document or object with _id, name, email
   * @param {string} params.userAgent - Raw HTTP User-Agent header
   * @param {string} params.ip - Raw client IP address
   * @returns {Promise<{ session: object, sid: string }>}
   */
  async createSession({ user, userAgent, ip }) {
    const deviceLabel = parseDeviceLabel(userAgent);
    const ipTruncated = truncateIp(ip);
    const sid = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 1. Check if device is new to this user for security alert
    try {
      const priorSession = await Session.findOne({
        user: user._id,
        deviceLabel,
      }).lean();

      if (!priorSession && user.email) {
        logger.info({ userId: user._id, deviceLabel }, 'New sign-in detected from unfamiliar device');

        // Check if user has opted out of new sign-in alerts
        const userPrefs = user.notificationPrefs || {};
        if (userPrefs.newSignInAlert !== false) {
          await emailService.queueEmail({
            to: user.email,
            template: 'newSignIn',
            data: {
              name: user.name,
              deviceLabel,
              ipTruncated,
              timestamp: new Date().toUTCString(),
            },
          });
        }
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to process new sign-in alert check');
    }

    // 2. Persist session to MongoDB
    const session = await Session.create({
      user: user._id,
      sid,
      deviceLabel,
      ipTruncated,
      lastActiveAt: new Date(),
      expiresAt,
    });

    // 3. Cache session in memory
    this.cache.set(sid, {
      userId: user._id.toString(),
      revokedAt: null,
      expiresAt,
      lastActiveAt: new Date(),
      cachedAt: Date.now(),
    });

    logger.debug({ sid, userId: user._id, deviceLabel }, 'Session created');

    return { session, sid };
  }

  /**
   * Verifies that a session exists, is not revoked, and has not expired.
   * Uses an in-memory cache to prevent database load on frequent requests.
   *
   * @param {string} sid - Session identifier
   * @param {string} userId - User identifier
   * @returns {Promise<{ valid: boolean, reason?: string, session?: object }>}
   */
  async verifySession(sid, userId) {
    if (!sid) {
      // Allow legacy tokens without sid during transition
      return { valid: true };
    }

    const now = Date.now();
    const cached = this.cache.get(sid);

    // 1. Check in-memory cache
    if (cached && now - cached.cachedAt < this.CACHE_TTL_MS) {
      if (cached.userId !== userId.toString()) {
        return { valid: false, reason: 'user_mismatch' };
      }
      if (cached.revokedAt) {
        return { valid: false, reason: 'session_revoked' };
      }
      if (new Date() > new Date(cached.expiresAt)) {
        return { valid: false, reason: 'session_expired' };
      }

      // Throttle lastActiveAt updates to at most once every 5 minutes
      if (now - new Date(cached.lastActiveAt).getTime() > 5 * 60 * 1000) {
        cached.lastActiveAt = new Date();
        Session.updateOne({ sid }, { lastActiveAt: new Date() }).catch(() => {});
      }

      return { valid: true };
    }

    // 2. Query MongoDB
    const session = await Session.findOne({ sid, user: userId });
    if (!session) {
      this.cache.delete(sid);
      return { valid: false, reason: 'session_not_found' };
    }

    if (session.revokedAt) {
      this.cache.set(sid, {
        userId: userId.toString(),
        revokedAt: session.revokedAt,
        expiresAt: session.expiresAt,
        lastActiveAt: session.lastActiveAt,
        cachedAt: now,
      });
      return { valid: false, reason: 'session_revoked' };
    }

    if (new Date() > new Date(session.expiresAt)) {
      return { valid: false, reason: 'session_expired' };
    }

    // 3. Update cache
    this.cache.set(sid, {
      userId: userId.toString(),
      revokedAt: null,
      expiresAt: session.expiresAt,
      lastActiveAt: session.lastActiveAt,
      cachedAt: now,
    });

    // Asynchronously bump lastActiveAt if older than 5 minutes
    if (now - new Date(session.lastActiveAt).getTime() > 5 * 60 * 1000) {
      Session.updateOne({ _id: session._id }, { lastActiveAt: new Date() }).catch(() => {});
    }

    return { valid: true, session };
  }

  invalidateCache(sid) {
    this.cache.delete(sid);
  }

  /**
   * Revokes a specific session, clears cache, and immediately disconnects active sockets.
   *
   * @param {string} sid - Session ID to revoke
   * @param {string} userId - Owner user ID
   * @param {import('socket.io').Server} [io] - Socket.IO server instance
   * @returns {Promise<boolean>}
   */
  async revokeSession(sid, userId, io) {
    const session = await Session.findOneAndUpdate(
      { sid, user: userId },
      { revokedAt: new Date() },
      { new: true }
    );

    this.cache.delete(sid);

    if (session && io) {
      const room = `session_${sid}`;
      io.to(room).emit('session:revoked', {
        sid,
        message: 'This session has been logged out from another device.',
      });
      io.in(room).disconnectSockets(true);
    }

    logger.info({ sid, userId }, 'Session revoked');
    return Boolean(session);
  }

  /**
   * Revokes all active sessions for a user EXCEPT the current session.
   *
   * @param {string} currentSid - Session ID to keep active
   * @param {string} userId - User ID
   * @param {import('socket.io').Server} [io] - Socket.IO server instance
   * @returns {Promise<number>} Number of revoked sessions
   */
  async revokeAllOtherSessions(currentSid, userId, io) {
    const otherSessions = await Session.find({
      user: userId,
      sid: { $ne: currentSid },
      revokedAt: null,
    });

    const revokedAt = new Date();
    await Session.updateMany(
      { user: userId, sid: { $ne: currentSid }, revokedAt: null },
      { revokedAt }
    );

    for (const s of otherSessions) {
      this.cache.delete(s.sid);
      if (io) {
        const room = `session_${s.sid}`;
        io.to(room).emit('session:revoked', {
          sid: s.sid,
          message: 'You have been signed out from all other devices.',
        });
        io.in(room).disconnectSockets(true);
      }
    }

    logger.info({ userId, count: otherSessions.length }, 'Revoked all other sessions');
    return otherSessions.length;
  }

  /**
   * Retrieves all active sessions for a user with current device marked.
   *
   * @param {string} userId
   * @param {string} currentSid
   * @returns {Promise<Array>} List of session objects
   */
  async getUserSessions(userId, currentSid) {
    const sessions = await Session.find({
      user: userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastActiveAt: -1 })
      .lean();

    return sessions.map((s) => ({
      sid: s.sid,
      deviceLabel: s.deviceLabel,
      ipTruncated: s.ipTruncated,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      isCurrent: s.sid === currentSid,
    }));
  }
}

export const sessionService = new SessionService();
export default sessionService;

