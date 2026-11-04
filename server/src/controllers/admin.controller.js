import { resetAndSeedDatabase } from '../utils/seedCore.js';
import { env } from '../config/env.js';

export const handleResetAndSeedDatabase = async (req, res, next) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== env.jwtSecret) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid or missing x-admin-key header',
        data: null,
      });
    }

    const result = await resetAndSeedDatabase();

    return res.status(200).json({
      success: true,
      message: 'Database cleared and seeded successfully with demo data',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
