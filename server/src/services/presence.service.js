import User from '../models/user.model.js';

class PresenceService {
  constructor() {
    // Map of userId -> Set of socketIds (for multi-tab / multi-device support)
    this.userSockets = new Map();
  }

  /**
   * Register a new socket connection for a user
   * @param {string} userId 
   * @param {string} socketId 
   * @returns {Promise<{ isFirstConnection: boolean }>}
   */
  async addSocket(userId, socketId) {
    const idStr = userId.toString();
    if (!this.userSockets.has(idStr)) {
      this.userSockets.set(idStr, new Set());
    }

    const sockets = this.userSockets.get(idStr);
    const isFirstConnection = sockets.size === 0;
    sockets.add(socketId);

    if (isFirstConnection) {
      try {
        await User.findByIdAndUpdate(idStr, {
          isOnline: true,
          lastSeen: new Date(),
        });
      } catch (err) {
        console.error(`[PresenceService] Error updating online status: ${err.message}`);
      }
    }

    return { isFirstConnection };
  }

  /**
   * Remove a socket connection on disconnect
   * @param {string} userId 
   * @param {string} socketId 
   * @returns {Promise<{ isLastDisconnect: boolean, lastSeen: Date }>}
   */
  async removeSocket(userId, socketId) {
    const idStr = userId.toString();
    const lastSeen = new Date();

    if (!this.userSockets.has(idStr)) {
      return { isLastDisconnect: true, lastSeen };
    }

    const sockets = this.userSockets.get(idStr);
    sockets.delete(socketId);
    const isLastDisconnect = sockets.size === 0;

    if (isLastDisconnect) {
      this.userSockets.delete(idStr);
      try {
        await User.findByIdAndUpdate(idStr, {
          isOnline: false,
          lastSeen,
        });
      } catch (err) {
        console.error(`[PresenceService] Error updating offline status: ${err.message}`);
      }
    }

    return { isLastDisconnect, lastSeen };
  }

  /**
   * Check if a user currently has active socket connections
   * @param {string} userId 
   * @returns {boolean}
   */
  isUserOnline(userId) {
    const idStr = userId.toString();
    return this.userSockets.has(idStr) && this.userSockets.get(idStr).size > 0;
  }

  /**
   * Get all active socket IDs for a given user
   * @param {string} userId 
   * @returns {string[]}
   */
  getUserSockets(userId) {
    const idStr = userId.toString();
    const sockets = this.userSockets.get(idStr);
    return sockets ? Array.from(sockets) : [];
  }
}

export const presenceService = new PresenceService();
export default presenceService;

