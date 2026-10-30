import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from cwd first, then resolve from server root as fallback
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const validateEnv = () => {
  const mongo = process.env.MONGO_URI || process.env.MONGODB_URI;
  const missing = [];
  if (!mongo) missing.push('MONGO_URI or MONGODB_URI');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
};

export const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectx',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  nodeEnv: process.env.NODE_ENV || 'development',
};
