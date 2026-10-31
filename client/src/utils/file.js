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

/**
 * Resolves a media / attachment / avatar URL.
 * If the URL is relative (e.g. starts with '/uploads/'), prepends the server backend origin.
 * If the URL is already absolute (starts with 'http', 'https', 'data', 'blob'), returns it unchanged.
 * @param {string} url 
 * @returns {string}
 */
export const getMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  const backendBase =
    import.meta.env.VITE_SOCKET_URL ||
    (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '');

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
};
