import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.join(__dirname, '../../uploads');

// Ensure uploads folder exists
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

// Configure disk storage with randomized filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// Image filter for avatars
const imageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'];
  const isImageMime = file.mimetype && file.mimetype.startsWith('image/');

  if (isImageMime || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format. Supported formats: JPG, PNG, WEBP, GIF, AVIF.'), false);
  }
};

const maxBytes = env.maxFileSizeMb * 1024 * 1024;

export const avatarUpload = multer({
  storage,
  limits: { fileSize: maxBytes },
  fileFilter: imageFilter,
});

export const generalUpload = multer({
  storage,
  limits: { fileSize: maxBytes },
});

