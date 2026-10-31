import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { generalUpload } from '../config/multer.js';
import storageService from '../services/storage.service.js';

const router = express.Router();

router.use(protect);

const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
];

router.post(
  '/',
  (req, res, next) => {
    generalUpload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Error processing uploaded file',
          data: null,
        });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided. Please select a file to upload.',
          data: null,
        });
      }

      // Check mime type whitelist
      if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
        // Delete rejected file from disk
        await storageService.deleteFile(req.file.filename);
        return res.status(400).json({
          success: false,
          message: 'Unsupported file type. Allowed: JPG, PNG, WEBP, GIF, PDF, DOCX, XLSX, PPTX, TXT, ZIP.',
          data: null,
        });
      }

      const fileUrl = storageService.getFileUrl(req.file.filename);

      // Persist to MongoDB GridFS so files survive Render restarts
      await storageService.persistToGridFS(req.file.filename, req.file.mimetype);

      return res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: fileUrl,
          name: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

