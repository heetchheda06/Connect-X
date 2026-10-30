import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectx';

async function migrateAuth() {
  console.log('🔄 [Auth Migration] Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ [Auth Migration] Connected to database.');

  // Find users missing authProviders or tokenVersion
  const filter = {
    $or: [
      { authProviders: { $exists: false } },
      { authProviders: { $size: 0 } },
      { tokenVersion: { $exists: false } },
      { avatarSource: { $exists: false } },
    ],
  };

  const usersToMigrate = await User.find(filter);
  console.log(`🔍 [Auth Migration] Found ${usersToMigrate.length} user(s) requiring auth schema migration.`);

  const result = await User.updateMany(
    filter,
    {
      $set: {
        authProviders: [{ provider: 'local', linkedAt: new Date() }],
        tokenVersion: 0,
        emailVerified: false,
        avatarSource: 'generated',
      },
    }
  );

  console.log(`✨ [Auth Migration] Successfully updated ${result.modifiedCount} user records.`);
  await mongoose.disconnect();
  console.log('👋 [Auth Migration] Disconnected. Migration complete.');
  process.exit(0);
}

migrateAuth().catch((err) => {
  console.error('❌ [Auth Migration] Migration failed:', err);
  process.exit(1);
});
