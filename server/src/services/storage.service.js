import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDirectory = path.join(__dirname, '../../uploads');

// Ensure uploads folder exists
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

let gridFSBucket = null;

export const getGridFSBucket = () => {
  if (!gridFSBucket && mongoose.connection.db) {
    gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
    });
  }
  return gridFSBucket;
};

/**
 * Storage Service abstraction.
 * Saves files on disk for fast local serving, and backs up to MongoDB GridFS
 * to ensure persistent storage across ephemeral cloud host reboots (e.g., Render free tier).
 */
class StorageService {
  /**
   * Get the relative public URL for an uploaded file
   * @param {string} filename 
   * @returns {string} Public URL path
   */
  getFileUrl(filename) {
    return `/uploads/${filename}`;
  }

  /**
   * Persists a file from local disk to MongoDB GridFS
   * @param {string} filename 
   * @param {string} mimetype 
   */
  async persistToGridFS(filename, mimetype = 'application/octet-stream') {
    try {
      const bucket = getGridFSBucket();
      if (!bucket) return;

      const filePath = path.join(uploadsDirectory, filename);
      if (!fs.existsSync(filePath)) return;

      // Check if already in bucket
      const existing = await bucket.find({ filename }).toArray();
      if (existing.length > 0) return;

      const readStream = fs.createReadStream(filePath);
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: mimetype,
      });

      await new Promise((resolve, reject) => {
        readStream.pipe(uploadStream).on('finish', resolve).on('error', reject);
      });
    } catch (error) {
      console.error(`[StorageService Error] GridFS backup failed for ${filename}:`, error.message);
    }
  }

  /**
   * Delete a file from disk and GridFS
   * @param {string} filenameOrPath 
   */
  async deleteFile(filenameOrPath) {
    if (!filenameOrPath) return;
    try {
      const filename = path.basename(filenameOrPath);
      const filePath = path.join(uploadsDirectory, filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }

      // Also remove from GridFS
      const bucket = getGridFSBucket();
      if (bucket) {
        const files = await bucket.find({ filename }).toArray();
        for (const f of files) {
          await bucket.delete(f._id).catch(() => {});
        }
      }
    } catch (error) {
      console.error(`[StorageService Error] Failed to delete file: ${error.message}`);
    }
  }
}

export const storageService = new StorageService();
export default storageService;
