import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDirectory = path.join(__dirname, '../../uploads');

// Ensure uploads folder exists
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

/**
 * Storage Service abstraction.
 * Currently stores files on local disk; can easily be swapped or extended
 * to support Cloudinary or Amazon S3.
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
   * Delete a file from disk
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
    } catch (error) {
      console.error(`[StorageService Error] Failed to delete file: ${error.message}`);
    }
  }
}

export const storageService = new StorageService();
export default storageService;

