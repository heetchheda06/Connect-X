import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, `../../backups/backup-${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`[Backup] Connecting to MongoDB: ${env.mongoUri}...`);
  await mongoose.connect(env.mongoUri);

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(`[Backup] Found ${collections.length} collections to back up.`);

  for (const collInfo of collections) {
    const collName = collInfo.name;
    const coll = mongoose.connection.db.collection(collName);
    const data = await coll.find({}).toArray();

    const filePath = path.join(backupDir, `${collName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[Backup] Wrote ${data.length} documents to ${collName}.json`);
  }

  console.log(`[Backup] Backup completed successfully at ${backupDir}`);
  await mongoose.disconnect();
}

// Auto-run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  backupDatabase().catch((err) => {
    console.error('[Backup Failed]:', err);
    process.exit(1);
  });
}
