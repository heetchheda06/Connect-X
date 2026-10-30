import React, { useEffect } from 'react';
import { X, Download, ZoomIn, FileImage } from 'lucide-react';

export default function Lightbox({ image, onClose }) {
  useEffect(() => {
    if (!image) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [image, onClose]);

  if (!image) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = image.url;
    a.download = image.name || 'connectx-image';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-900/90 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Top Controls Bar */}
      <div 
        className="absolute top-4 left-4 right-4 flex items-center justify-between z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-white">
          <FileImage className="w-5 h-5 text-brand-300" />
          <span className="text-xs sm:text-sm font-semibold truncate max-w-xs sm:max-w-md">
            {image.name || 'Image Preview'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
            title="Download image"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div 
        className="relative max-w-5xl max-h-[85dvh] flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={image.url}
          alt={image.name || 'Preview'}
          className="max-w-full max-h-[85dvh] object-contain rounded-2xl shadow-2xl transition-transform"
        />
      </div>
    </div>
  );
}

