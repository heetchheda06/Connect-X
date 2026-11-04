import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { resetAndSeedDatabase } from './seedCore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/connectx';

async function seed() {
  console.log('🌱 [Seed] Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ [Seed] Connected to database.');

  const result = await resetAndSeedDatabase();

  console.log('\n======================================================');
  console.log('🎉 [ConnectX] Database Seeding Complete!');
  console.log('======================================================');
  console.log('Default Password for all users: Password123!\n');
  console.log('Demo Accounts:');
  result.users.forEach((u) => {
    console.log(`  • ${u.name.padEnd(16)} | Email: ${u.email.padEnd(20)} | Username: @${u.username}`);
  });
  console.log('\nSample Channels:');
  result.rooms.forEach((r) => {
    console.log(`  • [${r.type}] ${r.name}`);
  });
  console.log('======================================================\n');

  await mongoose.disconnect();
  console.log('👋 [Seed] Disconnected from MongoDB. Exiting cleanly.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ [Seed] Error during seeding:', err);
  process.exit(1);
});
