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

  const hasFirebaseConfig =
    Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) ||
    Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
    Boolean(process.env.FIREBASE_PROJECT_ID);

  if (!hasFirebaseConfig) {
    missing.push('FIREBASE_PROJECT_ID (or FIREBASE_SERVICE_ACCOUNT_BASE64 / FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY)');
  }

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
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'connect-x-1af38',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || '',
  firebaseServiceAccountBase64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '',
  // AI Settings & Providers
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gemini-2.5-flash',
  aiModelFast: process.env.AI_MODEL_FAST || 'gemini-2.5-flash',
  aiModelSmart: process.env.AI_MODEL_SMART || 'gemini-2.5-pro',
  sttProvider: process.env.STT_PROVIDER || 'gemini',
  sttModel: process.env.STT_MODEL || 'gemini-2.5-flash',
  sttApiKey: process.env.STT_API_KEY || process.env.GEMINI_API_KEY || '',
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'gemini',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-004',
  embeddingApiKey: process.env.EMBEDDING_API_KEY || process.env.GEMINI_API_KEY || '',
  aiRetentionDefaultDays: parseInt(process.env.AI_RETENTION_DEFAULT_DAYS, 10) || 90,
  providerPolicyUrls: (() => {
    try {
      return process.env.PROVIDER_POLICY_URLS
        ? JSON.parse(process.env.PROVIDER_POLICY_URLS)
        : {
            gemini: 'https://ai.google.dev/terms',
            google: 'https://policies.google.com/privacy',
          };
    } catch {
      return { gemini: 'https://ai.google.dev/terms' };
    }
  })(),
};
