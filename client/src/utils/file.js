/**
 * Format bytes to readable size (e.g., "450 KB", "2.4 MB")
 * @param {number} bytes 
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Determine if a mimeType or filename represents an image
 * @param {string} mimeType 
 * @param {string} filename 
 * @returns {boolean}
 */
export const isImageFile = (mimeType = '', filename = '') => {
  if (mimeType && mimeType.startsWith('image/')) return true;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

