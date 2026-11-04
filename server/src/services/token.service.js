import crypto from 'crypto';
import EmailToken from '../models/emailToken.model.js';
import logger from '../utils/logger.js';

export class TokenService {
  /**
   * Hashes a raw token with SHA-256.
   * @param {string} rawToken
   * @returns {string} SHA-256 hex digest
   */
  static hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Generates a 32-byte cryptographically secure, URL-safe random token.
   * Invalidates any older tokens of the same type for this user.
   * Never stores the raw token; saves only the SHA-256 hash.
   *
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {'verify'|'reset'|'emailChange'|'deleteConfirm'} type
   * @param {object} payload - Optional data (e.g. { newEmail, deleteMessages })
   * @param {number} expiresInMinutes - Expiry window in minutes
   * @returns {Promise<{ token: string, tokenDoc: object, expiresAt: Date }>}
   */
  static async generateToken(userId, type, payload = {}, expiresInMinutes = 60) {
    if (!userId || !type) {
      throw new Error('UserId and token type are required');
    }

    // 1. Invalidate any existing unused tokens of the same user and type
    await EmailToken.deleteMany({
      user: userId,
      type,
      usedAt: null,
    });

    // 2. Generate 32-byte cryptographically secure URL-safe token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    // 3. Set expiration
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // 4. Save to database
    const tokenDoc = await EmailToken.create({
      user: userId,
      type,
      tokenHash,
      payload,
      expiresAt,
    });

    logger.debug({ userId, type, expiresAt }, 'Generated single-use email token');

    return {
      token: rawToken,
      tokenDoc,
      expiresAt,
    };
  }

  /**
   * Verifies a raw token against stored SHA-256 hashes using constant-time comparison.
   *
   * @param {string} rawToken
   * @param {'verify'|'reset'|'emailChange'|'deleteConfirm'} type
   * @returns {Promise<{ valid: boolean, tokenDoc?: object, reason?: string }>}
   */
  static async verifyToken(rawToken, type) {
    if (!rawToken || typeof rawToken !== 'string') {
      return { valid: false, reason: 'missing_or_invalid_token' };
    }

    const computedHash = this.hashToken(rawToken);

    // Find unused token matching computed hash and type
    const tokenDoc = await EmailToken.findOne({
      tokenHash: computedHash,
      type,
      usedAt: null,
    }).populate('user');

    if (!tokenDoc) {
      return { valid: false, reason: 'invalid_or_used' };
    }

    // Check expiration
    if (new Date() > new Date(tokenDoc.expiresAt)) {
      return { valid: false, reason: 'expired' };
    }

    // Constant-time comparison between stored hash and computed hash
    const storedBuf = Buffer.from(tokenDoc.tokenHash, 'hex');
    const computedBuf = Buffer.from(computedHash, 'hex');

    if (storedBuf.length !== computedBuf.length || !crypto.timingSafeEqual(storedBuf, computedBuf)) {
      return { valid: false, reason: 'hash_mismatch' };
    }

    return {
      valid: true,
      tokenDoc,
    };
  }

  /**
   * Marks a token as used, preventing any subsequent use.
   *
   * @param {string|mongoose.Types.ObjectId} tokenId
   * @returns {Promise<object|null>}
   */
  static async consumeToken(tokenId) {
    return EmailToken.findByIdAndUpdate(
      tokenId,
      { usedAt: new Date() },
      { new: true }
    );
  }
}

export default TokenService;
