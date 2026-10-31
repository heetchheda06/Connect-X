import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarUpload } from '../src/config/multer.js';

test('Multer Avatar Upload Filter - Accepts diverse image formats and extensions', (t, done) => {
  const filter = avatarUpload.fileFilter;
  const validFiles = [
    { originalname: 'avatar.jpg', mimetype: 'image/jpeg' },
    { originalname: 'avatar.jpeg', mimetype: 'image/jpeg' },
    { originalname: 'avatar.JPG', mimetype: 'image/jpg' },
    { originalname: 'profile.PNG', mimetype: 'image/png' },
    { originalname: 'photo.webp', mimetype: 'image/webp' },
    { originalname: 'picture.avif', mimetype: 'image/avif' },
    { originalname: 'vector.svg', mimetype: 'image/svg+xml' },
    { originalname: 'camera_upload.jpg', mimetype: 'application/octet-stream' },
  ];

  let completed = 0;
  for (const file of validFiles) {
    filter({}, file, (err, accepted) => {
      assert.equal(err, null, `Should not return error for ${file.originalname}`);
      assert.equal(accepted, true, `Should accept valid image file ${file.originalname}`);
      completed++;
      if (completed === validFiles.length) {
        done();
      }
    });
  }
});

test('Multer Avatar Upload Filter - Rejects non-image files', (t, done) => {
  const filter = avatarUpload.fileFilter;
  const invalidFiles = [
    { originalname: 'document.pdf', mimetype: 'application/pdf' },
    { originalname: 'script.js', mimetype: 'application/javascript' },
    { originalname: 'archive.zip', mimetype: 'application/zip' },
    { originalname: 'binary.exe', mimetype: 'application/octet-stream' },
  ];

  let completed = 0;
  for (const file of invalidFiles) {
    filter({}, file, (err, accepted) => {
      assert.ok(err instanceof Error || !accepted, `Should reject ${file.originalname}`);
      completed++;
      if (completed === invalidFiles.length) {
        done();
      }
    });
  }
});
